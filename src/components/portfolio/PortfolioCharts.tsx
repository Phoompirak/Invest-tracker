import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import { Holding, Transaction } from "@/types/portfolio";

interface PortfolioChartsProps {
  holdings: Holding[];
  transactions: Transaction[];
}

export function PortfolioCharts({ holdings, transactions }: PortfolioChartsProps) {
  // Memoized allocation data for pie chart
  const allocationData = useMemo(() =>
    holdings.map((h, index) => ({
      name: h.ticker,
      value: h.marketValue,
      color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
    })),
    [holdings]
  );

  // Memoized P/L data for bar chart
  const plData = useMemo(() =>
    holdings.map(h => ({
      ticker: h.ticker,
      unrealizedPL: h.unrealizedPL,
      unrealizedPLPercent: h.unrealizedPLPercent,
    })),
    [holdings]
  );

  // Memoized portfolio value over time
  const portfolioHistory = useMemo(() =>
    generatePortfolioHistory(transactions, holdings),
    [transactions, holdings]
  );

  const formatCurrency = (value: number) => {
    return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 0 })}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border-2 border-foreground p-3 shadow-sm">
          <p className="font-bold font-mono">{payload[0].name || payload[0].payload.ticker}</p>
          <p className="font-mono text-sm">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Portfolio Allocation */}
      <Card className="border-2 border-foreground shadow-sm">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-lg font-bold uppercase tracking-wide">
            สัดส่วนพอร์ต
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {holdings.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={2} stroke="hsl(var(--foreground))" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              ไม่มีข้อมูล
            </div>
          )}
        </CardContent>
      </Card>

      {/* P/L by Stock */}
      <Card className="border-2 border-foreground shadow-sm">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-lg font-bold uppercase tracking-wide">
            กำไร/ขาดทุนรายหุ้น
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {plData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={plData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis type="category" dataKey="ticker" width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="unrealizedPL"
                  fill="hsl(var(--chart-2))"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                >
                  {plData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.unrealizedPL >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              ไม่มีข้อมูล
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Value Over Time */}
      <Card className="border-2 border-foreground shadow-sm lg:col-span-2">
        <CardHeader className="border-b-2 border-foreground">
          <CardTitle className="text-lg font-bold uppercase tracking-wide">
            มูลค่าพอร์ตตามเวลา
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {portfolioHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={portfolioHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              ไม่มีข้อมูล
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function generatePortfolioHistory(transactions: Transaction[], holdings: Holding[]) {
  // Generate sample portfolio history data
  const today = new Date();
  const history = [];
  let baseValue = holdings.reduce((sum, h) => sum + h.totalInvested, 0);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    const variation = 1 + (Math.random() - 0.5) * 0.1;
    const value = i === 0
      ? holdings.reduce((sum, h) => sum + h.marketValue, 0)
      : baseValue * variation * (1 + (6 - i) * 0.02);

    history.push({
      date: date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
      value: Math.round(value),
    });
  }

  return history;
}
