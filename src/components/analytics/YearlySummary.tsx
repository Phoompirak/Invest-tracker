import { Transaction } from "@/types/portfolio";
import { useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface YearlySummaryProps {
    transactions: Transaction[];
    exchangeRate: number;
}

interface YearData {
    year: number;
    realizedPL: number;
    dividends: number;
    total: number;
    sellCount: number;
    dividendCount: number;
}

export function YearlySummary({ transactions, exchangeRate }: YearlySummaryProps) {
    const yearlyData = useMemo(() => {
        const dataMap = new Map<number, YearData>();

        transactions.forEach(t => {
            const year = new Date(t.timestamp).getFullYear();
            const rate = t.currency === 'USD' ? exchangeRate : 1;

            if (!dataMap.has(year)) {
                dataMap.set(year, {
                    year,
                    realizedPL: 0,
                    dividends: 0,
                    total: 0,
                    sellCount: 0,
                    dividendCount: 0,
                });
            }

            const data = dataMap.get(year)!;

            if (t.type === 'sell' && t.realizedPL !== undefined) {
                data.realizedPL += (t.realizedPL || 0) * rate;
                data.sellCount += 1;
            } else if (t.type === 'dividend') {
                const netDividend = (t.totalValue - (t.withholdingTax || 0)) * rate;
                data.dividends += netDividend;
                data.dividendCount += 1;
            }

            data.total = data.realizedPL + data.dividends;
        });

        // Sort by year descending (newest first)
        return Array.from(dataMap.values()).sort((a, b) => b.year - a.year);
    }, [transactions, exchangeRate]);

    // Calculate totals
    const totals = useMemo(() => {
        return yearlyData.reduce(
            (acc, d) => ({
                realizedPL: acc.realizedPL + d.realizedPL,
                dividends: acc.dividends + d.dividends,
                total: acc.total + d.total,
            }),
            { realizedPL: 0, dividends: 0, total: 0 }
        );
    }, [yearlyData]);

    if (yearlyData.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                ยังไม่มีข้อมูลการขายหรือปันผล
            </div>
        );
    }

    const formatNumber = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const getColorClass = (n: number) => n >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ปี</TableHead>
                        <TableHead className="text-right">กำไรจากการขาย</TableHead>
                        <TableHead className="text-right">เงินปันผล</TableHead>
                        <TableHead className="text-right">รวม</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {yearlyData.map(d => (
                        <TableRow key={d.year}>
                            <TableCell className="font-medium">{d.year}</TableCell>
                            <TableCell className={`text-right ${getColorClass(d.realizedPL)}`}>
                                ฿{formatNumber(d.realizedPL)}
                                <span className="text-xs text-muted-foreground ml-1">
                                    ({d.sellCount} รายการ)
                                </span>
                            </TableCell>
                            <TableCell className="text-right text-amber-600">
                                ฿{formatNumber(d.dividends)}
                                <span className="text-xs text-muted-foreground ml-1">
                                    ({d.dividendCount} รายการ)
                                </span>
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${getColorClass(d.total)}`}>
                                ฿{formatNumber(d.total)}
                            </TableCell>
                        </TableRow>
                    ))}

                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell>รวมทั้งหมด</TableCell>
                        <TableCell className={`text-right ${getColorClass(totals.realizedPL)}`}>
                            ฿{formatNumber(totals.realizedPL)}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                            ฿{formatNumber(totals.dividends)}
                        </TableCell>
                        <TableCell className={`text-right ${getColorClass(totals.total)}`}>
                            ฿{formatNumber(totals.total)}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            {/* Simple Bar Visualization */}
            <div className="mt-6 space-y-2">
                <p className="text-sm text-muted-foreground">กราฟแท่งรายปี</p>
                {yearlyData.map(d => {
                    const maxAbs = Math.max(...yearlyData.map(y => Math.abs(y.total)), 1);
                    const widthPercent = Math.min(Math.abs(d.total) / maxAbs * 100, 100);
                    const isPositive = d.total >= 0;

                    return (
                        <div key={d.year} className="flex items-center gap-2">
                            <span className="w-12 text-sm font-medium">{d.year}</span>
                            <div className="flex-1 h-6 bg-muted rounded relative">
                                <div
                                    className={`h-full rounded ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${widthPercent}%` }}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                                    ฿{formatNumber(d.total)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
