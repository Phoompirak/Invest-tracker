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
        // Helper to convert value based on display currency
        const getRate = (txCurrency: string) => {
            if (txCurrency === 'USD' && currency === 'THB') return exchangeRate;
            if (txCurrency === 'THB' && currency === 'USD') return 1 / exchangeRate;
            return 1;
        };

        const realizedPL = filteredTransactions
            .filter(t => t.type === 'sell' && t.realizedPL !== undefined)
            .reduce((sum, t) => {
                return sum + (t.realizedPL || 0) * getRate(t.currency);
            }, 0);

        const dividends = filteredTransactions
            .filter(t => t.type === 'dividend')
            .reduce((sum, t) => {
                const net = t.totalValue - (t.withholdingTax || 0);
                return sum + net * getRate(t.currency);
            }, 0);

        return { realizedPL, dividends, total: realizedPL + dividends };
    }, [filteredTransactions, exchangeRate, currency]);

    // Calculate default growth rate from last profitable year
    const defaultGrowthRate = useMemo(() => {
        // Group by year and calculate P/L (normalized to THB for stability)
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

    // Current portfolio value in selected currency
    const portfolioValue = useMemo(() => {
        const total = summary.totalValue || summary.totalInvested;
        return currency === 'USD' ? total / exchangeRate : total;
    }, [summary, currency, exchangeRate]);

    const currencySymbol = currency === 'USD' ? '$' : '฿';
    const formatNumber = (n: number) => n.toLocaleString(undefined, {
        maximumFractionDigits: currency === 'USD' ? 2 : 0
    });

    return (
        <div className="min-h-screen bg-background">
            <Navbar currency={currency} setCurrency={setCurrency} />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pt-16 sm:pt-20">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95"
                    >
                        <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            วิเคราะห์การลงทุน
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">สรุปผลตอบแทนและพยากรณ์การเติบโต</p>
                    </div>
                </div>

                {/* Date Range Filter Section */}
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                            กรองตามช่วงเวลา
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                        <DateRangeFilter
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />

                        {/* Filtered Summary */}
                        {(startDate || endDate) && (
                            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                                <div className="text-center">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">กำไรขาย</p>
                                    <p className={`text-sm sm:text-lg font-bold ${filteredSummary.realizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {currencySymbol}{formatNumber(filteredSummary.realizedPL)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">ปันผล</p>
                                    <p className="text-sm sm:text-lg font-bold text-amber-600">
                                        {currencySymbol}{formatNumber(filteredSummary.dividends)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">รวม</p>
                                    <p className={`text-sm sm:text-lg font-bold ${filteredSummary.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {currencySymbol}{formatNumber(filteredSummary.total)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Two-column layout on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Yearly Summary */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                                สรุปผลตอบแทนรายปี
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <YearlySummary
                                transactions={transactions}
                                exchangeRate={exchangeRate}
                                currency={currency}
                            />
                        </CardContent>
                    </Card>

                    {/* Growth Projection */}
                    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="truncate">พยากรณ์การเติบโต</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 sm:px-6">
                            <GrowthProjection
                                initialValue={portfolioValue}
                                defaultRate={defaultGrowthRate}
                                currency={currency}
                            />
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
