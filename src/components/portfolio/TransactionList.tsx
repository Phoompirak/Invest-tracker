import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction, FilterOptions, PortfolioCategory, TransactionType } from "@/types/portfolio";
import { Trash2, Search, Filter, ArrowUpRight, ArrowDownRight, DollarSign, LineChart, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { StockPriceChart } from "./StockPriceChart";
import { TransactionForm } from "./TransactionForm";
import { useBackButton } from "@/hooks/useBackButton";
import { TableVirtuoso } from "react-virtuoso";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onFilter: (filters: FilterOptions) => Transaction[];
  onBulkDelete?: (ids: string[]) => Promise<{ deleted: number; notFound: number }>;
  // Helper functions needed for Edit Form
  buyTransactions: Transaction[];
  getBuyTransactionsForSale: (ticker: string) => Transaction[];
  existingCategories?: string[];
}

export function TransactionList({
  transactions,
  onDelete,
  onUpdate,
  onFilter,
  onBulkDelete,
  buyTransactions,
  getBuyTransactionsForSale,
  existingCategories = []
}: TransactionListProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    profitOnly: false,
    lossOnly: false,
  });
  const [searchTicker, setSearchTicker] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStock, setSelectedStock] = useState<{ ticker: string, currency: 'THB' | 'USD' } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (value: number, currency: string = 'THB') => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'securities': 'หลักทรัพย์',
      'long-term': 'ระยะยาว',
      'speculation': 'เก็งกำไร',
    };
    return labels[category] || category;
  };

  const handleDelete = (id: string, ticker: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการ ${ticker} นี้?`)) {
      onDelete(id);
      toast.success(`ลบรายการ ${ticker} สำเร็จ`);
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) {
      toast.error('Bulk delete not available');
      return;
    }

    try {
      // Parse IDs from text input
      // Supports formats: ['id1', 'id2'] or id1, id2 or id1\nid2
      let ids: string[] = [];
      const text = bulkDeleteIds.trim();

      if (text.startsWith('[')) {
        // JSON array format
        ids = JSON.parse(text);
      } else {
        // Comma or newline separated
        ids = text.split(/[,\n]/).map(s => s.trim().replace(/['"`]/g, '')).filter(Boolean);
      }

      if (ids.length === 0) {
        toast.error('กรุณาใส่ ID อย่างน้อย 1 รายการ');
        return;
      }

      if (!window.confirm(`ยืนยันการลบ ${ids.length} รายการ?`)) {
        return;
      }

      setIsDeleting(true);
      const result = await onBulkDelete(ids);

      toast.success(`ลบสำเร็จ ${result.deleted} รายการ` +
        (result.notFound > 0 ? `, ไม่พบ ${result.notFound} รายการ` : ''));

      setBulkDeleteOpen(false);
      setBulkDeleteIds('');
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('เกิดข้อผิดพลาด: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTransactions = transactions
    .filter(t => {
      // Basic filters
      if (searchTicker && !t.ticker.includes(searchTicker.toUpperCase())) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // P&L Filters
      if (filters.profitOnly) {
        if (t.type !== 'sell' || (t.realizedPL !== undefined && t.realizedPL <= 0)) return false;
      }
      if (filters.lossOnly) {
        if (t.type !== 'sell' || (t.realizedPL !== undefined && t.realizedPL >= 0)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // ... inside component ...

  useBackButton(!!selectedStock, (open) => !open && setSelectedStock(null));
  useBackButton(!!editingTransaction, (open) => !open && setEditingTransaction(null));

  return (
    <Card className="border-2 border-foreground shadow-sm">
      {/* Stock Chart Dialog */}
      {selectedStock && (
        <Dialog open={!!selectedStock} onOpenChange={(open) => !open && setSelectedStock(null)}>
          <DialogContent className="sm:max-w-[600px] p-0 border-0 bg-transparent shadow-none [&>button]:text-foreground/50 [&>button]:hover:text-foreground [&>button]:bg-background/20 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:p-1 [&>button]:h-8 [&>button]:w-8 [&>button]:top-2 [&>button]:right-2">
            <VisuallyHidden>
              <DialogTitle>กราฟราคาหุ้น {selectedStock.ticker}</DialogTitle>
              <DialogDescription>แสดงกราฟราคาย้อนหลังของหุ้น {selectedStock.ticker}</DialogDescription>
            </VisuallyHidden>
            <StockPriceChart ticker={selectedStock.ticker} currency={selectedStock.currency} />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-[800px] bg-background border-2 border-foreground p-0 overflow-hidden [&>button]:text-foreground [&>button]:hover:text-foreground/80 [&>button]:z-50">
            <VisuallyHidden>
              <DialogTitle>แก้ไขรายการ {editingTransaction.ticker}</DialogTitle>
              <DialogDescription>แก้ไขรายละเอียดธุรกรรมของ {editingTransaction.ticker}</DialogDescription>
            </VisuallyHidden>
            <div className="max-h-[85vh] overflow-y-auto p-6 pt-10">
              <TransactionForm
                onSubmit={() => { }} // Not used in edit mode
                onUpdate={(id, updates) => {
                  onUpdate(id, updates);
                  setEditingTransaction(null);
                }}
                buyTransactions={buyTransactions}
                getBuyTransactionsForSale={getBuyTransactionsForSale}
                initialData={editingTransaction}
                onCancel={() => setEditingTransaction(null)}
                existingCategories={existingCategories}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete Dialog */}
      {onBulkDelete && (
        <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <DialogContent className="sm:max-w-[500px] bg-background border-2 border-foreground">
            <DialogHeader>
              <DialogTitle>🗑️ ลบรายการแบบ Bulk</DialogTitle>
              <DialogDescription>
                ใส่ ID ของรายการที่ต้องการลบ (รองรับทั้ง JSON Array หรือ คั่นด้วย comma/บรรทัดใหม่)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder={`['1766908941627', '1766911164604']
หรือ
1766908941627, 1766911164604
หรือ
1766908941627
1766911164604`}
                value={bulkDeleteIds}
                onChange={(e) => setBulkDeleteIds(e.target.value)}
                className="min-h-[150px] font-mono text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={isDeleting}>
                  ยกเลิก
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isDeleting || !bulkDeleteIds.trim()}
                >
                  {isDeleting ? 'กำลังลบ...' : 'ลบทั้งหมด'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <CardHeader className="border-b-2 border-foreground">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold uppercase tracking-wide">
            ประวัติการซื้อขาย
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาหุ้น..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                className="pl-10 border-2 border-foreground font-mono w-full sm:w-40"
              />
            </div>

            {/* P&L Toggle Group */}
            <div className="flex -space-x-px">
              <Button
                variant={filters.profitOnly ? "default" : "outline"}
                size="sm"
                className={`rounded-r-none border-2 ${filters.profitOnly ? 'bg-chart-2 hover:bg-chart-2/90 text-white' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, profitOnly: !prev.profitOnly, lossOnly: false }))}
              >
                Profit
              </Button>
              <Button
                variant={filters.lossOnly ? "destructive" : "outline"}
                size="sm"
                className={`rounded-l-none border-2 border-l-0 ${filters.lossOnly ? '' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, lossOnly: !prev.lossOnly, profitOnly: false }))}
              >
                Loss
              </Button>
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="border-2 border-foreground w-full sm:w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {/* Default ones first if needed, or just sort all */}
                {Array.from(new Set(['securities', 'long-term', 'speculation', ...existingCategories]))
                  .filter(c => c && c.trim() !== '') // Filter out empty strings
                  .map(c => (
                    <SelectItem key={c} value={c}>
                      {getCategoryLabel(c)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Bulk Delete Button */}
            {onBulkDelete && (
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                ลบ Bulk
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto" style={{ height: Math.min(filteredTransactions.length * 60 + 48, 600) }}>
          <TableVirtuoso
            style={{ height: '100%' }}
            data={filteredTransactions}
            fixedHeaderContent={() => (
              <TableRow className="border-b-2 border-foreground bg-secondary">
                <TableHead className="font-bold uppercase">วันที่</TableHead>
                <TableHead className="font-bold uppercase">ประเภท</TableHead>
                <TableHead className="font-bold uppercase">สัญลักษณ์</TableHead>
                <TableHead className="font-bold uppercase text-right">จำนวน</TableHead>
                <TableHead className="font-bold uppercase text-right">ราคา</TableHead>
                <TableHead className="font-bold uppercase text-right">มูลค่า</TableHead>
                <TableHead className="font-bold uppercase text-right">ค่าธรรมเนียม/ภาษี</TableHead>
                <TableHead className="font-bold uppercase text-right">กำไร/ขาดทุน</TableHead>
                <TableHead className="font-bold uppercase text-center">หมวดหมู่</TableHead>
                <TableHead className="font-bold uppercase text-center">จัดการ</TableHead>
              </TableRow>
            )}
            components={{
              Table: React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>((props, ref) => <Table {...props} ref={ref} />),
              TableHead: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => <TableHeader {...props} ref={ref} />),
              TableRow: React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>((props, ref) => <TableRow {...props} ref={ref} className="border-b border-border hover:bg-secondary/50" />),
              TableBody: React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>((props, ref) => <TableBody {...props} ref={ref} />),
            }}
            itemContent={(index, transaction) => {
              const currency = transaction.currency || 'THB';
              return (
                <>
                  <TableCell className="font-mono text-sm">
                    {formatDate(transaction.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-2 font-bold uppercase ${transaction.type === 'buy'
                        ? 'border-green-500 text-green-500 bg-green-500/10'
                        : transaction.type === 'sell'
                          ? 'border-red-500 text-red-500 bg-red-500/10'
                          : 'border-amber-500 text-amber-600 bg-amber-50'
                        }`}
                    >
                      {transaction.type === 'buy' ? (
                        <><ArrowUpRight className="h-3 w-3 mr-1" /> ซื้อ</>
                      ) : transaction.type === 'sell' ? (
                        <><ArrowDownRight className="h-3 w-3 mr-1" /> ขาย</>
                      ) : (
                        <><DollarSign className="h-3 w-3 mr-1" /> ปันผล</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold font-mono text-lg">
                    <Button
                      variant="link"
                      className="p-0 h-auto font-bold font-mono text-lg uppercase decoration-primary hover:text-primary"
                      onClick={() => setSelectedStock({ ticker: transaction.ticker, currency })}
                    >
                      {transaction.ticker} <LineChart className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {transaction.shares.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {currency === 'USD' ? '$' : '฿'}{transaction.pricePerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(transaction.totalValue, currency)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {transaction.type === 'dividend' && transaction.withholdingTax ? (
                      <span className="text-amber-600/70" title="ภาษีหัก ณ ที่จ่าย">
                        {formatCurrency(transaction.withholdingTax, currency)}
                      </span>
                    ) : (
                      formatCurrency(transaction.commission, currency)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.type === 'sell' && transaction.realizedPL !== undefined ? (
                      <span className={`font-mono font-medium ${transaction.realizedPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(transaction.realizedPL, currency)}
                        <span className="block text-xs">
                          ({transaction.realizedPL >= 0 ? '+' : ''}{transaction.realizedPLPercent?.toFixed(2)}%)
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-2 font-medium">
                      {getCategoryLabel(transaction.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTransaction(transaction)}
                        className="hover:bg-primary/20 hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id, transaction.ticker)}
                        className="hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              );
            }}
          />
          {filteredTransactions.length === 0 && (
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    ไม่พบรายการซื้อขาย
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent >
    </Card >
  );
}
