import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Transaction } from "@/types/portfolio";

interface TransactionEditDialogProps {
    transaction: Transaction | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<Transaction>) => void;
}

export function TransactionEditDialog({ transaction, isOpen, onClose, onSave }: TransactionEditDialogProps) {
    const [pricePerShare, setPricePerShare] = useState("");
    const [shares, setShares] = useState("");
    const [commission, setCommission] = useState("");
    const [totalValue, setTotalValue] = useState("");

    useEffect(() => {
        if (transaction) {
            setPricePerShare(transaction.pricePerShare.toString());
            setShares(transaction.shares.toString());
            setCommission(transaction.commission.toString());
            setTotalValue(transaction.totalValue.toString());
        }
    }, [transaction]);

    // Auto-calculate totalValue when price or shares change
    useEffect(() => {
        const price = parseFloat(pricePerShare) || 0;
        const qty = parseFloat(shares) || 0;
        if (transaction?.type !== 'dividend') {
            setTotalValue((price * qty).toFixed(2));
        }
    }, [pricePerShare, shares, transaction?.type]);

    const handleSave = () => {
        if (!transaction) return;

        const updates: Partial<Transaction> = {
            pricePerShare: parseFloat(pricePerShare) || transaction.pricePerShare,
            shares: parseFloat(shares) || transaction.shares,
            commission: parseFloat(commission) || 0,
            totalValue: parseFloat(totalValue) || transaction.totalValue,
        };

        onSave(transaction.id, updates);
        onClose();
    };

    if (!transaction) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        แก้ไขรายการ - {transaction.ticker}
                        <span className={`text-sm ${transaction.type === 'buy' ? 'text-green-500' :
                                transaction.type === 'sell' ? 'text-red-500' : 'text-amber-500'
                            }`}>
                            ({transaction.type === 'buy' ? 'ซื้อ' : transaction.type === 'sell' ? 'ขาย' : 'ปันผล'})
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {transaction.type !== 'dividend' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="shares">จำนวนหุ้น</Label>
                                <Input
                                    id="shares"
                                    type="number"
                                    step="any"
                                    value={shares}
                                    onChange={(e) => setShares(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pricePerShare">ราคาต่อหุ้น ({transaction.currency})</Label>
                                <Input
                                    id="pricePerShare"
                                    type="number"
                                    step="any"
                                    value={pricePerShare}
                                    onChange={(e) => setPricePerShare(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="totalValue">มูลค่ารวม ({transaction.currency})</Label>
                        <Input
                            id="totalValue"
                            type="number"
                            step="any"
                            value={totalValue}
                            onChange={(e) => setTotalValue(e.target.value)}
                            disabled={transaction.type !== 'dividend'}
                            className={transaction.type !== 'dividend' ? 'bg-muted' : ''}
                        />
                        {transaction.type !== 'dividend' && (
                            <p className="text-xs text-muted-foreground">คำนวณจากจำนวน × ราคา</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="commission">ค่าธรรมเนียม ({transaction.currency})</Label>
                        <Input
                            id="commission"
                            type="number"
                            step="any"
                            value={commission}
                            onChange={(e) => setCommission(e.target.value)}
                        />
                    </div>

                    <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="font-bold text-amber-700 dark:text-amber-300">⚠️ หมายเหตุ</p>
                        <p className="mt-1">หลังแก้ไขเสร็จ ให้ไปกด <strong>"คำนวณกำไร/ขาดทุนใหม่"</strong> ใน Settings เพื่ออัพเดท P/L ทั้งหมด</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
                    <Button onClick={handleSave}>บันทึก</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
