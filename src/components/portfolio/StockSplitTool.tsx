import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Transaction } from "@/types/portfolio";
import { Scissors, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface StockSplitToolProps {
    transactions: Transaction[];
    onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
}

export function StockSplitTool({ transactions, onUpdateTransaction }: StockSplitToolProps) {
    const [ticker, setTicker] = useState("");
    const [ratio, setRatio] = useState("10"); // Default 10:1
    const [splitDate, setSplitDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [preview, setPreview] = useState<{ count: number; example?: Transaction } | null>(null);

    const handlePreview = () => {
        if (!ticker || !splitDate) return;
        const targetTicker = ticker.toUpperCase().trim();
        const targetDate = new Date(`${splitDate}T23:59:59`); // End of the selected day

        const related = transactions.filter(t => {
            const txDate = new Date(t.timestamp);
            return t.ticker === targetTicker && txDate <= targetDate;
        });

        if (related.length === 0) {
            toast.error(`ไม่พบรายการซื้อขายของ ${targetTicker} ก่อนวันที่ ${splitDate}`);
            setPreview(null);
            return;
        }

        setPreview({
            count: related.length,
            example: related[0]
        });
    };

    const handleSplit = () => {
        if (!preview || !ticker || !ratio || !splitDate) return;
        const splitRatio = parseFloat(ratio);
        if (isNaN(splitRatio) || splitRatio <= 0) {
            toast.error("อัตราส่วนไม่ถูกต้อง");
            return;
        }

        const targetTicker = ticker.toUpperCase().trim();
        const targetDate = new Date(`${splitDate}T23:59:59`);

        const related = transactions.filter(t => {
            const txDate = new Date(t.timestamp);
            return t.ticker === targetTicker && txDate <= targetDate;
        });

        let updatedCount = 0;

        related.forEach(t => {
            const newShares = t.shares * splitRatio;
            const newPrice = t.pricePerShare / splitRatio;

            if (t.type === 'dividend') {
                return;
            }

            onUpdateTransaction(t.id, {
                shares: newShares,
                pricePerShare: newPrice,
            });
            updatedCount++;
        });

        toast.success(`แตกพาร์หุ้น ${targetTicker} จำนวน ${updatedCount} รายการเรียบร้อยแล้ว`);
        setTicker("");
        setPreview(null);
    };

    return (
        <Card className="border-2 border-foreground shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl font-bold uppercase flex items-center gap-2">
                    <Scissors className="h-5 w-5" /> เครื่องมือแตกพาร์หุ้น (Stock Split)
                </CardTitle>
                <CardDescription>
                    ใช้สำหรับปรับปรุงประวัติการซื้อขายเมื่อหุ้นมีการแตกพาร์ (เช่น 1 หุ้น เป็น 10 หุ้น)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>ชื่อหุ้น (Ticker)</Label>
                        <Input
                            placeholder="เช่น NVDA, TSLA"
                            value={ticker}
                            onChange={e => {
                                setTicker(e.target.value.toUpperCase());
                                setPreview(null);
                            }}
                            className="border-2 border-foreground font-mono uppercase"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>อัตราส่วน (ใหม่ : เก่า)</Label>
                        <Input
                            type="number"
                            placeholder="10"
                            value={ratio}
                            onChange={e => setRatio(e.target.value)}
                            className="border-2 border-foreground font-mono"
                        />
                        <p className="text-xs text-muted-foreground">เช่น 10 หมายถึง 1 หุ้นเดิม กลายเป็น 10 หุ้นใหม่</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>วันที่แตกพาร์ (Effective Date)</Label>
                        <Input
                            type="date"
                            value={splitDate}
                            onChange={e => {
                                setSplitDate(e.target.value);
                                setPreview(null);
                            }}
                            className="border-2 border-foreground font-mono"
                        />
                        <p className="text-xs text-muted-foreground">* ระบบจะแก้ไขเฉพาะรายการที่เกิดขึ้น <b>ก่อนหรือภายใน</b> วันที่นี้เท่านั้น</p>
                    </div>
                </div>

                {!preview ? (
                    <Button onClick={handlePreview} className="w-full font-bold uppercase bg-primary text-primary-foreground">
                        ตรวจสอบรายการ
                    </Button>
                ) : (
                    <div className="space-y-4 border-2 border-primary/20 p-4 rounded-lg bg-secondary/10">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
                            <div>
                                <p className="font-bold">พบ {preview.count} รายการของ {ticker} (ก่อน {new Date(splitDate).toLocaleDateString('th-TH')})</p>
                                <p className="text-sm text-muted-foreground">
                                    ตัวอย่าง: {preview.example?.type === 'buy' ? 'ซื้อ' : 'ขาย'} {preview.example?.shares} หุ้น @ {preview.example?.pricePerShare}
                                    <br />
                                    จะเปลี่ยนเป็น: {(preview.example!.shares * parseFloat(ratio)).toFixed(4)} หุ้น @ {(preview.example!.pricePerShare / parseFloat(ratio)).toFixed(4)}
                                </p>
                            </div>
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="w-full font-bold uppercase bg-chart-2 hover:bg-chart-2/90 text-white">
                                    ยืนยันการแตกพาร์
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>ยืนยันการแตกพาร์ {ticker}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        การดำเนินการนี้จะแก้ไขประวัติการซื้อขายทั้งหมดของ {ticker} ตามอัตราส่วน {ratio}:1
                                        <br /><br />
                                        <span className="text-destructive font-bold flex items-center gap-1">
                                            <AlertTriangle className="h-4 w-4" /> การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                        </span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSplit} className="bg-chart-2 text-white">ยืนยัน</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
