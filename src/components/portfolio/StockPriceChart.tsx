import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchHistoricalPrices, StockPrice } from '@/services/stockPriceService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface StockPriceChartProps {
    ticker: string;
    currency?: 'THB' | 'USD';
}

export function StockPriceChart({ ticker, currency = 'THB' }: StockPriceChartProps) {
    const [data, setData] = useState<StockPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('1y');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const prices = await fetchHistoricalPrices(ticker, range, '1d', currency);
            setData(prices);
            setLoading(false);
        };
        loadData();
    }, [ticker, range, currency]);

    const ranges = [
        { label: '1M', value: '1mo' },
        { label: '6M', value: '6mo' },
        { label: '1Y', value: '1y' },
        { label: '5Y', value: '5y' },
        { label: 'MAX', value: 'max' },
    ];

    if (loading) {
        return (
            <Card className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    const formatXAxis = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    };

    const formatTooltipDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-normal">ราคาหุ้น: <span className="font-bold">{ticker}</span></CardTitle>
                <div className="flex space-x-1">
                    {ranges.map((r) => (
                        <Button
                            key={r.value}
                            variant={range === r.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRange(r.value)}
                            className="px-2 h-7 text-xs"
                        >
                            {r.label}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatXAxis}
                                minTickGap={30}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                orientation="right"
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `฿${val.toLocaleString()}`}
                            />
                            <Tooltip
                                labelFormatter={formatTooltipDate}
                                formatter={(value: number) => [`฿${value.toFixed(2)}`, 'ราคา']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="price"
                                stroke="#10b981"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorPrice)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
