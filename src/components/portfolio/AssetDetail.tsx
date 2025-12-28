import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Holding, Transaction, TransactionType } from "@/types/portfolio";
import {
    TrendingUp,
    TrendingDown,
    History,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    Plus,
    Minus,
    DollarSign
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface AssetDetailProps {
    holding: Holding;
    transactions: Transaction[];
    exchangeRate: number;
    currency: 'THB' | 'USD';
    isOpen: boolean;
    onClose: () => void;
}

export function AssetDetail({
    holding,
    transactions,
    exchangeRate,
    currency,
    isOpen,
    onClose
}: AssetDetailProps) {
    // Filter transactions for this specific ticker
    const assetTransactions = transactions
        .filter(t => t.ticker === holding.ticker)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const convertValue = (value: number) => {
        return currency === 'THB' ? value : value / exchangeRate;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat(currency === 'THB' ? 'th-TH' : 'en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    const formatPercent = (value: number) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    // Calculate stats
    const buyTransactions = assetTransactions.filter(t => t.type === 'buy');
    const sellTransactions = assetTransactions.filter(t => t.type === 'sell');

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

    const totalWithdrawn = sellTransactions.reduce((sum, t) => {
        const rate = t.currency === 'USD' && currency === 'THB' ? exchangeRate :
            (t.currency === 'THB' && currency === 'USD' ? 1 / exchangeRate : 1);
        return sum + (t.totalValue - t.commission) * rate;
    }, 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-2 border-foreground rounded-2xl">
                <DialogHeader className="p-6 pb-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge variant="outline" className="mb-2 border-primary text-primary font-bold uppercase">
                                {holding.category === 'long-term' ? 'ระยะยาว' :
                                    holding.category === 'speculation' ? 'เก็งกำไร' : 'หลักทรัพย์'}
                            </Badge>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tight">{holding.ticker}</DialogTitle>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-bold">มูลค่าปัจจุบัน</p>
                            <p className="text-2xl font-black font-mono">
                                {formatCurrency(convertValue(holding.marketValue))}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Performance Card */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4 border-2 border-foreground bg-secondary/30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">กำไร/ขาดทุนสะสม</p>
                            <div className={`flex items-center gap-1 font-bold ${holding.unrealizedPL >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                {holding.unrealizedPL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                <span className="font-mono text-lg">{formatPercent(holding.unrealizedPLPercent)}</span>
                            </div>
                            <p className="text-xs font-mono opacity-70">({formatCurrency(convertValue(holding.unrealizedPL))})</p>
                        </Card>

                        <Card className="p-4 border-2 border-foreground bg-secondary/30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">กำไรที่ขายออกไปแล้ว</p>
                            <div className={`flex items-center gap-1 font-bold ${totalRealizedPL >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                                <ArrowUpRight className="h-4 w-4" />
                                <span className="font-mono text-lg">{formatCurrency(totalRealizedPL)}</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground">(Realized P/L)</p>
                        </Card>
                    </div>

                    {/* Capital Info */}
                    <div className="bg-foreground text-background p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 opacity-80">
                                <Wallet className="h-4 w-4" />
                                <span>ต้นทุนทั้งหมด (Invested)</span>
                            </div>
                            <span className="font-mono font-bold">{formatCurrency(totalCashInvested)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2 opacity-80">
                                <ArrowDownRight className="h-4 w-4" />
                                <span>ถอนทุนคืนแล้ว (Withdrawn)</span>
                            </div>
                            <span className="font-mono font-bold">{formatCurrency(totalWithdrawn)}</span>
                        </div>
                        <div className="h-[1px] bg-background/20 my-1" />
                        <div className="flex justify-between items-center">
                            <span className="font-bold">ต้นทุนคงเหลือในพอร์ต</span>
                            <span className="font-mono font-bold text-xl">{formatCurrency(convertValue(holding.totalInvested))}</span>
                        </div>
                    </div>

                    {/* History List */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <History className="h-4 w-4 text-primary" />
                            <h3 className="font-bold uppercase text-sm tracking-wider">ประวัติรายการ</h3>
                        </div>
                        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {assetTransactions.map((t) => (
                                <div key={t.id} className="flex items-center justify-between p-3 border-2 border-foreground rounded-lg bg-background hover:bg-secondary/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-md ${t.type === 'buy' ? 'bg-emerald-100 text-emerald-700' :
                                            t.type === 'sell' ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {t.type === 'buy' ? <Plus className="h-4 w-4" /> :
                                                t.type === 'sell' ? <Minus className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase">{t.type === 'buy' ? 'ซื้อ' : t.type === 'sell' ? 'ขาย' : 'ปันผล'}</p>
                                            <p className="text-[10px] text-muted-foreground">{new Date(t.timestamp).toLocaleDateString('th-TH')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold font-mono">
                                            {t.type !== 'dividend' && `${t.shares.toLocaleString()} @ `}
                                            {t.currency === 'USD' ? '$' : '฿'}{t.pricePerShare.toLocaleString()}
                                        </p>
                                        {t.realizedPL !== undefined && (
                                            <p className={`text-[10px] font-bold ${t.realizedPL >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                                {t.realizedPL >= 0 ? '+' : ''}{t.realizedPL.toLocaleString()} {t.currency}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
