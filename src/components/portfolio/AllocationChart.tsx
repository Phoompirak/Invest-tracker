import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Holding, PortfolioCategory } from '@/types/portfolio';

interface AllocationChartProps {
    holdings: Holding[];
    currency?: 'THB' | 'USD';
    exchangeRate?: number;
}

const COLORS = {
    'securities': '#10b981', // emerald-500
    'long-term': '#3b82f6', // blue-500
    'speculation': '#f59e0b', // amber-500
    'unknown': '#94a3b8' // slate-400
};

const LABELS: Record<string, string> = {
    'securities': 'หลักทรัพย์',
    'long-term': 'ระยะยาว',
    'speculation': 'เก็งกำไร',
};

export function AllocationChart({ holdings, currency = 'THB', exchangeRate = 34.5 }: AllocationChartProps) {
    const data = useMemo(() => {
        const distribution = holdings.reduce((acc, holding) => {
            const category = holding.category || 'unknown';
            // Convert to selected currency
            let value = holding.marketValue;
            if (currency === 'USD') {
                value = value / exchangeRate;
            }

            acc[category] = (acc[category] || 0) + value;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(distribution)
            .map(([name, value]) => ({
                name,
                value,
                label: LABELS[name] || name,
                color: COLORS[name as keyof typeof COLORS] || COLORS.unknown
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [holdings, currency, exchangeRate]);

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const currencySymbol = currency === 'USD' ? '$' : '฿';

    if (holdings.length === 0) return null;

    return (
        <Card className="border-2 border-foreground shadow-sm">
            <CardHeader className="border-b-2 border-foreground py-4">
                <CardTitle className="text-lg font-bold uppercase">สัดส่วนพอร์ตโฟลิโอ</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => [`${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'มูลค่า']}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value, entry: any) => {
                                    const item = data.find(d => d.name === value);
                                    return <span className="text-xs font-medium ml-1">{item?.label} ({((item?.value || 0) / totalValue * 100).toFixed(1)}%)</span>;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
