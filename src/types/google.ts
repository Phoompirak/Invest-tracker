// Type definitions for Google Identity Services and GAPI

declare global {
    interface Window {
        google?: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: TokenClientConfig) => TokenClient;
                    hasGrantedAllScopes: (tokenResponse: TokenResponse, ...scopes: string[]) => boolean;
                    revoke: (accessToken: string, callback?: () => void) => void;
                };
            };
        };
        gapi?: {
            load: (api: string, callback: () => void) => void;
            client: {
                init: (config: { discoveryDocs?: string[] }) => Promise<void>;
                getToken: () => { access_token: string } | null;
                setToken: (token: { access_token: string } | null) => void;
                sheets: {
                    spreadsheets: {
                        get: (params: { spreadsheetId: string }) => Promise<GapiResponse<Spreadsheet>>;
                        create: (params: { resource: SpreadsheetCreateRequest }) => Promise<GapiResponse<Spreadsheet>>;
                        values: {
                            get: (params: ValuesGetParams) => Promise<GapiResponse<ValuesGetResponse>>;
                            append: (params: ValuesAppendParams) => Promise<GapiResponse<ValuesAppendResponse>>;
                            update: (params: ValuesUpdateParams) => Promise<GapiResponse<ValuesUpdateResponse>>;
                            batchUpdate: (params: ValuesBatchUpdateParams) => Promise<GapiResponse<ValuesBatchUpdateResponse>>;
                        };
                        batchUpdate: (params: BatchUpdateParams) => Promise<GapiResponse<BatchUpdateResponse>>;
                    };
                };
                drive: {
                    files: {
                        list: (params: DriveFilesListParams) => Promise<GapiResponse<DriveFilesListResponse>>;
                    };
                };
            };
        };
    }
}

export interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: TokenError) => void;
}

export interface TokenClient {
    requestAccessToken: (options?: { prompt?: string }) => void;
}

export interface TokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    error?: string;
}

export interface TokenError {
    type: string;
    message: string;
}

export interface GapiResponse<T> {
    result: T;
    status: number;
}

export interface Spreadsheet {
    spreadsheetId: string;
    properties: {
        title: string;
    };
    sheets?: Array<{
        properties: {
            sheetId: number;
            title: string;
        };
    }>;
}

export interface SpreadsheetCreateRequest {
    properties: {
        title: string;
    };
    sheets?: Array<{
        properties: {
            title: string;
        };
    }>;
}

export interface ValuesGetParams {
    spreadsheetId: string;
    range: string;
}

export interface ValuesGetResponse {
    range: string;
    majorDimension: string;
    values?: string[][];
}

export interface ValuesAppendParams {
    spreadsheetId: string;
    range: string;
    valueInputOption: 'RAW' | 'USER_ENTERED';
    resource: {
        values: (string | number | boolean)[][];
    };
}

export interface ValuesAppendResponse {
    spreadsheetId: string;
    tableRange: string;
    updates: {
        updatedRange: string;
        updatedRows: number;
        updatedColumns: number;
        updatedCells: number;
    };
}

export interface ValuesUpdateParams {
    spreadsheetId: string;
    range: string;
    valueInputOption: 'RAW' | 'USER_ENTERED';
    resource: {
        values: (string | number | boolean)[][];
    };
}

export interface ValuesUpdateResponse {
    spreadsheetId: string;
    updatedRange: string;
    updatedRows: number;
    updatedColumns: number;
    updatedCells: number;
}

export interface ValuesBatchUpdateParams {
    spreadsheetId: string;
    resource: {
        valueInputOption: 'RAW' | 'USER_ENTERED';
        data: Array<{
            range: string;
            values: (string | number | boolean)[][];
        }>;
    };
}

export interface ValuesBatchUpdateResponse {
    spreadsheetId: string;
    totalUpdatedRows: number;
    totalUpdatedColumns: number;
    totalUpdatedCells: number;
    totalUpdatedSheets: number;
}

export interface BatchUpdateParams {
    spreadsheetId: string;
    resource: {
        requests: Array<{
            deleteRange?: {
                range: {
                    sheetId: number;
                    startRowIndex: number;
                    endRowIndex: number;
                };
                shiftDimension: 'ROWS' | 'COLUMNS';
            };
        }>;
    };
}

export interface BatchUpdateResponse {
    spreadsheetId: string;
    replies: unknown[];
}

export interface DriveFilesListParams {
    q: string;
    fields: string;
    spaces: string;
}

export interface DriveFilesListResponse {
    files: Array<{
        id: string;
        name: string;
    }>;
}

export interface GoogleUser {
    id: string;
    email: string;
    name: string;
    picture: string;
}

export { };
