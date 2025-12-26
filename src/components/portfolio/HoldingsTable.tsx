import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Holding } from "@/types/portfolio";
import { TrendingUp, TrendingDown } from "lucide-react";

interface HoldingsTableProps {
  holdings: Holding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'securities': 'หลักทรัพย์',
      'long-term': 'ระยะยาว',
      'speculation': 'เก็งกำไร',
    };
    return labels[category] || category;
  };

  return (
    <Card className="border-2 border-foreground shadow-sm">
      <CardHeader className="border-b-2 border-foreground">
        <CardTitle className="text-xl font-bold uppercase tracking-wide">
          หุ้นที่ถือครอง
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-foreground bg-secondary">
                <TableHead className="font-bold uppercase">สัญลักษณ์</TableHead>
                <TableHead className="font-bold uppercase text-right">จำนวนหุ้น</TableHead>
                <TableHead className="font-bold uppercase text-right">ต้นทุนเฉลี่ย</TableHead>
                <TableHead className="font-bold uppercase text-right">ราคาปัจจุบัน</TableHead>
                <TableHead className="font-bold uppercase text-right">มูลค่าตลาด</TableHead>
                <TableHead className="font-bold uppercase text-right">กำไร/ขาดทุน</TableHead>
                <TableHead className="font-bold uppercase text-center">หมวดหมู่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((holding) => (
                <TableRow key={holding.ticker} className="border-b border-border hover:bg-secondary/50">
                  <TableCell className="font-bold font-mono text-lg">
                    {holding.ticker}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {holding.totalShares.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(holding.averageCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(holding.currentPrice)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(holding.marketValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex items-center justify-end gap-2 ${
                      holding.unrealizedPL >= 0 ? 'text-chart-2' : 'text-destructive'
                    }`}>
                      {holding.unrealizedPL >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-mono font-medium">
                        {formatCurrency(holding.unrealizedPL)}
                      </span>
                      <span className="font-mono text-sm">
                        ({formatPercent(holding.unrealizedPLPercent)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-2 font-medium">
                      {getCategoryLabel(holding.category)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {holdings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    ไม่มีหุ้นในพอร์ต
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
