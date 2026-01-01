import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '@/config/authConfig';
import { GoogleUser, TokenClient, TokenResponse } from '@/types/google';

interface AuthContextType {
    user: GoogleUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isGapiReady: boolean;
    signIn: () => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [tokenClient, setTokenClient] = useState<TokenClient | null>(null);

    // Load user from localStorage on mount and validate token
    useEffect(() => {
        const checkSession = async () => {
            const savedUser = localStorage.getItem('invest_tracker_user');
            const savedToken = localStorage.getItem('invest_tracker_token');
            const loginTime = localStorage.getItem('invest_tracker_login_time');

            // Check if 30 days have passed since login
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            if (loginTime) {
                const elapsed = Date.now() - parseInt(loginTime, 10);
                if (elapsed > THIRTY_DAYS_MS) {
                    console.log('Session expired (30 days). Please log in again.');
                    localStorage.removeItem('invest_tracker_user');
                    localStorage.removeItem('invest_tracker_token');
                    localStorage.removeItem('invest_tracker_login_time');
                    setIsLoading(false);
                    return;
                }
            }

            if (savedUser && savedToken) {
                try {
                    // Quick check if token is still valid by fetching user info
                    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: { Authorization: `Bearer ${savedToken}` },
                    });

                    if (response.ok) {
                        setUser(JSON.parse(savedUser));
                    } else {
                        // Token expired or invalid
                        console.warn('Session expired, clearing local storage');
                        localStorage.removeItem('invest_tracker_user');
                        localStorage.removeItem('invest_tracker_token');
                        localStorage.removeItem('invest_tracker_login_time');
                        localStorage.removeItem('invest_tracker_spreadsheet_id');
                    }
                } catch (e) {
                    console.error('Failed to validate session', e);
                    // On network error, keep user logged in (offline mode)
                    setUser(JSON.parse(savedUser));
                }
            }
            setIsLoading(false);
        };

        checkSession();
    }, []);

    // Initialize GAPI and GIS
    useEffect(() => {
        const initializeGoogleAPIs = async () => {
            // Wait for scripts to load
            const waitForGapi = () => new Promise<void>((resolve) => {
                if (window.gapi) {
                    resolve();
                } else {
                    const checkInterval = setInterval(() => {
                        if (window.gapi) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    // Timeout after 10 seconds
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 10000);
                }
            });

            const waitForGis = () => new Promise<void>((resolve) => {
                if (window.google?.accounts?.oauth2) {
                    resolve();
                } else {
                    const checkInterval = setInterval(() => {
                        if (window.google?.accounts?.oauth2) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        resolve();
                    }, 10000);
                }
            });

            try {
                await Promise.all([waitForGapi(), waitForGis()]);

                // Initialize GAPI client
                if (window.gapi) {
                    await new Promise<void>((resolve) => {
                        window.gapi!.load('client', async () => {
                            await window.gapi!.client.init({
                                discoveryDocs: [
                                    'https://sheets.googleapis.com/$discovery/rest?version=v4',
                                    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
                                ],
                            });
                            resolve();
                        });
                    });

                    // Restore token if available
                    const savedToken = localStorage.getItem('invest_tracker_token');
                    if (savedToken) {
                        window.gapi.client.setToken({ access_token: savedToken });
                    }

                    setIsGapiReady(true);
                }

                // Initialize Token Client
                if (window.google?.accounts?.oauth2) {
                    const client = window.google.accounts.oauth2.initTokenClient({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: GOOGLE_SCOPES,
                        callback: () => { }, // Will be set during signIn
                    });
                    setTokenClient(client);
                }

                setIsLoading(false);
            } catch (error) {
                console.error('Failed to initialize Google APIs', error);
                setIsLoading(false);
            }
        };

        initializeGoogleAPIs();
    }, []);

    const fetchUserInfo = useCallback(async (accessToken: string) => {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (response.ok) {
                const userInfo = await response.json();
                const googleUser: GoogleUser = {
                    id: userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture,
                };

                setUser(googleUser);
                localStorage.setItem('invest_tracker_user', JSON.stringify(googleUser));
                localStorage.setItem('invest_tracker_token', accessToken);
                localStorage.setItem('invest_tracker_login_time', Date.now().toString()); // Store login timestamp for 30-day expiry

                // Set token in GAPI client
                if (window.gapi?.client) {
                    window.gapi.client.setToken({ access_token: accessToken });
                }
            }
        } catch (error) {
            console.error('Failed to fetch user info', error);
        }
    }, []);

    const signIn = useCallback(() => {
        if (!tokenClient) {
            console.error('Token client not initialized');
            return;
        }

        // Re-create token client with the callback
        if (window.google?.accounts?.oauth2) {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: GOOGLE_SCOPES,
                callback: async (response: TokenResponse) => {
                    if (response.error) {
                        console.error('Sign in error:', response.error);
                        return;
                    }
                    await fetchUserInfo(response.access_token);
                },
                error_callback: (error) => {
                    console.error('Sign in error:', error);
                },
            });

            client.requestAccessToken({ prompt: 'consent' });
        }
    }, [tokenClient, fetchUserInfo]);

    const signOut = useCallback(() => {
        const token = localStorage.getItem('invest_tracker_token');

        if (token && window.google?.accounts?.oauth2) {
            window.google.accounts.oauth2.revoke(token, () => {
                console.log('Token revoked');
            });
        }

        // Clear GAPI token
        if (window.gapi?.client) {
            window.gapi.client.setToken(null);
        }

        // Clear local storage
        localStorage.removeItem('invest_tracker_user');
        localStorage.removeItem('invest_tracker_token');
        localStorage.removeItem('invest_tracker_login_time');
        localStorage.removeItem('invest_tracker_spreadsheet_id');
        localStorage.removeItem('invest_tracker_transactions');
        localStorage.removeItem('invest_tracker_pending_changes');

        setUser(null);
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        isGapiReady,
        signIn,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
