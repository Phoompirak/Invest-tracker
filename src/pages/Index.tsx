import { useState } from "react";
import { DimeLayout } from "@/components/portfolio/DimeLayout";
import { TransactionForm } from "@/components/portfolio/TransactionForm";
import { TransactionList } from "@/components/portfolio/TransactionList";
import { PortfolioCharts } from "@/components/portfolio/PortfolioCharts";
import { BottomNav } from "@/components/portfolio/BottomNav";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, RefreshCw, LogOut } from "lucide-react";
import { SettingsTab } from "@/components/portfolio/SettingsTab";
import { CurrencyToggle } from "@/components/ui/currency-toggle";

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currency, setCurrency] = useState<'THB' | 'USD'>('THB');
  const { isAuthenticated, isLoading: authLoading, user, signOut } = useAuth();
  const {
    transactions,
    holdings,
    summary,
    addTransaction,
    deleteTransaction,
    filterTransactions,
    getBuyTransactionsForSale,
    isLoading,
    isSyncing,
    lastSynced,
    pendingCount,
    manualSync,
    isOnline,
    importTransactions,
    resetPortfolio,
    exchangeRate,
    updateTransaction,
    customCategories,
    deleteCategory,
    setManualPrice,
  } = usePortfolio();

  // Categories for the form (defaults + custom + any from transactions not in custom yet)
  const formCategories = Array.from(new Set([
    'securities', 'long-term', 'speculation',
    ...customCategories,
    ...transactions.map(t => t.category)
  ]));

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show loading screen while loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Stock Portfolio Tracker - ระบบจัดการพอร์ตหุ้น</title>
        <meta name="description" content="ระบบจัดการพอร์ตหุ้นครบวงจร บันทึกการซื้อขาย คำนวณกำไรขาดทุน วิเคราะห์พอร์ตด้วยกราฟ" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Sync Status Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Cloud className="w-4 h-4 text-emerald-500" />
              ) : (
                <CloudOff className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {isSyncing ? (
                  "กำลังซิงค์..."
                ) : pendingCount > 0 ? (
                  `${pendingCount} รายการรอซิงค์`
                ) : lastSynced ? (
                  `ซิงค์ล่าสุด: ${lastSynced.toLocaleTimeString('th-TH')}`
                ) : (
                  "พร้อมใช้งาน"
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CurrencyToggle value={currency} onChange={setCurrency} />

              <div className="flex items-center gap-2">
                {pendingCount > 0 && isOnline && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={manualSync}
                    disabled={isSyncing}
                    className="h-7 px-2"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                {!isOnline && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                    <CloudOff className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user?.picture && (
                <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
              )}
              {/* Logout moved to Settings Tab */}
            </div>
          </div>
        </div>
        {/* Main Content with top padding for status bar */}
        <div className="pt-12">
          {(activeTab === 'dashboard') && (
            <DimeLayout
              holdings={holdings}
              summary={summary}
              exchangeRate={exchangeRate}
              transactions={transactions}
              onUpdateTransaction={updateTransaction}
              currency={currency}
              customCategories={customCategories}
              onDeleteCategory={deleteCategory}
              onSetManualPrice={setManualPrice}
            />
          )}

          {activeTab === 'transaction' && (
            <div className="px-4 py-6 pb-24">
              <h1 className="text-xl font-bold mb-6">รายการซื้อขาย</h1>
              <div className="space-y-6">
                <TransactionForm
                  onSubmit={addTransaction}
                  onImport={importTransactions}
                  buyTransactions={transactions.filter(t => t.type === 'buy')}
                  getBuyTransactionsForSale={getBuyTransactionsForSale}
                  existingCategories={formCategories}
                />
                <TransactionList
                  transactions={transactions}
                  onDelete={deleteTransaction}
                  onUpdate={updateTransaction}
                  onFilter={filterTransactions}
                  buyTransactions={transactions.filter(t => t.type === 'buy')}
                  getBuyTransactionsForSale={getBuyTransactionsForSale}
                  existingCategories={formCategories}
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
            <SettingsTab
              user={user}
              signOut={signOut}
              isOnline={isOnline}
              isSyncing={isSyncing}
              pendingCount={pendingCount}
              lastSynced={lastSynced}
              manualSync={manualSync}
              resetPortfolio={resetPortfolio}
              currency={currency}
              setCurrency={setCurrency}
              transactions={transactions}
              onUpdateTransaction={updateTransaction}
              holdings={holdings}
              summary={summary}
              exchangeRate={exchangeRate}
            />
          )}
        </div>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
};

export default Index;
