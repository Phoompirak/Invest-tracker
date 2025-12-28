import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FileUp, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PortfolioCategory, TransactionType } from '@/types/portfolio';

// Simplified transaction interface for import
export interface ImportData {
    ticker: string;
    type: TransactionType;
    shares: number;
    price: number;
    date: string; // ISO date string YYYY-MM-DD
    commission?: number;
    category?: PortfolioCategory;
    currency?: 'THB' | 'USD';
}

interface ImportDialogProps {
    onImport: (data: ImportData[]) => Promise<{ added: number; skipped: number }>;
}

export function ImportDialog({ onImport }: ImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const exampleJson = `[
  {
    "ticker": "PTT",
    "type": "buy",
    "shares": 100,
    "price": 35.50,
    "date": "2024-01-01",
    "commission": 50,
    "category": "long-term",
    "currency": "THB"
  }
]`;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setJsonText(content);
            setError(null);
            setSuccess(null);
        };
        reader.readAsText(file);
    };

    const validateAndParse = (text: string): ImportData[] => {
        try {
            const data = JSON.parse(text);
            if (!Array.isArray(data)) throw new Error('Root must be an array');

            return data.map((item: any, index: number) => {
                const ticker = item.ticker;
                const type = item.type;
                const shares = item.shares;
                // Support both 'price' and 'pricePerShare'
                const price = item.price !== undefined ? item.price : item.pricePerShare;
                // Support both 'date' and 'timestamp'
                const date = item.date || item.timestamp;

                if (!ticker) throw new Error(`Item ${index + 1}: Missing ticker`);
                if (!type) throw new Error(`Item ${index + 1}: Missing type`);
                if (shares === undefined) throw new Error(`Item ${index + 1}: Missing shares`);
                if (price === undefined) throw new Error(`Item ${index + 1}: Missing price`);
                if (!date) throw new Error(`Item ${index + 1}: Missing date`);

                return {
                    ticker: String(ticker).toUpperCase(),
                    type: String(type).toLowerCase() as TransactionType,
                    shares: Number(shares),
                    price: Number(price),
                    date: String(date),
                    commission: Number(item.commission || 0),
                    category: (item.category || 'long-term') as PortfolioCategory,
                    currency: (item.currency || 'THB') as 'THB' | 'USD',
                };
            });
        } catch (e) {
            if (e instanceof Error) {
                throw new Error(`Invalid JSON format: ${e.message}`);
            }
            throw new Error('Invalid JSON format');
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        setError(null);
        setSuccess(null);

        try {
            const data = validateAndParse(jsonText);
            const result = await onImport(data);

            if (result.skipped > 0) {
                setSuccess(`นำเข้าสำเร็จ ${result.added} รายการ (ข้ามรายการซ้ำ ${result.skipped} รายการ)`);
            } else {
                setSuccess(`นำเข้าสำเร็จ ${result.added} รายการ`);
            }

            setJsonText('');
            setTimeout(() => setOpen(false), 3000);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError('Failed to import data');
            }
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    นำเข้าข้อมูล (Import)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>นำเข้าข้อมูล (Import JSON)</DialogTitle>
                    <DialogDescription>
                        วางข้อมูล JSON หรืออัปโหลดไฟล์ .json เพื่อเพิ่มรายการจำนวนมาก
                    </DialogDescription>
                </DialogHeader>

                {/* Text JSON Area */}
                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="relative cursor-pointer" asChild>
                            <label>
                                <FileUp className="w-4 h-4 mr-2" />
                                อัปโหลดไฟล์ JSON
                                <input
                                    type="file"
                                    accept=".json,application/json"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            หรือวางข้อความด้านล่าง
                        </span>
                    </div>

                    <Textarea
                        placeholder={exampleJson}
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        className="h-[300px] font-mono text-xs"
                    />

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-emerald-50 text-emerald-900 border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <AlertTitle>Success</AlertTitle>
                            <AlertDescription>{success}</AlertDescription>
                        </Alert>
                    )}
                </div>
                <span className="text-sm text-muted-foreground">
                    {jsonText && (() => {
                        try {
                            const parsed = JSON.parse(jsonText);
                            return Array.isArray(parsed) ? `จำนวนรายการ: ${parsed.length} รายการ` : '';
                        } catch {
                            return '';
                        }
                    })()}
                </span>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        ยกเลิก
                    </Button>
                    <Button onClick={handleImport} disabled={!jsonText || isImporting}>
                        {isImporting ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
