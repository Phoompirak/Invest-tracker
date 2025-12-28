import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Transaction, Holding, PortfolioSummary } from "@/types/portfolio";
import { Download, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportToolsProps {
    transactions: Transaction[];
    holdings: Holding[];
    summary: PortfolioSummary;
    exchangeRate: number;
}

export function ExportTools({ transactions, holdings, summary, exchangeRate }: ExportToolsProps) {

    const getExportData = () => {
        return {
            exportDate: new Date().toISOString(),
            exchangeRate,
            summary: {
                totalValue: summary.totalValue,
                totalInvested: summary.totalInvested,
                totalRealizedPL: summary.totalRealizedPL,
                totalUnrealizedPL: summary.totalUnrealizedPL,
                totalDividends: summary.totalDividends,
                totalPL: summary.totalPL,
                totalPLPercent: summary.totalPLPercent,
            },
            holdings: holdings.map(h => ({
                ticker: h.ticker,
                category: h.category,
                shares: h.totalShares,
                averageCost: h.averageCost,
                currentPrice: h.currentPrice,
                marketValue: h.marketValue,
                unrealizedPL: h.unrealizedPL,
                unrealizedPLPercent: h.unrealizedPLPercent,
            })),
            transactions: transactions.map(t => ({
                id: t.id,
                date: new Date(t.timestamp).toISOString(),
                type: t.type,
                ticker: t.ticker,
                shares: t.shares,
                pricePerShare: t.pricePerShare,
                totalValue: t.totalValue,
                commission: t.commission,
                category: t.category,
                currency: t.currency,
                realizedPL: t.realizedPL,
                withholdingTax: t.withholdingTax,
            })),
        };
    };

    const exportJSON = () => {
        try {
            const data = getExportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `portfolio_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('ดาวน์โหลดไฟล์ JSON สำเร็จ!');
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการส่งออก JSON');
            console.error(error);
        }
    };

    const exportExcel = () => {
        try {
            const data = getExportData();

            // Create workbook
            const wb = XLSX.utils.book_new();

            // Summary sheet
            const summaryData = [
                ['วันที่ส่งออก', data.exportDate],
                ['อัตราแลกเปลี่ยน', data.exchangeRate],
                [''],
                ['มูลค่าพอร์ตรวม', data.summary.totalValue],
                ['ต้นทุนรวม', data.summary.totalInvested],
                ['กำไร/ขาดทุนทางบัญชี', data.summary.totalUnrealizedPL],
                ['กำไรที่รับรู้แล้ว', data.summary.totalRealizedPL],
                ['เงินปันผล', data.summary.totalDividends],
                ['กำไรสุทธิ', data.summary.totalPL],
                ['ผลตอบแทน %', `${data.summary.totalPLPercent.toFixed(2)}%`],
            ];
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'สรุปพอร์ต');

            // Holdings sheet
            const holdingsHeader = ['Ticker', 'หมวดหมู่', 'จำนวน', 'ต้นทุนเฉลี่ย', 'ราคาปัจจุบัน', 'มูลค่า', 'กำไร/ขาดทุน', '%'];
            const holdingsRows = data.holdings.map(h => [
                h.ticker,
                h.category,
                h.shares,
                h.averageCost,
                h.currentPrice,
                h.marketValue,
                h.unrealizedPL,
                `${h.unrealizedPLPercent.toFixed(2)}%`,
            ]);
            const holdingsSheet = XLSX.utils.aoa_to_sheet([holdingsHeader, ...holdingsRows]);
            XLSX.utils.book_append_sheet(wb, holdingsSheet, 'สินทรัพย์');

            // Transactions sheet
            const txHeader = ['วันที่', 'ประเภท', 'Ticker', 'จำนวน', 'ราคา', 'มูลค่า', 'ค่าธรรมเนียม', 'หมวดหมู่', 'สกุลเงิน', 'กำไร/ขาดทุน'];
            const txRows = data.transactions.map(t => [
                new Date(t.date).toLocaleDateString('th-TH'),
                t.type === 'buy' ? 'ซื้อ' : t.type === 'sell' ? 'ขาย' : 'ปันผล',
                t.ticker,
                t.shares,
                t.pricePerShare,
                t.totalValue,
                t.commission || 0,
                t.category,
                t.currency || 'THB',
                t.realizedPL || '-',
            ]);
            const txSheet = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);
            XLSX.utils.book_append_sheet(wb, txSheet, 'ประวัติ');

            // Download
            XLSX.writeFile(wb, `portfolio_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('ดาวน์โหลดไฟล์ Excel สำเร็จ!');
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการส่งออก Excel');
            console.error(error);
        }
    };

    const exportPDF = () => {
        try {
            const data = getExportData();
            const doc = new jsPDF();

            // Title
            doc.setFontSize(18);
            doc.text('Portfolio Report', 14, 20);
            doc.setFontSize(10);
            doc.text(`Export Date: ${new Date().toLocaleDateString('th-TH')}`, 14, 28);

            // Summary
            doc.setFontSize(14);
            doc.text('Summary', 14, 40);

            autoTable(doc, {
                startY: 45,
                head: [['Item', 'Value']],
                body: [
                    ['Total Value', `${data.summary.totalValue.toLocaleString()} THB`],
                    ['Total Invested', `${data.summary.totalInvested.toLocaleString()} THB`],
                    ['Unrealized P/L', `${data.summary.totalUnrealizedPL.toLocaleString()} THB`],
                    ['Realized P/L', `${data.summary.totalRealizedPL.toLocaleString()} THB`],
                    ['Dividends', `${data.summary.totalDividends.toLocaleString()} THB`],
                    ['Net Profit', `${data.summary.totalPL.toLocaleString()} THB (${data.summary.totalPLPercent.toFixed(2)}%)`],
                ],
                theme: 'striped',
                headStyles: { fillColor: [34, 197, 94] },
            });

            // Holdings
            const finalY = (doc as any).lastAutoTable.finalY || 100;
            doc.setFontSize(14);
            doc.text('Holdings', 14, finalY + 15);

            autoTable(doc, {
                startY: finalY + 20,
                head: [['Ticker', 'Shares', 'Avg Cost', 'MKT Value', 'P/L', '%']],
                body: data.holdings.map(h => [
                    h.ticker,
                    h.shares.toFixed(4),
                    h.averageCost.toFixed(2),
                    h.marketValue.toLocaleString(),
                    h.unrealizedPL.toLocaleString(),
                    `${h.unrealizedPLPercent.toFixed(2)}%`,
                ]),
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] },
            });

            // Save
            doc.save(`portfolio_${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success('ดาวน์โหลดไฟล์ PDF สำเร็จ!');
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการส่งออก PDF');
            console.error(error);
        }
    };

    return (
        <Card className="border-2 border-foreground shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl font-bold uppercase flex items-center gap-2">
                    <Download className="h-5 w-5" /> ส่งออกข้อมูล (Export)
                </CardTitle>
                <CardDescription>
                    ดาวน์โหลดข้อมูลพอร์ตโฟลิโอเป็นไฟล์ JSON, Excel หรือ PDF
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-3">
                    <Button
                        onClick={exportJSON}
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-auto py-4 border-2 border-foreground hover:bg-primary/10"
                    >
                        <FileJson className="h-8 w-8 text-amber-500" />
                        <span className="font-bold">JSON</span>
                    </Button>
                    <Button
                        onClick={exportExcel}
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-auto py-4 border-2 border-foreground hover:bg-primary/10"
                    >
                        <FileSpreadsheet className="h-8 w-8 text-green-500" />
                        <span className="font-bold">Excel</span>
                    </Button>
                    <Button
                        onClick={exportPDF}
                        variant="outline"
                        className="flex flex-col items-center gap-2 h-auto py-4 border-2 border-foreground hover:bg-primary/10"
                    >
                        <FileText className="h-8 w-8 text-red-500" />
                        <span className="font-bold">PDF</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
