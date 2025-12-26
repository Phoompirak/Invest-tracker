import { Card, CardContent } from "@/components/ui/card";
import { PortfolioSummary } from "@/types/portfolio";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";

interface PortfolioStatsProps {
  summary: PortfolioSummary;
}

export function PortfolioStats({ summary }: PortfolioStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const stats = [
    {
      title: "มูลค่าพอร์ตรวม",
      value: formatCurrency(summary.totalValue),
      icon: Wallet,
      description: "Market Value",
    },
    {
      title: "เงินลงทุนทั้งหมด",
      value: formatCurrency(summary.totalInvested),
      icon: PiggyBank,
      description: "Total Invested",
    },
    {
      title: "กำไร/ขาดทุนรวม",
      value: formatCurrency(summary.totalPL),
      subValue: formatPercent(summary.totalPLPercent),
      icon: summary.totalPL >= 0 ? TrendingUp : TrendingDown,
      isProfit: summary.totalPL >= 0,
      description: "Total P/L",
    },
    {
      title: "กำไรที่รับรู้แล้ว",
      value: formatCurrency(summary.totalRealizedPL),
      icon: summary.totalRealizedPL >= 0 ? TrendingUp : TrendingDown,
      isProfit: summary.totalRealizedPL >= 0,
      description: "Realized P/L",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border-2 border-foreground shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </p>
                <p className={`text-2xl font-bold font-mono ${
                  stat.isProfit !== undefined 
                    ? stat.isProfit 
                      ? 'text-chart-2' 
                      : 'text-destructive'
                    : 'text-foreground'
                }`}>
                  {stat.value}
                </p>
                {stat.subValue && (
                  <p className={`text-sm font-mono ${
                    stat.isProfit ? 'text-chart-2' : 'text-destructive'
                  }`}>
                    {stat.subValue}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
              <div className={`p-3 border-2 border-foreground ${
                stat.isProfit !== undefined
                  ? stat.isProfit
                    ? 'bg-chart-2/10'
                    : 'bg-destructive/10'
                  : 'bg-secondary'
              }`}>
                <stat.icon className={`h-5 w-5 ${
                  stat.isProfit !== undefined
                    ? stat.isProfit
                      ? 'text-chart-2'
                      : 'text-destructive'
                    : 'text-foreground'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
