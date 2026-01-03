import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface GrowthProjectionProps {
    initialValue: number;
    defaultRate: number;
}

export function GrowthProjection({ initialValue, defaultRate }: GrowthProjectionProps) {
    const [rate, setRate] = useState(defaultRate);
    const [years, setYears] = useState(30);

    // Calculate compound growth projection
    const projections = useMemo(() => {
        const results: { year: number; value: number; growth: number }[] = [];
        let currentValue = initialValue;

        for (let i = 1; i <= years; i++) {
            const growth = currentValue * (rate / 100);
            currentValue += growth;
            results.push({
                year: i,
                value: currentValue,
                growth,
            });
        }

        return results;
    }, [initialValue, rate, years]);

    const formatNumber = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

    // Calculate milestones
    const milestones = useMemo(() => {
        const targets = [100000, 500000, 1000000, 5000000, 10000000];
        return targets.map(target => {
            const yearToReach = projections.findIndex(p => p.value >= target);
            return {
                target,
                label: target >= 1000000 ? `${target / 1000000}M` : `${target / 1000}K`,
                yearToReach: yearToReach >= 0 ? yearToReach + 1 : null,
            };
        }).filter(m => m.yearToReach !== null && m.yearToReach <= years);
    }, [projections, years]);

    return (
        <div className="space-y-6">
            {/* Inputs */}
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>เงินต้น (฿)</Label>
                    <div className="text-2xl font-bold text-primary">
                        ฿{formatNumber(initialValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">มูลค่าพอร์ตปัจจุบัน</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="rate">อัตราเติบโต (% ต่อปี)</Label>
                    <Input
                        id="rate"
                        type="number"
                        min={1}
                        max={100}
                        value={rate}
                        onChange={(e) => setRate(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground">ค่าเริ่มต้นจากกำไรปีล่าสุด</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="years">จำนวนปี</Label>
                    <Input
                        id="years"
                        type="number"
                        min={1}
                        max={50}
                        value={years}
                        onChange={(e) => setYears(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    />
                    <p className="text-xs text-muted-foreground">พยากรณ์ถึงปีที่เท่าไหร่</p>
                </div>
            </div>

            {/* Milestones */}
            {milestones.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                    <p className="text-sm font-medium mb-2">🎯 เป้าหมายที่คาดว่าจะถึง</p>
                    <div className="flex flex-wrap gap-3">
                        {milestones.map(m => (
                            <div key={m.target} className="text-center px-3 py-1 bg-background rounded-full border">
                                <span className="font-bold text-primary">฿{m.label}</span>
                                <span className="text-xs text-muted-foreground ml-1">ใน {m.yearToReach} ปี</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projection Table */}
            <div className="max-h-[400px] overflow-y-auto">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                            <TableHead>ปีที่</TableHead>
                            <TableHead className="text-right">มูลค่าพอร์ต</TableHead>
                            <TableHead className="text-right">กำไรในปี</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Year 0 (Current) */}
                        <TableRow className="bg-muted/50">
                            <TableCell className="font-medium">ปัจจุบัน</TableCell>
                            <TableCell className="text-right font-semibold">
                                ฿{formatNumber(initialValue)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">-</TableCell>
                        </TableRow>

                        {projections.map((p, idx) => {
                            // Highlight milestone years
                            const isMilestone = milestones.some(m => m.yearToReach === p.year);

                            return (
                                <TableRow
                                    key={p.year}
                                    className={isMilestone ? 'bg-primary/10' : undefined}
                                >
                                    <TableCell className="font-medium">
                                        ปีที่ {p.year}
                                        {isMilestone && <span className="ml-1">🎯</span>}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-primary">
                                        ฿{formatNumber(p.value)}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600">
                                        +฿{formatNumber(p.growth)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                    ถ้าพอร์ตเติบโตปีละ <strong>{rate}%</strong> อย่างสม่ำเสมอ
                    ใน <strong>{years} ปี</strong> พอร์ตจะโตจาก
                    <strong className="text-primary"> ฿{formatNumber(initialValue)}</strong> เป็น
                    <strong className="text-green-600"> ฿{formatNumber(projections[projections.length - 1]?.value || 0)}</strong>
                    {' '}(เพิ่มขึ้น <strong>{formatNumber(((projections[projections.length - 1]?.value || 0) / initialValue - 1) * 100)}%</strong>)
                </p>
            </div>
        </div>
    );
}
