import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Holding } from '@/types/portfolio';

interface AllocationChartProps {
    holdings: Holding[];
    currency?: 'THB' | 'USD';
    exchangeRate?: number;
}

// Distinct colors for individual assets
const ASSET_COLORS = [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#6366f1', // indigo
    '#84cc16', // lime
    '#06b6d4', // cyan
    '#a855f7', // purple
];

const CATEGORY_LABELS: Record<string, string> = {
    'securities': 'หลักทรัพย์',
    'long-term': 'ระยะยาว',
    'speculation': 'เก็งกำไร',
};

export function AllocationChart({ holdings, currency = 'THB', exchangeRate = 34.5 }: AllocationChartProps) {
    const { assetData, categoryData, totalValue } = useMemo(() => {
        // Asset-level data
        const assetData = holdings
            .map((holding, index) => {
                let value = holding.marketValue;
                if (currency === 'USD') {
                    value = value / exchangeRate;
                }
                return {
                    name: holding.ticker,
                    value,
                    category: holding.category,
                    color: ASSET_COLORS[index % ASSET_COLORS.length],
                };
            })
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        // Category-level data
        const categoryMap: Record<string, number> = {};
        holdings.forEach(holding => {
            let value = holding.marketValue;
            if (currency === 'USD') {
                value = value / exchangeRate;
            }
            const cat = holding.category || 'unknown';
            categoryMap[cat] = (categoryMap[cat] || 0) + value;
        });

        const categoryData = Object.entries(categoryMap)
            .map(([name, value]) => ({
                name,
                value,
                label: CATEGORY_LABELS[name] || name,
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        const totalValue = assetData.reduce((sum, item) => sum + item.value, 0);

        return { assetData, categoryData, totalValue };
    }, [holdings, currency, exchangeRate]);

    const currencySymbol = currency === 'USD' ? '$' : '฿';

    if (holdings.length === 0) return null;

    const formatValue = (value: number) => {
        if (value >= 1000000) {
            return `${currencySymbol}${(value / 1000000).toFixed(2)}M`;
        } else if (value >= 1000) {
            return `${currencySymbol}${(value / 1000).toFixed(1)}K`;
        }
        return `${currencySymbol}${value.toFixed(2)}`;
    };

    return (
        <Card className="border-2 border-foreground shadow-sm">
            <CardHeader className="border-b-2 border-foreground py-4">
                <CardTitle className="text-lg font-bold uppercase">สัดส่วนพอร์ตโฟลิโอ</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="h-[280px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={assetData}
                                cx="50%"
                                cy="45%"
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {assetData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number, name: string) => [
                                    `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${((value / totalValue) * 100).toFixed(1)}%)`,
                                    name
                                ]}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '2px solid #000',
                                    backgroundColor: 'var(--background)',
                                    color: 'var(--foreground)'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Label */}
                    <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <p className="text-[10px] text-muted-foreground uppercase">มูลค่ารวม</p>
                        <p className="text-lg font-bold font-mono">{formatValue(totalValue)}</p>
                    </div>
                </div>

                {/* Legend - Asset breakdown */}
                <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">รายการสินทรัพย์</p>
                    <div className="grid grid-cols-2 gap-2">
                        {assetData.slice(0, 10).map((item, index) => (
                            <div key={item.name} className="flex items-center gap-2 text-sm">
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="font-bold uppercase truncate">{item.name}</span>
                                <span className="text-muted-foreground ml-auto text-xs">
                                    {((item.value / totalValue) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                    {assetData.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            +{assetData.length - 10} รายการอื่นๆ
                        </p>
                    )}
                </div>

                {/* Category Summary */}
                <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">สรุปตามหมวดหมู่</p>
                    <div className="flex flex-wrap gap-3">
                        {categoryData.map(cat => (
                            <div key={cat.name} className="bg-secondary/50 px-3 py-1.5 rounded-full">
                                <span className="text-xs font-bold">{cat.label}:</span>
                                <span className="text-xs font-mono ml-1">
                                    {formatValue(cat.value)} ({((cat.value / totalValue) * 100).toFixed(0)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
