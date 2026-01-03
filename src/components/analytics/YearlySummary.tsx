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
    currency: 'THB' | 'USD';
}

interface YearData {
    year: number;
    realizedPL: number;
    dividends: number;
    total: number;
    sellCount: number;
    dividendCount: number;
}

export function YearlySummary({ transactions, exchangeRate, currency }: YearlySummaryProps) {
    const currencySymbol = currency === 'USD' ? '$' : '฿';

    // Helper to see values in displayed currency
    const convertValue = (val: number, txCurrency: string) => {
        // Transaction is in USD, Display is THB -> val * rate
        if (txCurrency === 'USD' && currency === 'THB') return val * exchangeRate;
        // Transaction is in THB, Display is USD -> val / rate
        if (txCurrency === 'THB' && currency === 'USD') return val / exchangeRate;
        // Same currency
        return val;
    };

    const yearlyData = useMemo(() => {
        const dataMap = new Map<number, YearData>();

        transactions.forEach(t => {
            const year = new Date(t.timestamp).getFullYear();

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
                data.realizedPL += convertValue(t.realizedPL || 0, t.currency);
                data.sellCount += 1;
            } else if (t.type === 'dividend') {
                const netDividend = t.totalValue - (t.withholdingTax || 0);
                data.dividends += convertValue(netDividend, t.currency);
                data.dividendCount += 1;
            }

            data.total = data.realizedPL + data.dividends;
        });

        // Sort by year descending (newest first)
        return Array.from(dataMap.values()).sort((a, b) => b.year - a.year);
    }, [transactions, exchangeRate, currency]); // Re-calculate when currency changes

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

    const formatNumber = (n: number) => {
        return n.toLocaleString(undefined, {
            maximumFractionDigits: currency === 'USD' ? 2 : 0,
            minimumFractionDigits: currency === 'USD' ? 2 : 0
        });
    };

    const getColorClass = (n: number) => n >= 0 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs sm:text-sm">ปี</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">กำไรขาย</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">ปันผล</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">รวม</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {yearlyData.map(d => (
                        <TableRow key={d.year}>
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3">{d.year}</TableCell>
                            <TableCell className={`text-right text-xs sm:text-sm py-2 sm:py-3 ${getColorClass(d.realizedPL)}`}>
                                {currencySymbol}{formatNumber(d.realizedPL)}
                                <span className="text-[10px] text-muted-foreground ml-0.5 hidden sm:inline">
                                    ({d.sellCount})
                                </span>
                            </TableCell>
                            <TableCell className="text-right text-amber-600 text-xs sm:text-sm py-2 sm:py-3 hidden sm:table-cell">
                                {currencySymbol}{formatNumber(d.dividends)}
                                <span className="text-[10px] text-muted-foreground ml-0.5">
                                    ({d.dividendCount})
                                </span>
                            </TableCell>
                            <TableCell className={`text-right font-semibold text-xs sm:text-sm py-2 sm:py-3 ${getColorClass(d.total)}`}>
                                {currencySymbol}{formatNumber(d.total)}
                            </TableCell>
                        </TableRow>
                    ))}

                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-3">รวม</TableCell>
                        <TableCell className={`text-right text-xs sm:text-sm py-2 sm:py-3 ${getColorClass(totals.realizedPL)}`}>
                            {currencySymbol}{formatNumber(totals.realizedPL)}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 text-xs sm:text-sm py-2 sm:py-3 hidden sm:table-cell">
                            {currencySymbol}{formatNumber(totals.dividends)}
                        </TableCell>
                        <TableCell className={`text-right text-xs sm:text-sm py-2 sm:py-3 ${getColorClass(totals.total)}`}>
                            {currencySymbol}{formatNumber(totals.total)}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            {/* Simple Bar Visualization */}
            <div className="mt-4 sm:mt-6 space-y-1.5 sm:space-y-2 px-2 sm:px-0">
                <p className="text-xs sm:text-sm text-muted-foreground">กราฟแท่งรายปี</p>
                {yearlyData.map(d => {
                    const maxAbs = Math.max(...yearlyData.map(y => Math.abs(y.total)), 1);
                    const widthPercent = Math.min(Math.abs(d.total) / maxAbs * 100, 100);
                    const isPositive = d.total >= 0;

                    return (
                        <div key={d.year} className="flex items-center gap-1.5 sm:gap-2">
                            <span className="w-10 sm:w-12 text-xs sm:text-sm font-medium">{d.year}</span>
                            <div className="flex-1 h-5 sm:h-6 bg-muted rounded relative">
                                <div
                                    className={`h-full rounded transition-all duration-300 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${widthPercent}%` }}
                                />
                                <span className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-medium">
                                    {currencySymbol}{formatNumber(d.total)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
