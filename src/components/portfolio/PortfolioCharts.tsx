import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Holding, Transaction } from "@/types/portfolio";
import { TrendingUp, Wallet, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioChartsProps {
  holdings: Holding[];
  transactions: Transaction[];
  currency?: 'THB' | 'USD';
  exchangeRate?: number;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';
const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y', 'YTD'];

// Professional color palette
const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4',
  muted: '#94a3b8',
};

const ASSET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

export function PortfolioCharts({
  holdings,
  transactions,
  currency = 'THB',
  exchangeRate = 34.5
}: PortfolioChartsProps) {
  const [growthRange, setGrowthRange] = useState<TimeRange>('1Y');
  const [dividendRange, setDividendRange] = useState<TimeRange>('1Y');

  const currencySymbol = currency === 'USD' ? '$' : '฿';

  const convertValue = (value: number) => {
    if (currency === 'USD') return value / exchangeRate;
    return value;
  };

  const formatCurrency = (value: number) => {
    const converted = convertValue(value);
    if (Math.abs(converted) >= 1000000) {
      return `${currencySymbol}${(converted / 1000000).toFixed(1)}M`;
    } else if (Math.abs(converted) >= 1000) {
      return `${currencySymbol}${(converted / 1000).toFixed(0)}K`;
    }
    return `${currencySymbol}${converted.toFixed(0)}`;
  };

  const getStartDate = (range: TimeRange): Date => {
    const now = new Date();
    const start = new Date(now);
    // Reset hours to start of day for consistent comparison
    start.setHours(0, 0, 0, 0);

    switch (range) {
      case '1D':
        // For 1D, we usually want "Today". 
        // If we subtract 1 day, it becomes "Last 24h" or "Since Yesterday".
        // Let's use "Start of Today"
        return start;
      case '1W': start.setDate(now.getDate() - 7); break;
      case '1M': start.setMonth(now.getMonth() - 1); break;
      case '3M': start.setMonth(now.getMonth() - 3); break;
      case '6M': start.setMonth(now.getMonth() - 6); break;
      case '1Y': start.setFullYear(now.getFullYear() - 1); break;
      case 'YTD': start.setMonth(0, 1); break; // Jan 1st
      case 'ALL': return new Date(0);
    }
    return start;
  };

  // 1. Portfolio Growth Data (Invested vs Market Value over time)
  // แก้ไข: ใช้ค่าจริงจาก transactions ไม่มีการสุ่ม (Math.random)
  const portfolioGrowthData = useMemo(() => {
    const startDate = getStartDate(growthRange);
    const now = new Date();

    // เรียง Transactions ตามเวลา
    const sortedTx = [...transactions].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // คำนวณ "ยอดยกมา" ก่อน startDate
    let cumulativeInvested = 0;
    if (growthRange !== 'ALL') {
      sortedTx.forEach(t => {
        const txDate = new Date(t.timestamp);
        if (txDate < startDate) {
          // แปลงค่าเงินถ้า transaction เป็น USD
          const rate = t.currency === 'USD' ? (t.exchangeRate || exchangeRate) : 1;
          if (t.type === 'buy') {
            cumulativeInvested += t.totalValue * rate;
          } else if (t.type === 'sell') {
            cumulativeInvested -= t.totalValue * rate; // ลบเต็มจำนวน ไม่ใช่ 0.8
          }
        }
      });
    }

    // กำหนด Granularity: Daily สำหรับช่วงสั้น, Monthly สำหรับ ALL
    const daysDiff = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const isDaily = growthRange !== 'ALL' || daysDiff < 365 * 2;

    // Group transactions by date key
    const txByDate = new Map<string, Transaction[]>();
    sortedTx.filter(t => new Date(t.timestamp) >= startDate).forEach(t => {
      const d = new Date(t.timestamp);
      const key = isDaily
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!txByDate.has(key)) txByDate.set(key, []);
      txByDate.get(key)!.push(t);
    });

    const result: { date: string; invested: number; marketValue: number }[] = [];
    let currentInvested = cumulativeInvested;
    let currentDate = new Date(startDate);
    let steps = 0;
    const maxSteps = 2000;

    while (currentDate <= now && steps < maxSteps) {
      const key = isDaily
        ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
        : `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      // รวม transactions ของวันนี้
      const dayTxs = txByDate.get(key) || [];
      dayTxs.forEach(t => {
        const rate = t.currency === 'USD' ? (t.exchangeRate || exchangeRate) : 1;
        if (t.type === 'buy') {
          currentInvested += t.totalValue * rate;
        } else if (t.type === 'sell') {
          currentInvested -= t.totalValue * rate; // ลบเต็มจำนวน
        }
      });

      // Label สำหรับแกน X
      const label = isDaily
        ? currentDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
        : currentDate.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });

      // Push ข้อมูลจุดนี้ (ใช้ค่าเดียวกันทั้ง invested และ marketValue ชั่วคราว
      // เพราะไม่มีข้อมูลราคาตลาดย้อนหลัง)
      result.push({
        date: label,
        invested: convertValue(currentInvested),
        marketValue: convertValue(currentInvested), // ใช้ค่าจริง ไม่สุ่ม
      });

      // Step forward
      if (isDaily) {
        currentDate.setDate(currentDate.getDate() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
        currentDate.setDate(1);
      }
      steps++;
    }

    // ** จุดสำคัญ: จุดสุดท้ายใช้ค่าจริงจาก holdings **
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalMarketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

    if (result.length > 0) {
      result[result.length - 1] = {
        date: 'ปัจจุบัน',
        invested: convertValue(totalInvested),
        marketValue: convertValue(totalMarketValue),
      };
    } else {
      result.push({
        date: 'ปัจจุบัน',
        invested: convertValue(totalInvested),
        marketValue: convertValue(totalMarketValue),
      });
    }

    return result;
  }, [transactions, holdings, currency, exchangeRate, growthRange]);

  // 2. Asset Allocation (Donut)
  const allocationData = useMemo(() => {
    return holdings
      .filter(h => !h.isClosed && h.marketValue > 0)
      .map((h, index) => ({
        name: h.ticker,
        value: convertValue(h.marketValue),
        color: ASSET_COLORS[index % ASSET_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, currency, exchangeRate]);

  const totalMarketValue = allocationData.reduce((sum, d) => sum + d.value, 0);

  // 3. P/L by Asset (sorted)
  const plByAssetData = useMemo(() => {
    return holdings
      .filter(h => !h.isClosed)
      .map(h => ({
        ticker: h.ticker,
        realizedPL: convertValue(h.realizedPL || 0),
        unrealizedPL: convertValue(h.unrealizedPL || 0),
        totalPL: convertValue((h.realizedPL || 0) + (h.unrealizedPL || 0)),
      }))
      .sort((a, b) => b.totalPL - a.totalPL);
  }, [holdings, currency, exchangeRate]);

  // 4. Realized vs Unrealized
  const realizedVsUnrealized = useMemo(() => {
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const realized = holdings.reduce((sum, h) => sum + (h.realizedPL || 0), 0);
    const unrealized = holdings.reduce((sum, h) => sum + (h.unrealizedPL || 0), 0);
    const total = realized + unrealized;
    // Calculate percentages (based on total invested)
    const realizedPct = totalInvested > 0 ? (realized / totalInvested) * 100 : 0;
    const unrealizedPct = totalInvested > 0 ? (unrealized / totalInvested) * 100 : 0;
    const totalPct = totalInvested > 0 ? (total / totalInvested) * 100 : 0;
    return {
      realized: convertValue(realized),
      unrealized: convertValue(unrealized),
      total: convertValue(total),
      realizedPct,
      unrealizedPct,
      totalPct,
      totalInvested: convertValue(totalInvested),
    };
  }, [holdings, currency, exchangeRate]);

  // 5. Monthly Dividend Data
  const monthlyDividendData = useMemo(() => {
    // Determine start date
    const startDate = getStartDate(dividendRange);

    // Group dividends
    const dividendsByMonth: Map<string, number> = new Map();
    const sortedTx = [...transactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sortedTx
      .filter(t => t.type === 'dividend' && new Date(t.timestamp) >= startDate)
      .forEach(t => {
        const date = new Date(t.timestamp);
        // Key logic: 1W/1D might cross months but we usually show Month Name.
        // For short ranges, this might result in 1 bar.
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const net = t.totalValue - (t.withholdingTax || 0);
        dividendsByMonth.set(key, (dividendsByMonth.get(key) || 0) + net);
      });

    // If 1D/1W and nothing found, we might want to show empty or just empty array
    if (dividendsByMonth.size === 0) return [];

    const sortedKeys = Array.from(dividendsByMonth.keys()).sort();

    return sortedKeys.map(key => ({
      month: new Date(key + '-01').toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
      dividend: convertValue(dividendsByMonth.get(key) || 0),
    }));
  }, [transactions, currency, exchangeRate, dividendRange]);

  const totalDividends = monthlyDividendData.reduce((sum, d) => sum + d.dividend, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Row 1: Portfolio Growth (Mobile-First) */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                📈 Portfolio Growth
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">ต้นทุน vs มูลค่าตลาด</p>
            </div>
            {/* Time Selector */}
            <div className="flex flex-wrap gap-1">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range}
                  variant={growthRange === range ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[10px] sm:text-xs",
                    growthRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => setGrowthRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-[200px] sm:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioGrowthData}>
                <defs>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.muted} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.muted} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.5} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 10 }}
                  width={60}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${currencySymbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    name === 'invested' ? 'ต้นทุน' : 'มูลค่าตลาด'
                  ]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => value === 'invested' ? 'ต้นทุน' : 'มูลค่าตลาด'}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  stroke={COLORS.muted}
                  fill="url(#colorInvested)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="marketValue"
                  stroke={COLORS.success}
                  fill="url(#colorMarket)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Allocation + P/L Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Asset Allocation */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              🍩 Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="h-[200px] sm:h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${currencySymbol}${value.toLocaleString()} (${((value / totalMarketValue) * 100).toFixed(1)}%)`,
                      name
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm sm:text-base font-bold">{formatCurrency(totalMarketValue * (currency === 'USD' ? exchangeRate : 1))}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {allocationData.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-muted-foreground ml-auto">{((item.value / totalMarketValue) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Realized vs Unrealized */}
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              💰 Realized vs Unrealized
            </CardTitle>
            <p className="text-xs text-muted-foreground">จริง vs ทิพย์</p>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
                <p className="text-xs text-muted-foreground">Realized (จริง)</p>
                <p className={`text-lg sm:text-xl font-bold ${realizedVsUnrealized.realized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {realizedVsUnrealized.realized >= 0 ? '+' : ''}{formatCurrency(realizedVsUnrealized.realized * (currency === 'USD' ? exchangeRate : 1))}
                </p>
                <p className={`text-xs font-medium ${realizedVsUnrealized.realizedPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {realizedVsUnrealized.realizedPct >= 0 ? '+' : ''}{realizedVsUnrealized.realizedPct.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-muted-foreground">Unrealized (ทิพย์)</p>
                <p className={`text-lg sm:text-xl font-bold ${realizedVsUnrealized.unrealized >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {realizedVsUnrealized.unrealized >= 0 ? '+' : ''}{formatCurrency(realizedVsUnrealized.unrealized * (currency === 'USD' ? exchangeRate : 1))}
                </p>
                <p className={`text-xs font-medium ${realizedVsUnrealized.unrealizedPct >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                  {realizedVsUnrealized.unrealizedPct >= 0 ? '+' : ''}{realizedVsUnrealized.unrealizedPct.toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">Total P/L</span>
                  <span className={`ml-2 text-xs font-medium ${realizedVsUnrealized.totalPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ({realizedVsUnrealized.totalPct >= 0 ? '+' : ''}{realizedVsUnrealized.totalPct.toFixed(2)}%)
                  </span>
                </div>
                <span className={`text-xl font-bold ${realizedVsUnrealized.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {realizedVsUnrealized.total >= 0 ? '+' : ''}{formatCurrency(realizedVsUnrealized.total * (currency === 'USD' ? exchangeRate : 1))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: P/L by Asset (Horizontal Bar) */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2 px-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            📊 Profit/Loss by Asset
          </CardTitle>
          <p className="text-xs text-muted-foreground">กำไร/ขาดทุนรายตัว (เรียงจากมากไปน้อย)</p>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="h-[200px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plByAssetData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="ticker" width={50} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'P/L']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="totalPL" radius={[0, 4, 4, 0]}>
                  {plByAssetData.slice(0, 10).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.totalPL >= 0 ? COLORS.success : COLORS.danger}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Row 4: Monthly Dividend */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-2 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                🗓 Monthly Dividend
              </CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">ปันผลรายเดือน</p>
                <span className="text-xs font-bold text-amber-600">
                  รวม: {formatCurrency(totalDividends)}
                </span>
              </div>
            </div>
            {/* Time Selector */}
            <div className="flex flex-wrap gap-1">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range}
                  variant={dividendRange === range ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[10px] sm:text-xs",
                    dividendRange === range ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => setDividendRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {monthlyDividendData.length > 0 ? (
            <div className="h-[180px] sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyDividendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} width={50} />
                  <Tooltip
                    formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Dividend']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="dividend" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              ไม่มีข้อมูลปันผลในช่วงเวลานี้
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
