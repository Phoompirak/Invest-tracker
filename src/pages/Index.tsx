import { useState, lazy, Suspense } from "react";
import { DimeLayout } from "@/components/portfolio/DimeLayout";
import { TransactionForm } from "@/components/portfolio/TransactionForm";
import { BottomNav } from "@/components/portfolio/BottomNav";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/contexts/AuthContext";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Cloud, CloudOff, RefreshCw, LogOut, Loader2 } from "lucide-react";
import { CurrencyToggle } from "@/components/ui/currency-toggle";
import { Navbar } from "@/components/portfolio/Navbar";
import { useLocation } from "react-router-dom";

// Lazy load heavy components
const TransactionList = lazy(() => import("@/components/portfolio/TransactionList").then(m => ({ default: m.TransactionList })));
const PortfolioCharts = lazy(() => import("@/components/portfolio/PortfolioCharts").then(m => ({ default: m.PortfolioCharts })));
const SettingsTab = lazy(() => import("@/components/portfolio/SettingsTab").then(m => ({ default: m.SettingsTab })));

// Loading fallback for lazy components
const LazyFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const Index = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.initialTab || 'dashboard');
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
    recalculateHistory,
    currency,
    setCurrency,
    stockSplits,
    addStockSplit,
    removeStockSplit,
    bulkDeleteByIds,
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
        {/* Sync Status Bar */}
        <Navbar currency={currency} setCurrency={setCurrency} />
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
                <Suspense fallback={<LazyFallback />}>
                  <TransactionList
                    transactions={transactions}
                    onDelete={deleteTransaction}
                    onUpdate={updateTransaction}
                    onFilter={filterTransactions}
                    onBulkDelete={bulkDeleteByIds}
                    buyTransactions={transactions.filter(t => t.type === 'buy')}
                    getBuyTransactionsForSale={getBuyTransactionsForSale}
                    existingCategories={formCategories}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="px-4 py-6 pb-24">
              <h1 className="text-xl font-bold mb-6">วิเคราะห์พอร์ต</h1>
              <Suspense fallback={<LazyFallback />}>
                <PortfolioCharts
                  holdings={holdings}
                  transactions={transactions}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />
              </Suspense>
            </div>
          )}

          {activeTab === 'profile' && (
            <Suspense fallback={<LazyFallback />}>
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
                recalculateHistory={recalculateHistory}
                stockSplits={stockSplits}
                addStockSplit={addStockSplit}
                removeStockSplit={removeStockSplit}
              />
            </Suspense>
          )}
        </div>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
};

export default Index;
