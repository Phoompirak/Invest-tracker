import { Cloud, CloudOff, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/ui/currency-toggle";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface NavbarProps {
    currency: 'THB' | 'USD';
    setCurrency: (currency: 'THB' | 'USD') => void;
}

export function Navbar({ currency, setCurrency }: NavbarProps) {
    const { isAuthenticated, signOut } = useAuth();
    const {
        isSyncing,
        lastSynced,
        pendingCount,
        manualSync,
        isOnline,
        resetPortfolio
    } = usePortfolio();

    const [isResetting, setIsResetting] = useState(false);

    const handleManualSync = async () => {
        await manualSync();
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                    {isOnline ? (
                        <Cloud className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <CloudOff className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                        {isSyncing ? (
                            "กำลังซิงค์..."
                        ) : pendingCount > 0 ? (
                            `${pendingCount} รายการรอซิงค์`
                        ) : lastSynced ? (
                            `ซิงค์ล่าสุด: ${lastSynced.toLocaleTimeString('th-TH')}`
                        ) : (
                            "พร้อมใช้งาน"
                        )}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <CurrencyToggle value={currency} onChange={setCurrency} />

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleManualSync}
                            disabled={isSyncing}
                        >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => signOut()}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
