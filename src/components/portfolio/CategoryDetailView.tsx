import { ArrowLeft, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Holding, PortfolioSummary, PortfolioCategory } from "@/types/portfolio";
import { useBackButton } from "@/hooks/useBackButton";

interface CategoryDetailViewProps {
    category: string;
    categoryLabel: string;
    holdings: Holding[];
    summary: PortfolioSummary;
    showValue: boolean;
    formatCurrency: (value: number) => string;
    formatPercent: (value: number) => string;
    onBack: () => void;
    onHoldingClick: (holding: Holding) => void;
    onDeleteCategory?: (name: string) => void;
    CategoryIcon: React.ComponentType<{ className?: string }>;
    exchangeRate: number;
    currency: 'THB' | 'USD';
}

export function CategoryDetailView({
    category,
    categoryLabel,
    holdings,
    summary,
    showValue,
    formatCurrency,
    formatPercent,
    onBack,
    onHoldingClick,
    onDeleteCategory,
    CategoryIcon,
    exchangeRate,
    currency,
}: CategoryDetailViewProps) {
    // Enable mobile back button
    useBackButton(true, (open) => {
        if (!open) onBack();
    });

    const convertValue = (value: number) => {
        return currency === 'THB' ? value : value / exchangeRate;
    };

    // Calculate category totals (including both unrealized and realized P/L)
    const totalValue = holdings.reduce((sum, h) => sum + convertValue(h.marketValue), 0);
    // Note: unrealizedPL might need check if it matches target currency, assuming holdings are consistent or normalized
    // If holdings data implies THB base:
    const totalUnrealizedPL = holdings.reduce((sum, h) => sum + convertValue(h.unrealizedPL), 0);
    const totalRealizedPL = holdings.reduce((sum, h) => sum + convertValue(h.realizedPL), 0);
    const totalNetPL = totalUnrealizedPL + totalRealizedPL; // Net P/L = Unrealized + Realized
    const totalInvested = holdings.reduce((sum, h) => sum + convertValue(h.totalInvested), 0);
    const totalPLPercent = totalInvested > 0 ? (totalNetPL / totalInvested) * 100 : 0;

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
                <div className="flex items-center gap-3 px-4 py-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={onBack}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <CategoryIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-foreground">{categoryLabel}</h1>
                                {onDeleteCategory && !['securities', 'long-term', 'speculation'].includes(category) && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                            if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "${category}"?`)) {
                                                onDeleteCategory(category);
                                                onBack();
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">{holdings.length} สินทรัพย์</p>
                        </div>
                    </div>
                </div>

                {/* Category Summary */}
                <div className="px-4 pb-4">
                    <Card className="p-4 bg-primary/5 border-primary/20">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-muted-foreground">หุ้นถืออยู่</p>
                                <p className="text-2xl font-bold font-mono">
                                    {holdings.filter(h => !h.isClosed).length} ตัว
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground">กำไรขายแล้วรวม</p>
                                <p className={`text-lg font-bold font-mono ${totalRealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {showValue ? formatCurrency(totalRealizedPL) : "••••••"}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </header>

            {/* Holdings List */}
            <div className="px-4 pt-4">
                <div className="space-y-2">
                    {holdings.length === 0 ? (
                        <Card className="p-8 text-center text-muted-foreground">
                            <p>ยังไม่มีสินทรัพย์ในหมวดหมู่นี้</p>
                        </Card>
                    ) : (
                        holdings.map((holding) => (
                            <Card
                                key={holding.ticker}
                                onClick={() => onHoldingClick(holding)}
                                className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors border-l-4 border-l-primary/30"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${holding.isClosed ? 'bg-amber-500' : 'bg-primary'}`} />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-foreground uppercase">{holding.ticker}</p>
                                                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${holding.isClosed
                                                    ? 'border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-950/30'
                                                    : 'border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/30'
                                                    }`}>
                                                    {holding.isClosed ? 'ขายแล้ว' : 'ถืออยู่'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{holding.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} หุ้น</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold font-mono text-foreground">
                                            {holding.isClosed ? (
                                                showValue ? formatCurrency(convertValue(holding.realizedPL)) : "••••••"
                                            ) : (
                                                <span className="text-muted-foreground text-sm">ถืออยู่</span>
                                            )}
                                        </p>
                                        {holding.isClosed ? (
                                            <div className={`flex items-center justify-end gap-1 text-xs ${holding.realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {holding.realizedPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                <span>กำไรขาย</span>
                                            </div>
                                        ) : holding.realizedPL !== 0 ? (
                                            <div className={`flex items-center justify-end gap-1 text-xs ${holding.realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {holding.realizedPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                <span className="font-mono">
                                                    {showValue ? formatCurrency(convertValue(holding.realizedPL)) : "••••••"}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
