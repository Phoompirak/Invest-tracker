import { useState, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionType, PortfolioCategory, Transaction } from "@/types/portfolio";
import { toast } from "sonner";
import { Plus, Minus, DollarSign } from "lucide-react";

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
    relatedBuyId?: string,
    withholdingTax?: number,
    currency?: 'THB' | 'USD',
    manualRealizedPL?: number
  ) => void;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  onImport?: (data: ImportData[]) => Promise<{ added: number; skipped: number }>;
  buyTransactions: Transaction[];
  getBuyTransactionsForSale: (ticker: string) => Transaction[];
  initialData?: Transaction | null;
  onCancel?: () => void;
}

export function TransactionForm({
  onSubmit,
  onUpdate,
  onImport,
  buyTransactions,
  getBuyTransactionsForSale,
  initialData,
  onCancel
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'buy');
  const [ticker, setTicker] = useState(initialData?.ticker || '');
  const [shares, setShares] = useState(initialData?.shares.toString() || '');
  const [price, setPrice] = useState(initialData?.pricePerShare.toString() || '');
  const [commission, setCommission] = useState(initialData?.commission.toString() || '');
  const [category, setCategory] = useState<PortfolioCategory>(initialData?.category || 'securities');
  const [relatedBuyId, setRelatedBuyId] = useState(initialData?.relatedBuyId || '');

  const availableBuys = ticker ? getBuyTransactionsForSale(ticker) : [];
  const isEditing = !!initialData;

  // Manual P&L override
  // Default to TRUE for new sell transactions (to support Auto-FIFO default)
  const isSell = type === 'sell';
  const [useManualPL, setUseManualPL] = useState(isEditing ? (!!initialData?.realizedPL && !initialData?.relatedBuyId) : true);
  const [manualPL, setManualPL] = useState(initialData?.realizedPL?.toString() || '');

  // Reset useManualPL when type changes to sell (if not editing)
  useEffect(() => {
    if (type === 'sell' && !isEditing) {
      setUseManualPL(true);
    }
  }, [type, isEditing]);

  // Date/Time handling
  const initialDate = initialData ? new Date(initialData.timestamp) : new Date();
  const [date, setDate] = useState(initialDate.toISOString().split('T')[0]);
  const [time, setTime] = useState(initialDate.toTimeString().slice(0, 5));

  const [withholdingTax, setWithholdingTax] = useState(initialData?.withholdingTax?.toString() || '');
  const [currency, setCurrency] = useState<'THB' | 'USD'>(initialData?.currency || 'THB');

  // New: Input Mode (Units vs Amount)
  const [inputMode, setInputMode] = useState<'units' | 'amount'>('units');
  const [totalAmount, setTotalAmount] = useState('');

  const handleTotalAmountChange = (value: string) => {
    setTotalAmount(value);
    // Auto-calculate shares if price is set
    if (value && price && parseFloat(price) > 0) {
      const calculatedShares = parseFloat(value) / parseFloat(price);
      setShares(calculatedShares.toFixed(6)); // Keep 6 decimals for precision (Gold/Crypto)
    } else {
      setShares('');
    }
  };

  const handlePriceChange = (value: string) => {
    setPrice(value);
    if (inputMode === 'amount' && totalAmount && parseFloat(value) > 0) {
      const calculatedShares = parseFloat(totalAmount) / parseFloat(value);
      setShares(calculatedShares.toFixed(6));
    } else if (inputMode === 'units' && shares && parseFloat(value) > 0) {
      // Just update visual total if needed, but no state change for other fields
    }
  };

  // Auto-Calculate FIFO P&L Effect
  useEffect(() => {
    if (type === 'sell' && useManualPL && ticker && shares && price && parseFloat(shares) > 0) {
      const calculateFIFO = () => {
        const sellShares = parseFloat(shares);
        const sellTotalValue = parseFloat(price) * sellShares;
        let remainingSharesToSell = sellShares;
        let totalCost = 0;

        // Get buys sorted by date (Oldest first)
        const sortedBuys = [...availableBuys].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const buy of sortedBuys) {
          if (remainingSharesToSell <= 0) break;

          const usedShares = Math.min(buy.shares, remainingSharesToSell);
          const costChunk = usedShares * buy.pricePerShare;

          totalCost += costChunk;
          remainingSharesToSell -= usedShares;
        }

        //  if (remainingSharesToSell > 0.000001) {
        //    // Don't toast on every keystroke, maybe just show warning in UI?
        //  }

        const calculatedPL = sellTotalValue - totalCost - (parseFloat(commission) || 0);
        setManualPL(calculatedPL.toFixed(2));
      };

      // Debounce slightly to avoid heavy recalc on every keystroke? FIFO is cheap.
      calculateFIFO();
    }
  }, [type, useManualPL, ticker, shares, price, commission, availableBuys]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ticker.trim()) {
      toast.error('กรุณากรอกสัญลักษณ์หุ้น');
      return;
    }

    if (type === 'dividend') {
      if (!price || parseFloat(price) <= 0) {
        toast.error('กรุณากรอกจำนวนเงินปันผล');
        return;
      }
    } else {
      if (!shares || parseFloat(shares) <= 0) {
        toast.error('กรุณากรอกจำนวนหุ้น / น้ำหนัก');
        return;
      }
      if (!price || parseFloat(price) <= 0) {
        toast.error('กรุณากรอกราคา');
        return;
      }
    }

    const timestamp = new Date(`${date}T${time}`);
    const finalShares = type === 'dividend' ? 0 : parseFloat(shares);
    const finalPrice = parseFloat(price);
    const finalCommission = type === 'dividend' ? 0 : (parseFloat(commission) || 0);
    const finalWithholdingTax = type === 'dividend' ? (parseFloat(withholdingTax) || 0) : undefined;
    const finalTicker = ticker.toUpperCase().trim();
    const finalManualPL = (type === 'sell' && useManualPL && manualPL) ? parseFloat(manualPL) : undefined;

    if (isEditing && onUpdate && initialData) {
      // Helper to recalc PL if manual
      let updatePayload: any = {
        ticker: finalTicker,
        type,
        shares: finalShares,
        pricePerShare: finalPrice,
        commission: finalCommission,
        timestamp,
        category,
        relatedBuyId: (type === 'sell' && !useManualPL) ? relatedBuyId : undefined,
        withholdingTax: finalWithholdingTax,
        currency,
        totalValue: type === 'dividend' ? finalPrice : finalShares * finalPrice,
      };

      if (type === 'sell') {
        if (useManualPL && finalManualPL !== undefined) {
          updatePayload.realizedPL = finalManualPL;
          // Recalculate percent logic (optional, simpler to just updating PL)
          const totalValue = finalShares * finalPrice;
          const impliedCost = totalValue - finalManualPL - finalCommission;
          if (impliedCost > 0) {
            updatePayload.realizedPLPercent = (finalManualPL / impliedCost) * 100;
          }
        }
      }

      onUpdate(initialData.id, updatePayload);
      toast.success(`แก้ไขรายการ ${finalTicker} สำเร็จ`);
      if (onCancel) onCancel();
    } else {
      onSubmit(
        finalTicker,
        type,
        finalShares,
        finalPrice,
        finalCommission,
        timestamp,
        category,
        (type === 'sell' && !useManualPL) ? relatedBuyId : undefined,
        finalWithholdingTax,
        currency,
        finalManualPL
      );

      const messages: Record<TransactionType, string> = {
        buy: 'บันทึกการซื้อ',
        sell: 'บันทึกการขาย',
        dividend: 'บันทึกเงินปันผล',
      };
      toast.success(`${messages[type]} ${finalTicker} สำเร็จ`);

      // Reset form
      setTicker('');
      setShares('');
      setPrice('');
      setCommission('');
      setRelatedBuyId('');
      setWithholdingTax('');
      setCurrency('THB');
      setTotalAmount('');
      setInputMode('units');
      setManualPL('');
      setUseManualPL(false);
    }
  };

  const getButtonStyle = () => {
    if (isEditing) return 'bg-primary hover:bg-primary/90 text-primary-foreground';
    switch (type) {
      case 'buy': return 'bg-chart-2 hover:bg-chart-2/90 text-foreground';
      case 'sell': return 'bg-destructive hover:bg-destructive/90';
      case 'dividend': return 'bg-amber-500 hover:bg-amber-600 text-white';
    }
  };

  const getButtonText = () => {
    if (isEditing) return 'บันทึกการแก้ไข';
    switch (type) {
      case 'buy': return 'บันทึกการซื้อ';
      case 'sell': return 'บันทึกการขาย';
      case 'dividend': return 'บันทึกเงินปันผล';
    }
  };

  return (
    <Card className={`border-2 border-foreground shadow-sm ${isEditing ? 'border-0 shadow-none' : ''}`}>
      {!isEditing && (
        <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold uppercase tracking-wide">
            บันทึกรายการซื้อขาย
          </CardTitle>
          {onImport && <ImportDialog onImport={onImport} />}
        </CardHeader>
      )}
      <CardContent className="pt-6">
        <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
          <TabsList className="grid w-full grid-cols-3 border-2 border-foreground">
            <TabsTrigger value="buy" className="data-[state=active]:bg-chart-2 data-[state=active]:text-foreground font-bold uppercase">
              <Plus className="h-4 w-4 mr-2" />
              ซื้อ
            </TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground font-bold uppercase">
              <Minus className="h-4 w-4 mr-2" />
              ขาย
            </TabsTrigger>
            <TabsTrigger value="dividend" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white font-bold uppercase">
              <DollarSign className="h-4 w-4 mr-2" />
              ปันผล
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
                  placeholder="เช่น PTT, SCB, GOLD"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="border-2 border-foreground font-mono uppercase"
                />
              </div>

              {type !== 'dividend' && (
                <div className="space-y-2">
                  {/* Input Mode Switcher */}
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="shares" className="font-bold uppercase text-sm">
                      {inputMode === 'units' ? 'จำนวนหุ้น / น้ำหนัก' : `จำนวนเงินรวม (${currency})`}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setInputMode(prev => prev === 'units' ? 'amount' : 'units')}
                      className="text-xs text-primary underline hover:text-primary/80"
                    >
                      {inputMode === 'units' ? 'เปลี่ยนเป็นระบุเงินรวม' : 'เปลี่ยนเป็นระบุจำนวน'}
                    </button>
                  </div>

                  {inputMode === 'units' ? (
                    <Input
                      id="shares"
                      type="number"
                      placeholder="100"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      className="border-2 border-foreground font-mono"
                    />
                  ) : (
                    <Input
                      id="totalAmount"
                      type="number"
                      placeholder="50000"
                      value={totalAmount}
                      onChange={(e) => handleTotalAmountChange(e.target.value)}
                      className="border-2 border-foreground font-mono"
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="price" className="font-bold uppercase text-sm">
                  {type === 'dividend' ? 'จำนวนเงินปันผล' : 'ราคา / หน่วย'} ({currency})
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder={type === 'dividend' ? '1250.00' : '35.50'}
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="border-2 border-foreground font-mono flex-1"
                  />
                  <Select value={currency} onValueChange={(v) => setCurrency(v as 'THB' | 'USD')}>
                    <SelectTrigger className="w-[80px] border-2 border-foreground font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THB">THB</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {type === 'dividend' && (
                <div className="space-y-2">
                  <Label htmlFor="withholdingTax" className="font-bold uppercase text-sm">
                    ภาษีหัก ณ ที่จ่าย ({currency})
                  </Label>
                  <Input
                    id="withholdingTax"
                    type="number"
                    step="0.01"
                    placeholder="125.00"
                    value={withholdingTax}
                    onChange={(e) => setWithholdingTax(e.target.value)}
                    className="border-2 border-foreground font-mono"
                  />
                </div>
              )}

              {type !== 'dividend' && (
                <div className="space-y-2">
                  <Label htmlFor="commission" className="font-bold uppercase text-sm">
                    ค่าธรรมเนียม ({currency})
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
              )}

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

              {type === 'sell' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold uppercase text-sm">การคำนวณกำไร/ขาดทุน</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="useManualPL"
                        checked={useManualPL}
                        onChange={(e) => setUseManualPL(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="useManualPL" className="text-xs cursor-pointer select-none">ระบุกำไรเอง (ไม่ต้องเชื่อมรายการ)</label>
                    </div>
                  </div>

                  {useManualPL ? (
                    <div>
                      <Input
                        id="manualPL"
                        type="number"
                        step="0.01"
                        placeholder="ระบบคำนวณอัตโนมัติ (FIFO)..."
                        value={manualPL}
                        onChange={(e) => setManualPL(e.target.value)}
                        className={`border-2 font-mono ${parseFloat(manualPL) >= 0 ? 'border-chart-2 text-chart-2' : 'border-destructive text-destructive'}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">* ระบบคำนวณกำไร/ขาดทุน (FIFO) ให้อัตโนมัติจากประวัติการซื้อ (สามารถแก้เองได้)</p>
                    </div>
                  ) : (
                    availableBuys.length > 0 ? (
                      <Select value={relatedBuyId} onValueChange={setRelatedBuyId}>
                        <SelectTrigger className="border-2 border-foreground">
                          <SelectValue placeholder="เลือกรายการซื้อเพื่อคำนวณกำไร" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBuys.map((buy) => (
                            <SelectItem key={buy.id} value={buy.id}>
                              {buy.shares} หุ้น @ {buy.currency === 'USD' ? '$' : '฿'}{buy.pricePerShare.toFixed(2)} ({new Date(buy.timestamp).toLocaleDateString('th-TH')})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground border-2 border-dashed border-gray-300 p-2 rounded text-center">
                        ไม่มีรายการซื้อที่เชื่อมโยงได้
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Show total for buy/sell */}
            {type !== 'dividend' && shares && price && (
              <div className="p-4 border-2 border-foreground bg-secondary">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase">มูลค่ารวม:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono block">
                      {currency === 'USD' ? '$' : '฿'}{(parseFloat(shares) * parseFloat(price) + (parseFloat(commission) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                    {inputMode === 'amount' && (
                      <span className="text-sm text-muted-foreground">
                        (ได้จำนวน {shares} หน่วย)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show net dividend for dividend transactions */}
            {type === 'dividend' && price && (
              <div className="p-4 border-2 border-amber-500 bg-amber-50 dark:bg-amber-950">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase">เงินปันผลสุทธิ:</span>
                  <span className="text-2xl font-bold font-mono text-amber-600">
                    {currency === 'USD' ? '$' : '฿'}{(parseFloat(price) - (parseFloat(withholdingTax) || 0)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-2 border-foreground font-bold uppercase text-lg py-6"
                  onClick={onCancel}
                >
                  ยกเลิก
                </Button>
              )}
              <Button
                type="submit"
                className={`flex-1 border-2 border-foreground font-bold uppercase text-lg py-6 ${getButtonStyle()}`}
              >
                {getButtonText()}
              </Button>
            </div>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
}
