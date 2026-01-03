import { useNavigate } from "react-router-dom";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Navbar } from "@/components/portfolio/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Calendar, TrendingUp } from "lucide-react";
import { YearlySummary } from "@/components/analytics/YearlySummary";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { GrowthProjection } from "@/components/analytics/GrowthProjection";
import { useState, useMemo } from "react";

export default function AnalyticsPage() {
    const navigate = useNavigate();
    const { transactions, summary, exchangeRate } = usePortfolio();

    // Currency state for Navbar
    const [currency, setCurrency] = useState<'THB' | 'USD'>('THB');

    // Date range state
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);

    // Filter transactions by date range
    const filteredTransactions = useMemo(() => {
        if (!startDate && !endDate) return transactions;
        return transactions.filter(t => {
            const txDate = new Date(t.timestamp);
            if (startDate && txDate < startDate) return false;
            if (endDate && txDate > endDate) return false;
            return true;
        });
    }, [transactions, startDate, endDate]);

    // Calculate summary for filtered transactions
    const filteredSummary = useMemo(() => {
        const realizedPL = filteredTransactions
            .filter(t => t.type === 'sell' && t.realizedPL !== undefined)
            .reduce((sum, t) => {
                const rate = t.currency === 'USD' ? exchangeRate : 1;
                return sum + (t.realizedPL || 0) * rate;
            }, 0);

        const dividends = filteredTransactions
            .filter(t => t.type === 'dividend')
            .reduce((sum, t) => {
                const rate = t.currency === 'USD' ? exchangeRate : 1;
                return sum + (t.totalValue - (t.withholdingTax || 0)) * rate;
            }, 0);

        return { realizedPL, dividends, total: realizedPL + dividends };
    }, [filteredTransactions, exchangeRate]);

    // Calculate default growth rate from last profitable year
    const defaultGrowthRate = useMemo(() => {
        // Group by year and calculate P/L
        const yearlyPL = new Map<number, number>();
        transactions.forEach(t => {
            if (t.type === 'sell' && t.realizedPL !== undefined) {
                const year = new Date(t.timestamp).getFullYear();
                const rate = t.currency === 'USD' ? exchangeRate : 1;
                yearlyPL.set(year, (yearlyPL.get(year) || 0) + (t.realizedPL || 0) * rate);
            }
        });

        // Find last profitable year
        const years = Array.from(yearlyPL.keys()).sort((a, b) => b - a);
        for (const year of years) {
            const pl = yearlyPL.get(year) || 0;
            if (pl > 0) {
                // Estimate rate based on total invested
                const invested = summary.totalInvested || 1;
                return Math.min(Math.round((pl / invested) * 100), 100);
            }
        }
        return 10; // Default 10% if no profitable year
    }, [transactions, exchangeRate, summary.totalInvested]);

    return (
        <div className="min-h-screen bg-background">
            <Navbar currency={currency} setCurrency={setCurrency} />

            <main className="container mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-muted transition"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-primary" />
                            วิเคราะห์การลงทุน
                        </h1>
                        <p className="text-muted-foreground text-sm">สรุปผลตอบแทนและพยากรณ์การเติบโต</p>
                    </div>
                </div>

                {/* Date Range Filter Section */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calendar className="h-5 w-5" />
                            กรองตามช่วงเวลา
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DateRangeFilter
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />

                        {/* Filtered Summary */}
                        {(startDate || endDate) && (
                            <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">กำไรจากการขาย</p>
                                    <p className={`text-lg font-bold ${filteredSummary.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ฿{filteredSummary.realizedPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">เงินปันผล</p>
                                    <p className="text-lg font-bold text-amber-600">
                                        ฿{filteredSummary.dividends.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">รวม</p>
                                    <p className={`text-lg font-bold ${filteredSummary.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ฿{filteredSummary.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Yearly Summary */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5" />
                            สรุปผลตอบแทนรายปี
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <YearlySummary transactions={transactions} exchangeRate={exchangeRate} />
                    </CardContent>
                </Card>

                {/* Growth Projection */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5" />
                            พยากรณ์การเติบโต (Compound Growth)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GrowthProjection
                            initialValue={summary.totalValue || summary.totalInvested}
                            defaultRate={defaultGrowthRate}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
