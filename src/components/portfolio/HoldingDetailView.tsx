import { useState } from "react";
import { Holding, Transaction, PortfolioSummary } from "@/types/portfolio";
import {
    TrendingUp,
    TrendingDown,
    History,
    Wallet,
    ArrowDownRight,
    Plus,
    Minus,
    DollarSign,
    Coins,
    PiggyBank,
    ChevronLeft,
    Receipt,
    Pencil
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBackButton } from "@/hooks/useBackButton";
import { TransactionEditDialog } from "./TransactionEditDialog";

interface HoldingDetailViewProps {
    holding: Holding;
    transactions: Transaction[];
    exchangeRate: number;
    currency: 'THB' | 'USD';
    onBack: () => void;
    showValue?: boolean;
    onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
}

export function HoldingDetailView({
    holding,
    transactions,
    exchangeRate,
    currency,
    onBack,
    showValue = true,
    onUpdateTransaction
}: HoldingDetailViewProps) {
    useBackButton(true, () => onBack());
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Filter transactions for this specific ticker
    const assetTransactions = transactions
        .filter(t => t.ticker === holding.ticker)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const buyTransactions = assetTransactions.filter(t => t.type === 'buy');
    const sellTransactions = assetTransactions.filter(t => t.type === 'sell');
    const dividendTransactions = assetTransactions.filter(t => t.type === 'dividend');

    const convertValue = (value: number) => {
        return currency === 'THB' ? value : value / exchangeRate;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    // Calculate stats
    const totalCashInvested = buyTransactions.reduce((sum, t) => {
        const rate = t.currency === 'USD' && currency === 'THB' ? exchangeRate :
            (t.currency === 'THB' && currency === 'USD' ? 1 / exchangeRate : 1);
        return sum + (t.totalValue + t.commission) * rate;
    }, 0);

    const totalRealizedPL = sellTransactions.reduce((sum, t) => {
        if (!t.realizedPL) return sum;
        const rate = t.currency === 'USD' && currency === 'THB' ? exchangeRate :
            (t.currency === 'THB' && currency === 'USD' ? 1 / exchangeRate : 1);
        return sum + t.realizedPL * rate;
    }, 0);

    const totalDividends = dividendTransactions.reduce((sum, t) => {
        const rate = t.currency === 'USD' && currency === 'THB' ? exchangeRate :
            (t.currency === 'THB' && currency === 'USD' ? 1 / exchangeRate : 1);
        return sum + t.totalValue * rate;
    }, 0);

    const totalWithdrawn = sellTransactions.reduce((sum, t) => {
        const rate = t.currency === 'USD' && currency === 'THB' ? exchangeRate :
            (t.currency === 'THB' && currency === 'USD' ? 1 / exchangeRate : 1);
        return sum + (t.totalValue - t.commission) * rate;
    }, 0);

    const totalCommissions = assetTransactions.reduce((sum, t) => {
        const rate = t.currency === 'USD' && currency === 'THB' ? exchangeRate :
            (t.currency === 'THB' && currency === 'USD' ? 1 / exchangeRate : 1);
        return sum + t.commission * rate;
    }, 0);

    return (
        <div className="fixed inset-x-0 top-14 bottom-0 z-40 bg-background overflow-auto">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="flex items-center gap-3 p-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="shrink-0"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-primary text-primary font-bold uppercase text-[10px]">
                                {holding.category === 'long-term' ? 'ระยะยาว' :
                                    holding.category === 'speculation' ? 'เก็งกำไร' :
                                        holding.category === 'securities' ? 'หลักทรัพย์' : holding.category}
                            </Badge>
                            {holding.isClosed && (
                                <Badge variant="secondary" className="text-[10px]">ขายหมดแล้ว</Badge>
                            )}
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">{holding.ticker}</h1>
                        <p className="text-sm text-muted-foreground">
                            {holding.totalShares.toLocaleString(undefined, { maximumFractionDigits: 6 })} {holding.ticker.includes('GOLD') ? 'ออนซ์' : 'หุ้น'}
                        </p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-4 pb-24 space-y-6">

                {/* Main Summary Card - Realized P/L Only */}
                <Card className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-green-400 text-white p-6 relative overflow-hidden border-0 shadow-lg">
                    <div className="absolute top-2 right-2 opacity-20">
                        <div className="w-16 h-16 bg-white/20 rounded-lg transform rotate-12" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white/80">กำไรจริงที่ได้รับ</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold font-mono">
                                {showValue ? formatCurrency(totalRealizedPL + totalDividends) : "••••••"}
                            </span>
                        </div>
                        {(totalRealizedPL + totalDividends) !== 0 && (
                            <div className="flex items-center gap-2 mt-2">
                                {(totalRealizedPL + totalDividends) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                <span className="text-sm font-medium">
                                    รวมกำไรขาย + ปันผล
                                </span>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Breakdown Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Realized P/L Card */}
                    <Card className="p-4 border-2 bg-card">
                        <div className="flex items-center gap-1 mb-2">
                            <Coins className="h-4 w-4 text-muted-foreground" />
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">กำไรจากการขาย</p>
                        </div>
                        <div className={`flex items-center gap-1 font-bold ${totalRealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {totalRealizedPL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                            <span className="font-mono text-xl">{showValue ? formatCurrency(totalRealizedPL) : "••••••"}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-2">จาก {sellTransactions.length} รายการขาย</p>
                    </Card>

                    {/* Dividends Card */}
                    <Card className="p-4 border-2 bg-card">
                        <div className="flex items-center gap-1 mb-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">เงินปันผล</p>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-green-500">
                            <span className="font-mono text-xl">{showValue ? formatCurrency(totalDividends) : "••••••"}</span>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-2">จาก {dividendTransactions.length} รายการปันผล</p>
                    </Card>
                </div>

                {/* Capital Info */}
                <Card className="p-4 bg-foreground text-background">
                    <div className="flex items-center gap-2 border-b border-background/20 pb-2 mb-3">
                        <PiggyBank className="h-5 w-5" />
                        <span className="font-bold uppercase text-sm">ข้อมูลการลงทุน</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 opacity-80">
                                <Wallet className="h-4 w-4" />
                                <span>เงินลงทุนทั้งหมด</span>
                            </div>
                            <span className="font-mono font-bold">{showValue ? formatCurrency(totalCashInvested) : "••••••"}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 opacity-80">
                                <ArrowDownRight className="h-4 w-4" />
                                <span>เงินที่ถอนออกมาแล้ว</span>
                            </div>
                            <span className="font-mono font-bold">{showValue ? formatCurrency(totalWithdrawn) : "••••••"}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 opacity-80">
                                <Receipt className="h-4 w-4" />
                                <span>ค่าธรรมเนียมรวม</span>
                            </div>
                            <span className="font-mono font-bold text-red-400">-{showValue ? formatCurrency(totalCommissions) : "••••••"}</span>
                        </div>

                        {!holding.isClosed && (
                            <>
                                <div className="h-[1px] bg-background/30 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold">💰 ต้นทุนคงเหลือในพอร์ต</span>
                                    <span className="font-mono font-bold text-xl">{showValue ? formatCurrency(convertValue(holding.totalInvested)) : "••••••"}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm opacity-70">
                                    <span>ต้นทุนเฉลี่ยต่อหุ้น</span>
                                    <span className="font-mono">{formatCurrency(holding.averageCost)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                {/* Transaction History */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-primary" />
                        <h3 className="font-bold uppercase text-sm tracking-wider">ประวัติรายการ ({assetTransactions.length})</h3>
                    </div>

                    <div className="space-y-2">
                        {assetTransactions.length === 0 ? (
                            <Card className="p-8 text-center text-muted-foreground">
                                <p>ไม่มีประวัติรายการ</p>
                            </Card>
                        ) : assetTransactions.map((t) => (
                            <Card key={t.id} className="p-4 border-2 hover:bg-secondary/20 transition-colors">
                                <div className="flex items-start justify-between">
                                    {/* Edit Button */}
                                    {onUpdateTransaction && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 mr-2 text-muted-foreground hover:text-primary shrink-0"
                                            onClick={() => setEditingTransaction(t)}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${t.type === 'buy' ? 'bg-green-100 text-green-700' :
                                            t.type === 'sell' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {t.type === 'buy' ? <Plus className="h-5 w-5" /> :
                                                t.type === 'sell' ? <Minus className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold uppercase">
                                                {t.type === 'buy' ? '🟢 ซื้อ' : t.type === 'sell' ? '🔴 ขาย' : '💵 ปันผล'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(t.timestamp).toLocaleDateString('th-TH', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {t.type !== 'dividend' && (
                                            <p className="text-sm font-bold font-mono">
                                                {t.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} @ {t.currency === 'USD' ? '$' : '฿'}{t.pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground font-mono">
                                            {t.type === 'buy' ? 'รวม: ' : t.type === 'sell' ? 'ได้รับ: ' : ''}
                                            {t.currency === 'USD' ? '$' : '฿'}{t.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </p>
                                        {t.type === 'sell' && t.realizedPL !== undefined && (
                                            <p className={`text-xs font-bold mt-1 ${t.realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                กำไร: {t.realizedPL >= 0 ? '+' : ''}{t.currency === 'USD' ? '$' : '฿'}{t.realizedPL.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                        {t.commission > 0 && (
                                            <p className="text-[10px] text-muted-foreground">
                                                ค่าธรรมเนียม: {t.currency === 'USD' ? '$' : '฿'}{t.commission.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transaction Edit Dialog */}
            {onUpdateTransaction && (
                <TransactionEditDialog
                    transaction={editingTransaction}
                    isOpen={!!editingTransaction}
                    onClose={() => setEditingTransaction(null)}
                    onSave={onUpdateTransaction}
                />
            )}
        </div>
    );
}
