import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Wallet,
  PiggyBank,
  BarChart3,
  Banknote
} from "lucide-react";
import { Holding, PortfolioSummary, Transaction } from "@/types/portfolio";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AllocationChart } from "./AllocationChart";
import { AssetDetail } from "./AssetDetail";

interface DimeLayoutProps {
  holdings: Holding[];
  summary: PortfolioSummary;
  exchangeRate: number;
  transactions?: Transaction[];
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  currency: 'THB' | 'USD';
}

export function DimeLayout({
  holdings,
  summary,
  exchangeRate = 34.5,
  transactions = [],
  onUpdateTransaction,
  currency
}: DimeLayoutProps) {
  const [showValue, setShowValue] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['long-term', 'securities', 'speculation']);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const convertConfirm = (value: number) => {
    if (currency === 'THB') return value;
    return value / exchangeRate;
  };

  const formatCurrency = (value: number, hideValue = false) => {
    if (hideValue) return "••••••";
    const converted = convertConfirm(value);
    return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'securities': 'หลักทรัพย์',
      'long-term': 'ระยะยาว',
      'speculation': 'เก็งกำไร',
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, typeof Wallet> = {
      'securities': PiggyBank,
      'long-term': BarChart3,
      'speculation': Banknote,
    };
    return icons[category] || Wallet;
  };

  // Group holdings by category
  const holdingsByCategory = holdings.reduce((acc, holding) => {
    if (!acc[holding.category]) {
      acc[holding.category] = [];
    }
    acc[holding.category].push(holding);
    return acc;
  }, {} as Record<string, Holding[]>);

  // Calculate category totals
  const getCategoryTotal = (category: string) => {
    const categoryHoldings = holdingsByCategory[category] || [];
    return {
      totalValue: categoryHoldings.reduce((sum, h) => sum + h.marketValue, 0),
      totalPL: categoryHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0),
      totalPLPercent: categoryHoldings.length > 0
        ? (categoryHoldings.reduce((sum, h) => sum + h.unrealizedPL, 0) /
          categoryHoldings.reduce((sum, h) => sum + h.totalInvested, 0)) * 100
        : 0,
      count: categoryHoldings.length,
    };
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">สินทรัพย์ของฉัน</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-1 rounded-md bg-secondary text-muted-foreground border border-border">
              {currency} ({exchangeRate.toFixed(2)})
            </span>
          </div>
        </div>

        {/* Total Value Banner */}
        <div className="flex items-center justify-between mt-2 py-2 px-3 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">มูลค่าสินทรัพย์ทั้งหมด</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          <span className="font-bold text-lg font-mono">
            {showValue ? formatCurrency(summary.totalValue) : "••••••"}
          </span>
        </div>
      </header>

      <div className="px-4 mb-4 pt-4">
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-400 text-white p-6 relative overflow-hidden border-0 shadow-lg">
            {/* Decorative elements */}
            <div className="absolute top-2 right-2 opacity-20">
              <div className="w-16 h-16 bg-white/20 rounded-lg transform rotate-12" />
              <div className="w-8 h-8 bg-white/30 rounded-full absolute -top-2 -right-4" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80">สินทรัพย์ในพอร์ต</span>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span>{new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold font-mono">
                  {showValue ? formatCurrency(summary.totalValue) : "••••••"}
                </span>
              </div>

              {summary.totalPLPercent !== 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatPercent(summary.totalPLPercent)} ({showValue ? formatCurrency(summary.totalPL) : "••••••"})
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Dividend Summary Card */}
          {summary.totalDividends > 0 && (
            <Card className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 text-white p-4 relative overflow-hidden border-0 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5" />
                  <span className="text-sm font-medium">เงินปันผลสะสม</span>
                </div>
                <span className="text-xl font-bold font-mono">
                  {showValue ? formatCurrency(summary.totalDividends) : "••••••"}
                </span>
              </div>
            </Card>
          )}

          {/* Detailed Performance Breakdown */}
          <Card className="p-4 border-2 border-primary/20 bg-card shadow-md">
            <h3 className="font-bold text-sm text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> ภาพรวมผลตอบแทน (Performance)
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">ต้นทุนรวม (Invested)</p>
                <p className="font-mono font-bold text-lg">{showValue ? formatCurrency(summary.totalInvested) : "••••••"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">มูลค่าปัจจุบัน (Market Value)</p>
                <p className="font-mono font-bold text-lg">{showValue ? formatCurrency(summary.totalValue) : "••••••"}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">กำไร/ขาดทุน (Unrealized)</span>
                <span className={`font-mono font-bold ${summary.totalUnrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {summary.totalUnrealizedPL >= 0 ? '+' : ''}{showValue ? formatCurrency(summary.totalUnrealizedPL) : "••••••"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">กำไรขายแล้ว (Realized)</span>
                <span className={`font-mono font-bold ${summary.totalRealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {summary.totalRealizedPL >= 0 ? '+' : ''}{showValue ? formatCurrency(summary.totalRealizedPL) : "••••••"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">เงินปันผล (Dividends)</span>
                <span className="font-mono font-bold text-green-500">
                  +{showValue ? formatCurrency(summary.totalDividends) : "••••••"}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-border mt-2">
                <span className="font-bold">กำไรสุทธิ (Net Profit)</span>
                <div className="text-right">
                  <span className={`block font-mono font-black text-xl ${summary.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {summary.totalPL >= 0 ? '+' : ''}{showValue ? formatCurrency(summary.totalPL) : "••••••"}
                  </span>
                  <span className={`text-xs font-bold ${summary.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercent(summary.totalPLPercent)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Allocation Chart */}
        <AllocationChart holdings={holdings} currency={currency} exchangeRate={exchangeRate} />

        {/* Asset List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">สินทรัพย์ในพอร์ต</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
                <Plus className="h-3 w-3" />
                เพิ่มสินทรัพย์
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(holdingsByCategory).map(([category, categoryHoldings]) => {
              const totals = getCategoryTotal(category);
              const CategoryIcon = getCategoryIcon(category);
              const isExpanded = expandedCategories.includes(category);

              return (
                <Collapsible
                  key={category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <Card className="overflow-hidden border-l-4 border-l-primary/50">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <CategoryIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{getCategoryLabel(category)}</p>
                            <p className="text-xs text-muted-foreground">{totals.count} หุ้น</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold font-mono text-foreground">
                              {showValue ? formatCurrency(totals.totalValue) : "••••••"}
                            </p>
                            {totals.totalPL !== 0 && (
                              <div className={`flex items-center justify-end gap-1 text-sm ${totals.totalPL >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                <TrendingUp className="h-3 w-3" />
                                <span className="font-mono">
                                  {formatPercent(totals.totalPLPercent)} ({showValue ? formatCurrency(totals.totalPL) : "••••••"})
                                </span>
                              </div>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-border bg-secondary/20">
                        {categoryHoldings.map((holding, idx) => (
                          <div
                            key={holding.ticker}
                            onClick={() => setSelectedHolding(holding)}
                            className={`flex items-center justify-between px-4 py-3 cursor-pointer ${idx !== categoryHoldings.length - 1 ? 'border-b border-border/50' : ''
                              } hover:bg-secondary/40 transition-colors group`}
                          >
                            <div className="flex items-center gap-3 pl-4">
                              <div className="w-2 h-2 rounded-full bg-primary/60 group-hover:scale-125 transition-transform" />
                              <div>
                                <p className="font-semibold text-foreground uppercase">{holding.ticker}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-muted-foreground">
                                    {holding.totalShares.toLocaleString(undefined, { maximumFractionDigits: 6 })} {holding.ticker.includes('GOLD') ? 'ออนซ์' : 'หุ้น'}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground/50">•</span>
                                  <p className="text-xs text-muted-foreground">
                                    พอร์ต {((holding.marketValue / summary.totalValue) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[10px] text-muted-foreground">มูลค่า:</span>
                                <p className="font-bold font-mono text-foreground">
                                  {showValue ? formatCurrency(holding.marketValue) : "••••••"}
                                </p>
                              </div>
                              <div className={`flex items-center justify-end gap-1 text-sm ${holding.unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}>
                                <span className="text-[9px] opacity-70">{holding.unrealizedPL >= 0 ? 'กำไร' : 'ขาดทุน'}:</span>
                                {holding.unrealizedPL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                <span className="font-mono">
                                  {formatPercent(holding.unrealizedPLPercent)}
                                </span>
                                <span className="font-mono text-xs">
                                  ({showValue ? formatCurrency(holding.unrealizedPL) : "••••••"})
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>

      {/* Asset Detail Dialog */}
      {selectedHolding && (
        <AssetDetail
          holding={selectedHolding}
          transactions={transactions}
          exchangeRate={exchangeRate}
          currency={currency}
          isOpen={!!selectedHolding}
          onClose={() => setSelectedHolding(null)}
        />
      )}
    </div>
  );
}
