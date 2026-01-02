import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, SplitSquareHorizontal, Calendar, Hash } from 'lucide-react';
import { StockSplit } from '@/types/portfolio';

interface StockSplitManagerProps {
    stockSplits: StockSplit[];
    onAddSplit: (ticker: string, ratio: number, effectiveDate: Date) => Promise<void>;
    onRemoveSplit: (splitId: string) => Promise<void>;
    tickers: string[]; // Available tickers from transactions
}

export function StockSplitManager({
    stockSplits,
    onAddSplit,
    onRemoveSplit,
    tickers,
}: StockSplitManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTicker, setNewTicker] = useState('');
    const [newRatio, setNewRatio] = useState('');
    const [newDate, setNewDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddSplit = async () => {
        if (!newTicker || !newRatio || !newDate) return;

        const ratio = parseFloat(newRatio);
        if (isNaN(ratio) || ratio <= 0) {
            alert('อัตราแตกหุ้นต้องเป็นตัวเลขที่มากกว่า 0');
            return;
        }

        setIsSubmitting(true);
        try {
            await onAddSplit(newTicker.toUpperCase(), ratio, new Date(newDate));
            setNewTicker('');
            setNewRatio('');
            setNewDate('');
            setIsAdding(false);
        } catch (error) {
            console.error('Failed to add split:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มข้อมูลการแตกหุ้น');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveSplit = async (splitId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลการแตกหุ้นนี้?')) return;

        try {
            await onRemoveSplit(splitId);
        } catch (error) {
            console.error('Failed to remove split:', error);
            alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <SplitSquareHorizontal className="h-5 w-5" />
                    การแตกหุ้น (Stock Splits)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                    บันทึกเหตุการณ์แตกหุ้นเพื่อคำนวณต้นทุนและกำไรขาดทุนให้ถูกต้อง
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* List of stock splits */}
                {stockSplits.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        ยังไม่มีข้อมูลการแตกหุ้น
                    </div>
                ) : (
                    <div className="space-y-2">
                        {stockSplits
                            .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())
                            .map((split) => (
                                <div
                                    key={split.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="font-mono">
                                            {split.ticker}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-sm">
                                            <Hash className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{split.ratio}:1</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(split.effectiveDate)}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleRemoveSplit(split.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                    </div>
                )}

                {/* Add new split form */}
                {isAdding ? (
                    <div className="space-y-3 p-3 rounded-lg border bg-background">
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <Label htmlFor="ticker" className="text-xs">ชื่อหุ้น</Label>
                                <Input
                                    id="ticker"
                                    value={newTicker}
                                    onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                                    placeholder="AAPL"
                                    className="h-9"
                                    list="ticker-suggestions"
                                />
                                <datalist id="ticker-suggestions">
                                    {tickers.map((t) => (
                                        <option key={t} value={t} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <Label htmlFor="ratio" className="text-xs">อัตราแตก (x:1)</Label>
                                <Input
                                    id="ratio"
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={newRatio}
                                    onChange={(e) => setNewRatio(e.target.value)}
                                    placeholder="4"
                                    className="h-9"
                                />
                            </div>
                            <div>
                                <Label htmlFor="date" className="text-xs">วันที่แตก</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAdding(false)}
                                disabled={isSubmitting}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleAddSplit}
                                disabled={!newTicker || !newRatio || !newDate || isSubmitting}
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มข้อมูลการแตกหุ้น
                    </Button>
                )}

                {/* Info note */}
                <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                    💡 <strong>ตัวอย่าง:</strong> หากหุ้น AAPL แตก 4:1 หมายความว่า 1 หุ้นเดิมจะกลายเป็น 4 หุ้น
                    และราคาต่อหุ้นจะลดลง 4 เท่า
                </div>
            </CardContent>
        </Card>
    );
}
