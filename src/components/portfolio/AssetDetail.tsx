import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
    DollarSign,
    HelpCircle,
    Coins,
    PiggyBank,
    CircleDollarSign
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
                <TooltipProvider>
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 to-secondary/20">
                        <div className="flex justify-between items-start">
                            <div>
                                <Badge variant="outline" className="mb-2 border-primary text-primary font-bold uppercase">
                                    {holding.category === 'long-term' ? 'ระยะยาว' :
                                        holding.category === 'speculation' ? 'เก็งกำไร' : holding.category === 'securities' ? 'หลักทรัพย์' : holding.category}
                                </Badge>
                                <DialogTitle className="text-3xl font-black uppercase tracking-tight">{holding.ticker}</DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground mt-1">
                                    {holding.totalShares.toLocaleString(undefined, { maximumFractionDigits: 6 })} {holding.ticker.includes('GOLD') ? 'ออนซ์' : 'หุ้น'}
                                </DialogDescription>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 justify-end">
                                    <p className="text-xs text-muted-foreground uppercase font-bold">มูลค่าปัจจุบัน</p>
                                    <Tooltip>
                                        <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent><p>ราคาตลาด x จำนวนหุ้นที่ถืออยู่</p></TooltipContent>
                                    </Tooltip>
                                </div>
                                <p className="text-2xl font-black font-mono">
                                    {formatCurrency(convertValue(holding.marketValue))}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-6 pt-4 space-y-5">
                        {/* Performance Cards - Clearer Labels */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Unrealized P/L Card */}
                            <Card className="p-4 border-2 border-foreground bg-secondary/30 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex items-center gap-1 mb-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">กำไรทางบัญชี</p>
                                    <Tooltip>
                                        <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent className="max-w-[200px]">
                                            <p className="font-bold">Unrealized P/L</p>
                                            <p>กำไร/ขาดทุนที่ยังไม่ได้ขาย = มูลค่าปัจจุบัน - ต้นทุน</p>
                                            <p className="text-xs opacity-70 mt-1">*เปลี่ยนแปลงตามราคาตลาด</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className={`flex items-center gap-1 font-bold ${holding.unrealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {holding.unrealizedPL >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                                    <span className="font-mono text-xl">{formatPercent(holding.unrealizedPLPercent)}</span>
                                </div>
                                <p className={`text-sm font-mono mt-1 ${holding.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {holding.unrealizedPL >= 0 ? '+' : ''}{formatCurrency(convertValue(holding.unrealizedPL))}
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-1">ยังไม่ได้ขาย</p>
                            </Card>

                            {/* Realized P/L Card */}
                            <Card className="p-4 border-2 border-foreground bg-secondary/30 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div className="flex items-center gap-1 mb-2">
                                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground">กำไรจากการขาย</p>
                                    <Tooltip>
                                        <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                                        <TooltipContent className="max-w-[200px]">
                                            <p className="font-bold">Realized P/L</p>
                                            <p>กำไร/ขาดทุนที่รับรู้แล้ว = ราคาขาย - ราคาซื้อ (หลังหักค่าธรรมเนียม)</p>
                                            <p className="text-xs opacity-70 mt-1">*เงินที่ได้จริงเข้ากระเป๋าแล้ว</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className={`flex items-center gap-1 font-bold ${totalRealizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    <Coins className="h-5 w-5" />
                                    <span className="font-mono text-xl">{formatCurrency(totalRealizedPL)}</span>
                                </div>
                                <p className="text-[9px] text-muted-foreground mt-2">เข้ากระเป๋าแล้ว</p>
                            </Card>
                        </div>

                        {/* Capital Info - Clearer Structure */}
                        <div className="bg-foreground text-background p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 border-b border-background/20 pb-2 mb-2">
                                <PiggyBank className="h-5 w-5" />
                                <span className="font-bold uppercase text-sm">ข้อมูลต้นทุน</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 opacity-80">
                                    <Wallet className="h-4 w-4" />
                                    <span>เงินที่ใส่ไปทั้งหมด</span>
                                    <Tooltip>
                                        <TooltipTrigger><HelpCircle className="h-3 w-3 opacity-60" /></TooltipTrigger>
                                        <TooltipContent><p>รวมเงินที่ซื้อหุ้นตัวนี้ทั้งหมด + ค่าธรรมเนียม</p></TooltipContent>
                                    </Tooltip>
                                </div>
                                <span className="font-mono font-bold">{formatCurrency(totalCashInvested)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2 opacity-80">
                                    <ArrowDownRight className="h-4 w-4" />
                                    <span>เงินที่ขายออกมาแล้ว</span>
                                    <Tooltip>
                                        <TooltipTrigger><HelpCircle className="h-3 w-3 opacity-60" /></TooltipTrigger>
                                        <TooltipContent><p>เงินที่ได้จากการขายหุ้นตัวนี้ (ไม่รวมกำไร/ขาดทุน)</p></TooltipContent>
                                    </Tooltip>
                                </div>
                                <span className="font-mono font-bold">{formatCurrency(totalWithdrawn)}</span>
                            </div>

                            <div className="h-[1px] bg-background/30 my-2" />

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">💰 ต้นทุนคงเหลือในพอร์ต</span>
                                </div>
                                <span className="font-mono font-bold text-xl">{formatCurrency(convertValue(holding.totalInvested))}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm opacity-70">
                                <span>ต้นทุนเฉลี่ยต่อหุ้น</span>
                                <span className="font-mono">{formatCurrency(holding.averageCost)}</span>
                            </div>
                        </div>

                        {/* History List */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <History className="h-4 w-4 text-primary" />
                                <h3 className="font-bold uppercase text-sm tracking-wider">ประวัติรายการ ({assetTransactions.length})</h3>
                            </div>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                {assetTransactions.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">ไม่มีประวัติรายการ</p>
                                ) : assetTransactions.map((t) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 border-2 border-foreground rounded-lg bg-background hover:bg-secondary/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-md ${t.type === 'buy' ? 'bg-green-100 text-green-700' :
                                                t.type === 'sell' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {t.type === 'buy' ? <Plus className="h-4 w-4" /> :
                                                    t.type === 'sell' ? <Minus className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold uppercase">{t.type === 'buy' ? '🟢 ซื้อ' : t.type === 'sell' ? '🔴 ขาย' : '💵 ปันผล'}</p>
                                                <p className="text-[10px] text-muted-foreground">{new Date(t.timestamp).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold font-mono">
                                                {t.type !== 'dividend' && `${t.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} @ `}
                                                {t.currency === 'USD' ? '$' : '฿'}{t.pricePerShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </p>
                                            {t.type === 'sell' && t.realizedPL !== undefined && (
                                                <p className={`text-[10px] font-bold ${t.realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    กำไร: {t.realizedPL >= 0 ? '+' : ''}{t.realizedPL.toLocaleString(undefined, { maximumFractionDigits: 2 })} {t.currency}
                                                </p>
                                            )}
                                            {t.type === 'buy' && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    รวม: {t.currency === 'USD' ? '$' : '฿'}{t.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </TooltipProvider>
            </DialogContent>
        </Dialog>
    );
}
