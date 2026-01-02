import { ArrowLeft, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Holding, PortfolioSummary, PortfolioCategory, StockSplit } from "@/types/portfolio";
import { useBackButton } from "@/hooks/useBackButton";
import { HoldingCard } from "./HoldingCard";

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
    stockSplits?: StockSplit[];
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
    stockSplits = [],
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
                        holdings.map((holding) => {
                            // Find any stock splits for this holding
                            const holdingSplits = stockSplits.filter(s => s.ticker === holding.ticker);
                            const latestSplit = holdingSplits.length > 0
                                ? holdingSplits.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0]
                                : undefined;

                            return (
                                <HoldingCard
                                    key={holding.ticker}
                                    holding={holding}
                                    showValue={showValue}
                                    formatCurrency={formatCurrency}
                                    convertValue={convertValue}
                                    onClick={() => onHoldingClick(holding)}
                                    latestSplit={latestSplit}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
