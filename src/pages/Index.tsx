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

const Index = () => {
  const [activeTab, setActiveTab] = useState('holdings');
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
  } = usePortfolio();

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
              <div className="flex items-center gap-1">
                {user?.picture && (
                  <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="h-7 px-2 text-muted-foreground"
                >
                  <LogOut className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with top padding for status bar */}
        <div className="pt-12">
          {(activeTab === 'dashboard' || activeTab === 'holdings') && (
            <DimeLayout
              holdings={holdings}
              summary={summary}
              exchangeRate={exchangeRate}
              transactions={transactions}
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
                />
                <TransactionList
                  transactions={transactions}
                  onDelete={deleteTransaction}
                  onUpdate={updateTransaction}
                  onFilter={filterTransactions}
                  buyTransactions={transactions.filter(t => t.type === 'buy')}
                  getBuyTransactionsForSale={getBuyTransactionsForSale}
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

              {/* User Info */}
              <div className="bg-card rounded-xl p-4 mb-6">
                <div className="flex items-center gap-4">
                  {user?.picture && (
                    <img src={user.picture} alt="" className="w-16 h-16 rounded-full" />
                  )}
                  <div>
                    <h2 className="font-semibold">{user?.name}</h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Sync Info */}
              <div className="bg-card rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3">สถานะการซิงค์</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">สถานะ</span>
                    <span className={isOnline ? "text-emerald-500" : "text-amber-500"}>
                      {isOnline ? "ออนไลน์" : "ออฟไลน์"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">รายการรอซิงค์</span>
                    <span>{pendingCount}</span>
                  </div>
                  {lastSynced && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ซิงค์ล่าสุด</span>
                      <span>{lastSynced.toLocaleString('th-TH')}</span>
                    </div>
                  )}
                </div>
                {pendingCount > 0 && isOnline && (
                  <Button onClick={manualSync} disabled={isSyncing} className="w-full mt-4">
                    {isSyncing ? "กำลังซิงค์..." : "ซิงค์ตอนนี้"}
                  </Button>
                )}
              </div>

              {/* Danger Zone */}
              <div className="bg-card rounded-xl p-4 mb-6 border border-destructive/20">
                <h3 className="font-semibold mb-3 text-destructive">พื้นที่อันตราย</h3>
                <Button
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white"
                  onClick={resetPortfolio}
                >
                  ล้างข้อมูลทั้งหมด (Reset Portfolio)
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  ข้อมูลทั้งหมดทั้งในเครื่องและ Google Sheets จะถูกลบถาวร
                </p>
              </div>

              {/* Logout */}
              <Button variant="destructive" onClick={signOut} className="w-full">
                ออกจากระบบ
              </Button>
            </div>
          )}
        </div>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
};

export default Index;
