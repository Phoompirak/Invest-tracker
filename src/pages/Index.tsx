import { useState } from "react";
import { DimeLayout } from "@/components/portfolio/DimeLayout";
import { TransactionForm } from "@/components/portfolio/TransactionForm";
import { TransactionList } from "@/components/portfolio/TransactionList";
import { PortfolioCharts } from "@/components/portfolio/PortfolioCharts";
import { BottomNav } from "@/components/portfolio/BottomNav";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Helmet } from "react-helmet-async";

const Index = () => {
  const [activeTab, setActiveTab] = useState('holdings');
  const {
    transactions,
    holdings,
    summary,
    addTransaction,
    deleteTransaction,
    filterTransactions,
    getBuyTransactionsForSale,
  } = usePortfolio();

  return (
    <>
      <Helmet>
        <title>Stock Portfolio Tracker - ระบบจัดการพอร์ตหุ้น</title>
        <meta name="description" content="ระบบจัดการพอร์ตหุ้นครบวงจร บันทึกการซื้อขาย คำนวณกำไรขาดทุน วิเคราะห์พอร์ตด้วยกราฟ" />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {(activeTab === 'dashboard' || activeTab === 'holdings') && (
          <DimeLayout holdings={holdings} summary={summary} />
        )}

        {activeTab === 'transaction' && (
          <div className="px-4 py-6 pb-24">
            <h1 className="text-xl font-bold mb-6">รายการซื้อขาย</h1>
            <div className="space-y-6">
              <TransactionForm
                onSubmit={addTransaction}
                buyTransactions={transactions.filter(t => t.type === 'buy')}
                getBuyTransactionsForSale={getBuyTransactionsForSale}
              />
              <TransactionList
                transactions={transactions}
                onDelete={deleteTransaction}
                onFilter={filterTransactions}
              />
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="px-4 py-6 pb-24">
            <h1 className="text-xl font-bold mb-6">วิเคราะห์พอร์ต</h1>
            <PortfolioCharts holdings={holdings} transactions={transactions} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="px-4 py-6 pb-24">
            <h1 className="text-xl font-bold mb-6">ตั้งค่า</h1>
            <div className="text-center text-muted-foreground py-12">
              ฟีเจอร์นี้กำลังพัฒนา
            </div>
          </div>
        )}

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
};

export default Index;
