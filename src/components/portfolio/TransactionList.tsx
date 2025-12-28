import { useState } from "react";
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
import { Trash2, Search, Filter, ArrowUpRight, ArrowDownRight, DollarSign, LineChart, Edit } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { StockPriceChart } from "./StockPriceChart";
import { TransactionForm } from "./TransactionForm";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onFilter: (filters: FilterOptions) => Transaction[];
  // Helper functions needed for Edit Form
  buyTransactions: Transaction[];
  getBuyTransactionsForSale: (ticker: string) => Transaction[];
}

export function TransactionList({
  transactions,
  onDelete,
  onUpdate,
  onFilter,
  buyTransactions,
  getBuyTransactionsForSale
}: TransactionListProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    profitOnly: false,
    lossOnly: false,
  });
  const [searchTicker, setSearchTicker] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStock, setSelectedStock] = useState<{ ticker: string, currency: 'THB' | 'USD' } | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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

  return (
    <Card className="border-2 border-foreground shadow-sm">
      {/* Stock Chart Dialog */}
      {selectedStock && (
        <Dialog open={!!selectedStock} onOpenChange={(open) => !open && setSelectedStock(null)}>
          <DialogContent className="sm:max-w-[600px] p-0 border-0 bg-transparent shadow-none">
            <StockPriceChart ticker={selectedStock.ticker} currency={selectedStock.currency} />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Transaction Dialog */}
      {editingTransaction && (
        <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-[800px] bg-background border-2 border-foreground p-0 overflow-hidden">
            <div className="max-h-[85vh] overflow-y-auto p-6">
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
              />
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
                <SelectItem value="securities">หลักทรัพย์</SelectItem>
                <SelectItem value="long-term">ระยะยาว</SelectItem>
                <SelectItem value="speculation">เก็งกำไร</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-foreground bg-secondary">
                <TableHead className="font-bold uppercase">วันที่</TableHead>
                <TableHead className="font-bold uppercase">ประเภท</TableHead>
                <TableHead className="font-bold uppercase">สัญลักษณ์</TableHead>
                <TableHead className="font-bold uppercase text-right">จำนวน</TableHead>
                <TableHead className="font-bold uppercase text-right">ราคา</TableHead>
                <TableHead className="font-bold uppercase text-right">มูลค่า</TableHead>
                <TableHead className="font-bold uppercase text-right">ค่าธรรมเนียม</TableHead>
                <TableHead className="font-bold uppercase text-right">กำไร/ขาดทุน</TableHead>
                <TableHead className="font-bold uppercase text-center">หมวดหมู่</TableHead>
                <TableHead className="font-bold uppercase text-center">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                const currency = transaction.currency || 'THB';
                return (
                  <TableRow key={transaction.id} className="border-b border-border hover:bg-secondary/50">
                    <TableCell className="font-mono text-sm">
                      {formatDate(transaction.timestamp)}
                    </TableCell>
                    <TableCell>
                      {/* ... Badge logic ... */}
                      <Badge
                        variant="outline"
                        className={`border-2 font-bold uppercase ${transaction.type === 'buy'
                          ? 'border-chart-2 text-chart-2 bg-chart-2/10'
                          : transaction.type === 'sell'
                            ? 'border-destructive text-destructive bg-destructive/10'
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
                      {formatCurrency(transaction.commission, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'sell' && transaction.realizedPL !== undefined ? (
                        <span className={`font-mono font-medium ${transaction.realizedPL >= 0 ? 'text-chart-2' : 'text-destructive'
                          }`}>
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
                  </TableRow>
                )
              })}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    ไม่พบรายการซื้อขาย
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent >
    </Card >
  );
}
