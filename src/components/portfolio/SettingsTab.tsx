import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ExportTools } from "./ExportTools";
import { StockSplitManager } from "./StockSplitManager";
import { TaxCalculator } from "./TaxCalculator";
import { RefreshCw, LogOut, Cloud, CloudOff, User, Settings, PenTool, Database, Info, ChevronsRight, ChevronRight, Calculator } from "lucide-react";
import { Transaction, Holding, PortfolioSummary, StockSplit } from "@/types/portfolio";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface SettingsTabProps {
    user: any;
    signOut: () => void;
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    lastSynced: Date | null;
    manualSync: () => void;
    resetPortfolio: () => void;
    currency: 'THB' | 'USD';
    setCurrency: (currency: 'THB' | 'USD') => void;
    transactions: Transaction[];
    onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
    holdings: Holding[];
    summary: PortfolioSummary;
    exchangeRate: number;
    recalculateHistory: () => Promise<void>;
    // Stock splits (Config Sheet)
    stockSplits: StockSplit[];
    addStockSplit: (ticker: string, ratio: number, effectiveDate: Date) => Promise<void>;
    removeStockSplit: (splitId: string) => Promise<void>;
}

export function SettingsTab({
    user,
    signOut,
    isOnline,
    isSyncing,
    pendingCount,
    lastSynced,
    manualSync,
    resetPortfolio,
    currency,
    setCurrency,
    transactions,
    onUpdateTransaction,
    holdings,
    summary,
    exchangeRate,
    recalculateHistory,
    stockSplits,
    addStockSplit,
    removeStockSplit,
}: SettingsTabProps) {

    const [openTools, setOpenTools] = useState(true);

    return (
        <div className="px-4 py-6 pb-24 space-y-6">
            <h1 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                ตั้งค่า & เมนู
            </h1>

            {/* User Profile Section */}
            <Card className="p-5 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-card">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {user?.picture ? (
                            <img src={user.picture} alt="" className="w-16 h-16 rounded-full border-2 border-foreground" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-foreground">
                                <User className="w-8 h-8 text-muted-foreground" />
                            </div>
                        )}
                        {isOnline ? (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        ) : (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-amber-500 border-2 border-white rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h2 className="font-bold text-lg truncate">{user?.name || "Guest User"}</h2>
                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                {isOnline ? "Online" : "Offline"}
                            </Badge>
                            {pendingCount > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5 text-amber-600 bg-amber-100">
                                    Wait Sync: {pendingCount}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </Card>

            {/* Preferences Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-muted-foreground uppercase">การตั้งค่าทั่วไป (Preferences)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4 border-2 border-transparent bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer flex flex-col items-center gap-3">
                        <span className="text-sm font-semibold text-muted-foreground">ธีม (Theme)</span>
                        <ThemeToggle />
                    </Card>

                    <Card
                        onClick={() => setCurrency(currency === 'THB' ? 'USD' : 'THB')}
                        className="p-4 border-2 border-transparent bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer flex flex-col items-center gap-3 relative overflow-hidden"
                    >
                        <div className="absolute top-2 right-2 opacity-10">
                            <RefreshCw className="w-8 h-8" />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground">สกุลเงิน (Currency)</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-xl font-black ${currency === 'THB' ? 'text-primary' : 'text-muted-foreground'}`}>THB</span>
                            <RefreshCw className="w-4 h-4 text-muted-foreground" />
                            <span className={`text-xl font-black ${currency === 'USD' ? 'text-primary' : 'text-muted-foreground'}`}>USD</span>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Tools Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <PenTool className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-muted-foreground uppercase">เครื่องมือ (Tools)</span>
                </div>

                <Collapsible open={openTools} onOpenChange={setOpenTools}>
                    <Card className="border-2 border-foreground/10 overflow-hidden">
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 bg-secondary/20 cursor-pointer hover:bg-secondary/30">
                                <span className="font-bold flex items-center gap-2">
                                    <Calculator className="w-4 h-4" />
                                    เครื่องมือจัดการพอร์ต
                                </span>
                                {openTools ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="p-4 space-y-6 pt-2">
                                <div className="pb-4 border-b border-border/50">
                                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">จัดการแตกพาร์ (Stock Split)</h3>
                                    <StockSplitManager
                                        stockSplits={stockSplits}
                                        onAddSplit={addStockSplit}
                                        onRemoveSplit={removeStockSplit}
                                        tickers={Array.from(new Set(transactions.map(t => t.ticker)))}
                                    />
                                </div>

                                <div className="pb-4 border-b border-border/50">
                                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">เครื่องมือซ่อมแซม (Fix Tools)</h3>
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            หากข้อมูลกำไรขาดทุน (P/L) ของคุณดูเหมือนจะผิดปกติ คุณสามารถกดปุ่มนี้เพื่อคำนวณประวัติการซื้อขายใหม่ทั้งหมดตามลำดับเวลา (FIFO)
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={async () => {
                                                if (window.confirm('คุณต้องการคำนวณประวัติ P/L ใหม่ทั้งหมดหรือไม่? อาจใช้เวลาสักครู่')) {
                                                    await recalculateHistory();
                                                    alert('คำนวณเสร็จสิ้น! กรุณารีเฟรชหน้าจอ');
                                                }
                                            }}
                                            className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                        >
                                            <RefreshCw className="mr-2 h-4 w-4" />
                                            คำนวณกำไร/ขาดทุนใหม่ (Recalculate P/L)
                                        </Button>
                                    </div>
                                </div>

                                <div className="pb-4 border-b border-border/50">
                                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">ส่งออกข้อมูล (Export Data)</h3>
                                    <ExportTools
                                        transactions={transactions}
                                        holdings={holdings}
                                        summary={summary}
                                        exchangeRate={exchangeRate}
                                    />
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">คำนวณภาษี (Tax Calculator)</h3>
                                    <TaxCalculator />
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            </div>

            {/* Sync & Data Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-bold text-muted-foreground uppercase">ข้อมูลและการซิงค์ (Data)</span>
                </div>

                <Card className="p-4 border-2 border-foreground/10">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Google Sheets Sync</span>
                            <div className="flex items-center gap-2">
                                {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
                                <Badge variant={isOnline ? "default" : "secondary"}>
                                    {isOnline ? "Connected" : "Offline"}
                                </Badge>
                            </div>
                        </div>

                        {lastSynced && (
                            <p className="text-xs text-muted-foreground text-center bg-secondary/30 py-1 rounded">
                                ซิงค์ล่าสุดเมื่อ: {lastSynced.toLocaleString('th-TH')}
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" onClick={manualSync} disabled={isSyncing || !isOnline} className="w-full">
                                <RefreshCw className={`w-3 h-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                Sync Now
                            </Button>
                            <Button variant="destructive" size="sm" onClick={resetPortfolio} className="w-full">
                                <Database className="w-3 h-3 mr-2" />
                                Reset Data
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center opacity-70">
                            *Reset Data จะลบข้อมูลทั้งหมดใน Local Storage และดึงใหม่จาก Sheets (ถ้ามี)
                        </p>
                    </div>
                </Card>
            </div>

            {/* Info / Version */}
            <div className="text-center pt-8 pb-4 opacity-50">
                <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-foreground rounded-lg"></div>
                    </div>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dime Portfolio Tracker</p>
                <p className="text-[10px] text-muted-foreground">Version 1.2.0 • Build 2025.12</p>
            </div>
        </div>
    );
}

function ChevronDown(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}
