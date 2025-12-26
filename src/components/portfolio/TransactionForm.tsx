import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionType, PortfolioCategory, Transaction } from "@/types/portfolio";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";

import { ImportDialog, ImportData } from "./ImportDialog";

export interface TransactionFormProps {
  onSubmit: (
    ticker: string,
    type: TransactionType,
    shares: number,
    pricePerShare: number,
    commission: number,
    timestamp: Date,
    category: PortfolioCategory,
    relatedBuyId?: string
  ) => void;
  onImport: (data: ImportData[]) => Promise<void>;
  buyTransactions: Transaction[];
  getBuyTransactionsForSale: (ticker: string) => Transaction[];
}

export function TransactionForm({ onSubmit, onImport, buyTransactions, getBuyTransactionsForSale }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('buy');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [commission, setCommission] = useState('');
  const [category, setCategory] = useState<PortfolioCategory>('securities');
  const [relatedBuyId, setRelatedBuyId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  const availableBuys = ticker ? getBuyTransactionsForSale(ticker) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticker.trim()) {
      toast.error('กรุณากรอกสัญลักษณ์หุ้น');
      return;
    }
    if (!shares || parseFloat(shares) <= 0) {
      toast.error('กรุณากรอกจำนวนหุ้น');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error('กรุณากรอกราคา');
      return;
    }

    const timestamp = new Date(`${date}T${time}`);

    onSubmit(
      ticker.toUpperCase().trim(),
      type,
      parseFloat(shares),
      parseFloat(price),
      parseFloat(commission) || 0,
      timestamp,
      category,
      type === 'sell' ? relatedBuyId : undefined
    );

    toast.success(`${type === 'buy' ? 'บันทึกการซื้อ' : 'บันทึกการขาย'} ${ticker.toUpperCase()} สำเร็จ`);

    // Reset form
    setTicker('');
    setShares('');
    setPrice('');
    setCommission('');
    setRelatedBuyId('');
  };

  return (
    <Card className="border-2 border-foreground shadow-sm">
      <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold uppercase tracking-wide">
          บันทึกรายการซื้อขาย
        </CardTitle>
        <ImportDialog onImport={onImport} />
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
          <TabsList className="grid w-full grid-cols-2 border-2 border-foreground">
            <TabsTrigger value="buy" className="data-[state=active]:bg-chart-2 data-[state=active]:text-foreground font-bold uppercase">
              <Plus className="h-4 w-4 mr-2" />
              ซื้อ (Buy)
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground font-bold uppercase">
              <Minus className="h-4 w-4 mr-2" />
              ขาย (Sell)
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticker" className="font-bold uppercase text-sm">
                  สัญลักษณ์หุ้น (Ticker)
                </Label>
                <Input
                  id="ticker"
                  placeholder="เช่น PTT, SCB, KBANK"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="border-2 border-foreground font-mono uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shares" className="font-bold uppercase text-sm">
                  จำนวนหุ้น
                </Label>
                <Input
                  id="shares"
                  type="number"
                  placeholder="100"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="border-2 border-foreground font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="font-bold uppercase text-sm">
                  ราคา / หุ้น (บาท)
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="35.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="border-2 border-foreground font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commission" className="font-bold uppercase text-sm">
                  ค่าธรรมเนียม (บาท)
                </Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  placeholder="15"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="border-2 border-foreground font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="font-bold uppercase text-sm">
                  วันที่
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border-2 border-foreground font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="font-bold uppercase text-sm">
                  เวลา
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="border-2 border-foreground font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="font-bold uppercase text-sm">
                  หมวดหมู่พอร์ต
                </Label>
                <Select value={category} onValueChange={(v) => setCategory(v as PortfolioCategory)}>
                  <SelectTrigger className="border-2 border-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="securities">หลักทรัพย์</SelectItem>
                    <SelectItem value="long-term">พอร์ตระยะยาว</SelectItem>
                    <SelectItem value="speculation">พอร์ตเก็งกำไร</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === 'sell' && availableBuys.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="relatedBuy" className="font-bold uppercase text-sm">
                    เชื่อมรายการซื้อ (ถ้ามี)
                  </Label>
                  <Select value={relatedBuyId} onValueChange={setRelatedBuyId}>
                    <SelectTrigger className="border-2 border-foreground">
                      <SelectValue placeholder="เลือกรายการซื้อ" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBuys.map((buy) => (
                        <SelectItem key={buy.id} value={buy.id}>
                          {buy.shares} หุ้น @ ฿{buy.pricePerShare.toFixed(2)} ({new Date(buy.timestamp).toLocaleDateString('th-TH')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {shares && price && (
              <div className="p-4 border-2 border-foreground bg-secondary">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase">มูลค่ารวม:</span>
                  <span className="text-2xl font-bold font-mono">
                    ฿{(parseFloat(shares) * parseFloat(price) + (parseFloat(commission) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className={`w-full border-2 border-foreground font-bold uppercase text-lg py-6 ${type === 'buy'
                  ? 'bg-chart-2 hover:bg-chart-2/90 text-foreground'
                  : 'bg-destructive hover:bg-destructive/90'
                }`}
            >
              {type === 'buy' ? 'บันทึกการซื้อ' : 'บันทึกการขาย'}
            </Button>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
