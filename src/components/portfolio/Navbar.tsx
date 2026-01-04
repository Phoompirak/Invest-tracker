import { Cloud, CloudOff, RefreshCw, LogOut, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyToggle } from "@/components/ui/currency-toggle";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useMemo } from "react";

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
        resetPortfolio,
        summary,
        exchangeRate,
    } = usePortfolio();

    const [isResetting, setIsResetting] = useState(false);

    const handleManualSync = async () => {
        await manualSync();
    };

    // Calculate P/L percentage
    const plData = useMemo(() => {
        const totalPL = summary.totalPL || 0;
        const totalInvested = summary.totalInvested || 0;
        const pct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

        // Format value based on currency
        const value = currency === 'USD' ? totalPL / exchangeRate : totalPL;
        const symbol = currency === 'USD' ? '$' : '฿';

        let formatted = '';
        if (Math.abs(value) >= 1000000) {
            formatted = `${symbol}${(value / 1000000).toFixed(1)}M`;
        } else if (Math.abs(value) >= 1000) {
            formatted = `${symbol}${(value / 1000).toFixed(0)}K`;
        } else {
            formatted = `${symbol}${value.toFixed(0)}`;
        }

        return { value, pct, formatted, isPositive: totalPL >= 0 };
    }, [summary, currency, exchangeRate]);

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-3">
                    {isOnline ? (
                        <Cloud className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <CloudOff className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                        {isSyncing ? (
                            "กำลังซิงค์..."
                        ) : pendingCount > 0 ? (
                            `${pendingCount} รายการรอซิงค์`
                        ) : lastSynced ? (
                            `ซิงค์: ${lastSynced.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
                        ) : (
                            "พร้อมใช้งาน"
                        )}
                    </span>

                    {/* P/L Display */}
                    {summary.totalInvested > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
                            {plData.isPositive ? (
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                            ) : (
                                <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className={`text-xs font-bold ${plData.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                {plData.isPositive ? '+' : ''}{plData.formatted}
                            </span>
                            <span className={`text-[10px] font-medium ${plData.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                ({plData.isPositive ? '+' : ''}{plData.pct.toFixed(1)}%)
                            </span>
                        </div>
                    )}
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
