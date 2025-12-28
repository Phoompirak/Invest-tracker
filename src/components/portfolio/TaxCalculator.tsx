import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";

export function TaxCalculator() {
    const [thaiIncome, setThaiIncome] = useState<number>(0);
    const [foreignIncome, setForeignIncome] = useState<number>(0);
    const [taxResult, setTaxResult] = useState<{
        totalTax: number;
        marginalRate: number;
        brackets: { rate: number; amount: number; tax: number }[];
    } | null>(null);

    const calculateTax = () => {
        const totalIncome = thaiIncome + foreignIncome;
        let remainingIncome = totalIncome;
        let tax = 0;
        const brackets = [];

        const TAX_RATES = [
            { limit: 150000, rate: 0 },
            { limit: 300000, rate: 0.05 },
            { limit: 500000, rate: 0.10 },
            { limit: 750000, rate: 0.15 },
            { limit: 1000000, rate: 0.20 },
            { limit: 2000000, rate: 0.25 },
            { limit: 5000000, rate: 0.30 },
            { limit: Infinity, rate: 0.35 },
        ];

        let previousLimit = 0;
        for (const bracket of TAX_RATES) {
            if (remainingIncome <= 0) break;

            const range = bracket.limit - previousLimit;
            const taxableAmount = Math.min(remainingIncome, range);
            const taxAmount = taxableAmount * bracket.rate;

            if (taxableAmount > 0) {
                brackets.push({
                    rate: bracket.rate,
                    amount: taxableAmount,
                    tax: taxAmount
                });
            }

            tax += taxAmount;
            remainingIncome -= taxableAmount;
            previousLimit = bracket.limit;

            // Since we decrement remainingIncome, we don't need to track previousLimit relative to total, 
            // but the range logic above assumes limits are cumulative. 
            // Let's rewrite for clarity.
        }

        // Recalculate correctly using cumulative logic
        let calculatedTax = 0;
        const breakdown = [];

        // Reset for correct calculation
        let income = totalIncome;
        let prevLimit = 0;

        for (const b of TAX_RATES) {
            const width = b.limit - prevLimit;
            const inBracket = Math.min(Math.max(0, totalIncome - prevLimit), width);
            if (inBracket > 0) {
                const t = inBracket * b.rate;
                calculatedTax += t;
                breakdown.push({ rate: b.rate, amount: inBracket, tax: t });
            }
            prevLimit = b.limit;
        }

        setTaxResult({
            totalTax: calculatedTax,
            marginalRate: breakdown.length > 0 ? breakdown[breakdown.length - 1].rate : 0,
            brackets: breakdown
        });
    };

    return (
        <Card className="border-2 border-foreground shadow-sm">
            <CardHeader className="border-b-2 border-foreground bg-secondary/20">
                <CardTitle className="flex items-center gap-2 text-xl font-bold uppercase">
                    <Calculator className="h-5 w-5" /> คำนวณภาษี (Foreign Investment)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="thai-income">รายได้ในไทย / ปี (บาท)</Label>
                            <Input
                                id="thai-income"
                                type="number"
                                placeholder="0"
                                value={thaiIncome || ''}
                                onChange={(e) => setThaiIncome(Number(e.target.value))}
                                className="font-mono border-2"
                            />
                            <p className="text-xs text-muted-foreground">เงินเดือน, โบนัส, ค่าจ้าง ฯลฯ</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="foreign-income">เงินได้จากการลงทุนต่างประเทศที่นำเข้า (บาท)</Label>
                            <Input
                                id="foreign-income"
                                type="number"
                                placeholder="0"
                                value={foreignIncome || ''}
                                onChange={(e) => setForeignIncome(Number(e.target.value))}
                                className="font-mono border-2"
                            />
                            <p className="text-xs text-muted-foreground">เฉพาะส่วนกำไร/ปันผล ที่นำกลับไทยในปีเดียวกัน</p>
                        </div>

                        <Button onClick={calculateTax} className="w-full font-bold uppercase transition-transform active:scale-95">
                            คำนวณภาษี
                        </Button>
                    </div>

                    <div className="bg-secondary/10 rounded-lg p-4 border-2 border-dashed border-border">
                        {taxResult ? (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <p className="text-sm font-medium text-muted-foreground uppercase">ภาษีที่ต้องจ่ายเพิ่ม</p>
                                    <p className="text-3xl font-bold font-mono text-destructive">
                                        ฿{taxResult.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        อัตราภาษีสูงสุด: <span className="font-bold text-foreground">{(taxResult.marginalRate * 100).toFixed(0)}%</span>
                                    </p>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <p className="text-sm font-bold uppercase mb-2">รายละเอียดขั้นบันได</p>
                                    {taxResult.brackets.map((b, i) => (
                                        <div key={i} className="flex justify-between text-sm font-mono">
                                            <span className="text-muted-foreground">{(b.rate * 100).toFixed(0)}% (ยอด {b.amount.toLocaleString()})</span>
                                            <span className="font-bold">฿{b.tax.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                                <Calculator className="h-10 w-10" />
                                <p>กรอกข้อมูลเพื่อคำนวณ</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
