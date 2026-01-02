import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Split } from "lucide-react";
import { Holding, StockSplit } from "@/types/portfolio";

interface HoldingCardProps {
    holding: Holding;
    showValue: boolean;
    formatCurrency: (value: number) => string;
    convertValue: (value: number) => number;
    onClick: () => void;
    latestSplit?: StockSplit;
}

export const HoldingCard = memo(function HoldingCard({
    holding,
    showValue,
    formatCurrency,
    convertValue,
    onClick,
    latestSplit,
}: HoldingCardProps) {
    return (
        <Card
            onClick={onClick}
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
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{holding.totalShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} หุ้น</span>
                            </div>
                            {latestSplit && (
                                <div className="flex items-center gap-1 text-[10px] text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded w-fit mt-0.5">
                                    <Split className="h-3 w-3" />
                                    <span>แตกหุ้น {new Date(latestSplit.effectiveDate).toLocaleDateString('th-TH')}</span>
                                </div>
                            )}
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
    );
});
