import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
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
import { Holding, PortfolioSummary } from "@/types/portfolio";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DimeLayoutProps {
  holdings: Holding[];
  summary: PortfolioSummary;
}

export function DimeLayout({ holdings, summary }: DimeLayoutProps) {
  const [showValue, setShowValue] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['long-term', 'securities', 'speculation']);

  const formatCurrency = (value: number, hideValue = false) => {
    if (hideValue) return "••••••";
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
      <header className="sticky top-0 z-10 bg-background px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">สินทรัพย์ของฉัน</h1>
          <Button variant="ghost" size="sm" className="text-sm text-muted-foreground">
            อัตราแลกเปลี่ยน
          </Button>
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
            {showValue ? formatCurrency(summary.totalValue) : "••••••"} THB
          </span>
        </div>
      </header>

      {/* Hero Card */}
      <div className="px-4 mb-6">
        <Card className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-400 text-white p-6 relative overflow-hidden border-0">
          {/* Decorative elements */}
          <div className="absolute top-2 right-2 opacity-20">
            <div className="w-16 h-16 bg-white/20 rounded-lg transform rotate-12" />
            <div className="w-8 h-8 bg-white/30 rounded-full absolute -top-2 -right-4" />
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/80">สินทรัพย์ในพอร์ต</span>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>{new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/20"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold font-mono">
                {showValue ? formatCurrency(summary.totalValue) : "••••••"}
              </span>
              <span className="text-lg font-medium">.00 THB</span>
            </div>
            
            {summary.totalPLPercent !== 0 && (
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {formatPercent(summary.totalPLPercent)} ({showValue ? `+${formatCurrency(summary.totalPL)}` : "••••••"})
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Asset List */}
      <div className="px-4">
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
                <Card className="overflow-hidden">
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
                            {showValue ? formatCurrency(totals.totalValue) : "••••••"} THB
                          </p>
                          {totals.totalPL !== 0 && (
                            <div className={`flex items-center justify-end gap-1 text-sm ${
                              totals.totalPL >= 0 ? 'text-emerald-600' : 'text-destructive'
                            }`}>
                              <TrendingUp className="h-3 w-3" />
                              <span className="font-mono">
                                {formatPercent(totals.totalPLPercent)} ({showValue ? `+${formatCurrency(totals.totalPL)}` : "••••••"} THB)
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
                    <div className="border-t border-border">
                      {categoryHoldings.map((holding, idx) => (
                        <div 
                          key={holding.ticker}
                          className={`flex items-center justify-between px-4 py-3 ${
                            idx !== categoryHoldings.length - 1 ? 'border-b border-border/50' : ''
                          } hover:bg-secondary/30 transition-colors`}
                        >
                          <div className="flex items-center gap-3 pl-4">
                            <div className="w-2 h-2 rounded-full bg-primary/60" />
                            <div>
                              <p className="font-semibold text-foreground">{holding.ticker}</p>
                              <p className="text-xs text-muted-foreground">
                                {((holding.marketValue / summary.totalValue) * 100).toFixed(2)}%
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold font-mono text-foreground">
                              {showValue ? formatCurrency(holding.marketValue) : "••••••"} THB
                            </p>
                            <div className={`flex items-center justify-end gap-1 text-sm ${
                              holding.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-destructive'
                            }`}>
                              <TrendingUp className="h-3 w-3" />
                              <span className="font-mono">
                                {formatPercent(holding.unrealizedPLPercent)} ({showValue ? `+${formatCurrency(holding.unrealizedPL)}` : "••••••"})
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
  );
}
