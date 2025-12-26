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
import { Transaction, FilterOptions, PortfolioCategory } from "@/types/portfolio";
import { Trash2, Search, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onFilter: (filters: FilterOptions) => Transaction[];
}

export function TransactionList({ transactions, onDelete, onFilter }: TransactionListProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    profitOnly: false,
    lossOnly: false,
  });
  const [searchTicker, setSearchTicker] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
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
    onDelete(id);
    toast.success(`ลบรายการ ${ticker} สำเร็จ`);
  };

  const filteredTransactions = transactions
    .filter(t => {
      if (searchTicker && !t.ticker.includes(searchTicker.toUpperCase())) return false;
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Card className="border-2 border-foreground shadow-sm">
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
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="border-b border-border hover:bg-secondary/50">
                  <TableCell className="font-mono text-sm">
                    {formatDate(transaction.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`border-2 font-bold uppercase ${
                        transaction.type === 'buy' 
                          ? 'border-chart-2 text-chart-2 bg-chart-2/10' 
                          : 'border-destructive text-destructive bg-destructive/10'
                      }`}
                    >
                      {transaction.type === 'buy' ? (
                        <><ArrowUpRight className="h-3 w-3 mr-1" /> ซื้อ</>
                      ) : (
                        <><ArrowDownRight className="h-3 w-3 mr-1" /> ขาย</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold font-mono text-lg">
                    {transaction.ticker}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {transaction.shares.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ฿{transaction.pricePerShare.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(transaction.totalValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatCurrency(transaction.commission)}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.type === 'sell' && transaction.realizedPL !== undefined ? (
                      <span className={`font-mono font-medium ${
                        transaction.realizedPL >= 0 ? 'text-chart-2' : 'text-destructive'
                      }`}>
                        {formatCurrency(transaction.realizedPL)}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id, transaction.ticker)}
                      className="hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
      </CardContent>
    </Card>
  );
}
