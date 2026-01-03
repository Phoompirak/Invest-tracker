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
    currency: 'THB' | 'USD';
}

export function GrowthProjection({ initialValue, defaultRate, currency }: GrowthProjectionProps) {
    const [rate, setRate] = useState(defaultRate);
    const [years, setYears] = useState(30);
    const currencySymbol = currency === 'USD' ? '$' : '฿';

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

    const formatNumber = (n: number) => n.toLocaleString(undefined, {
        maximumFractionDigits: currency === 'USD' ? 2 : 0,
        minimumFractionDigits: currency === 'USD' ? 2 : 0
    });

    // Calculate milestones (different for THB/USD)
    const milestones = useMemo(() => {
        const targets = currency === 'USD'
            ? [1000, 5000, 10000, 50000, 100000, 1000000]
            : [100000, 500000, 1000000, 5000000, 10000000];

        return targets.map(target => {
            const yearToReach = projections.findIndex(p => p.value >= target);
            return {
                target,
                label: target >= 1000000
                    ? `${target / 1000000}M`
                    : `${target / 1000}K`,
                yearToReach: yearToReach >= 0 ? yearToReach + 1 : null,
            };
        }).filter(m => m.yearToReach !== null && m.yearToReach <= years);
    }, [projections, years, currency]);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Inputs - Stack on mobile, row on tablet+ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">เงินต้น</Label>
                    <div className="text-lg sm:text-2xl font-bold text-primary">
                        {currencySymbol}{formatNumber(initialValue)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">มูลค่าพอร์ตปัจจุบัน</p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="rate" className="text-xs sm:text-sm">อัตราเติบโต (%/ปี)</Label>
                    <Input
                        id="rate"
                        type="number"
                        min={1}
                        max={100}
                        value={rate}
                        onChange={(e) => setRate(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="h-9 sm:h-10"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">จากกำไรปีล่าสุด</p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="years" className="text-xs sm:text-sm">จำนวนปี</Label>
                    <Input
                        id="years"
                        type="number"
                        min={1}
                        max={50}
                        value={years}
                        onChange={(e) => setYears(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="h-9 sm:h-10"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">พยากรณ์ถึงปีที่</p>
                </div>
            </div>

            {/* Milestones - Horizontal scroll on mobile */}
            {milestones.length > 0 && (
                <div className="p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium mb-2">🎯 เป้าหมายที่คาดว่าจะถึง</p>
                    <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-1 sm:pb-0 sm:flex-wrap">
                        {milestones.map(m => (
                            <div key={m.target} className="flex-shrink-0 text-center px-2 sm:px-3 py-1 bg-background rounded-full border text-xs sm:text-sm">
                                <span className="font-bold text-primary">{currencySymbol}{m.label}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">ใน {m.yearToReach} ปี</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projection Table - Scrollable */}
            <div className="max-h-[250px] sm:max-h-[400px] overflow-y-auto rounded-lg border">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            <TableHead className="text-xs sm:text-sm">ปีที่</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm">มูลค่าพอร์ต</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">กำไรในปี</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Year 0 (Current) */}
                        <TableRow className="bg-muted/50">
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3">ปัจจุบัน</TableCell>
                            <TableCell className="text-right font-semibold text-xs sm:text-sm py-2 sm:py-3">
                                {currencySymbol}{formatNumber(initialValue)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs sm:text-sm py-2 sm:py-3 hidden sm:table-cell">-</TableCell>
                        </TableRow>

                        {projections.map((p, idx) => {
                            const isMilestone = milestones.some(m => m.yearToReach === p.year);

                            return (
                                <TableRow
                                    key={p.year}
                                    className={isMilestone ? 'bg-primary/10' : undefined}
                                >
                                    <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3">
                                        ปีที่ {p.year}
                                        {isMilestone && <span className="ml-1">🎯</span>}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-primary text-xs sm:text-sm py-2 sm:py-3">
                                        {currencySymbol}{formatNumber(p.value)}
                                    </TableCell>
                                    <TableCell className="text-right text-green-600 text-xs sm:text-sm py-2 sm:py-3 hidden sm:table-cell">
                                        +{currencySymbol}{formatNumber(p.growth)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Summary */}
            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                <p className="text-xs sm:text-sm text-muted-foreground">
                    ถ้าเติบโตปีละ <strong>{rate}%</strong> ใน <strong>{years} ปี</strong> พอร์ตจะโตจาก
                    <strong className="text-primary"> {currencySymbol}{formatNumber(initialValue)}</strong> เป็น
                    <strong className="text-green-600"> {currencySymbol}{formatNumber(projections[projections.length - 1]?.value || 0)}</strong>
                    <span className="hidden sm:inline"> (เพิ่มขึ้น <strong>{formatNumber(((projections[projections.length - 1]?.value || 0) / initialValue - 1) * 100)}%</strong>)</span>
                </p>
            </div>
        </div>
    );
}
