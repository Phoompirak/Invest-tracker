import { useState, useCallback, useMemo, useEffect } from 'react';
import { Transaction, Holding, PortfolioSummary, TransactionType, PortfolioCategory, FilterOptions } from '@/types/portfolio';
import { useAuth } from '@/contexts/AuthContext';
import {
  saveTransactions,
  loadTransactions,
  queueChange,
  getPendingChanges,
  getLastSynced,
  isOnline,
  hasPendingChanges,
} from '@/services/offlineStorage';
import {
  findOrCreateSpreadsheet,
  fetchTransactions,
  addTransactionToSheet,
  deleteTransactionFromSheet,
  updateTransactionInSheet,
  syncPendingChanges,
} from '@/services/sheetsService';

// Simulated current prices (in a real app, this would come from an API)
const currentPrices: Record<string, number> = {
  'PTT': 37.25,
  'SCB': 128.50,
  'KBANK': 138.00,
  'DELTA': 620.00,
  'AOT': 68.50,
  'CPALL': 62.00,
  'TRUE': 11.20,
  'ADVANC': 245.00,
};

export function usePortfolio() {
  const { isAuthenticated, isGapiReady } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSyncedState] = useState<Date | null>(getLastSynced());
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(getPendingChanges().length);

  // Load transactions on mount or when auth changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Always start with local data
      const localData = loadTransactions();
      if (localData.length > 0) {
        setTransactions(localData);
      }

      // If authenticated and online, sync with Google Sheets
      if (isAuthenticated && isGapiReady && isOnline()) {
        try {
          const sheetId = await findOrCreateSpreadsheet();
          setSpreadsheetId(sheetId);

          // Sync pending changes first
          if (hasPendingChanges()) {
            setIsSyncing(true);
            await syncPendingChanges(sheetId);
            setPendingCount(0);
          }

          // Fetch from sheets
          const remoteData = await fetchTransactions(sheetId);
          setTransactions(remoteData);
          saveTransactions(remoteData);
          setLastSyncedState(new Date());
          setIsSyncing(false);
        } catch (error) {
          console.error('Failed to sync with Google Sheets:', error);
          setIsSyncing(false);
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [isAuthenticated, isGapiReady]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      if (isAuthenticated && isGapiReady && spreadsheetId && hasPendingChanges()) {
        setIsSyncing(true);
        try {
          await syncPendingChanges(spreadsheetId);
          const remoteData = await fetchTransactions(spreadsheetId);
          setTransactions(remoteData);
          saveTransactions(remoteData);
          setPendingCount(0);
          setLastSyncedState(new Date());
        } catch (error) {
          console.error('Failed to sync on reconnect:', error);
        }
        setIsSyncing(false);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isAuthenticated, isGapiReady, spreadsheetId]);

  const addTransaction = useCallback(async (
    ticker: string,
    type: TransactionType,
    shares: number,
    pricePerShare: number,
    commission: number,
    timestamp: Date,
    category: PortfolioCategory,
    relatedBuyId?: string
  ) => {
    const totalValue = shares * pricePerShare;

    let realizedPL: number | undefined;
    let realizedPLPercent: number | undefined;

    if (type === 'sell' && relatedBuyId) {
      const buyTransaction = transactions.find(t => t.id === relatedBuyId);
      if (buyTransaction) {
        const costBasis = buyTransaction.pricePerShare * shares;
        realizedPL = totalValue - costBasis - commission;
        realizedPLPercent = ((pricePerShare - buyTransaction.pricePerShare) / buyTransaction.pricePerShare) * 100;
      }
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      ticker: ticker.toUpperCase(),
      type,
      shares,
      pricePerShare,
      totalValue,
      commission,
      timestamp,
      category,
      relatedBuyId,
      realizedPL,
      realizedPLPercent,
    };

    // Update local state immediately
    setTransactions(prev => {
      const updated = [...prev, newTransaction];
      saveTransactions(updated);
      return updated;
    });

    // Sync to sheets or queue for later
    if (isAuthenticated && isGapiReady && spreadsheetId && isOnline()) {
      try {
        await addTransactionToSheet(spreadsheetId, newTransaction);
        setLastSyncedState(new Date());
      } catch (error) {
        console.error('Failed to add to sheets:', error);
        queueChange({ id: newTransaction.id, type: 'add', transaction: newTransaction, timestamp: new Date() });
        setPendingCount(prev => prev + 1);
      }
    } else {
      queueChange({ id: newTransaction.id, type: 'add', transaction: newTransaction, timestamp: new Date() });
      setPendingCount(prev => prev + 1);
    }

    return newTransaction;
  }, [transactions, isAuthenticated, isGapiReady, spreadsheetId]);

  const deleteTransaction = useCallback(async (id: string) => {
    // Update local state immediately
    setTransactions(prev => {
      const updated = prev.filter(t => t.id !== id);
      saveTransactions(updated);
      return updated;
    });

    // Sync to sheets or queue for later
    if (isAuthenticated && isGapiReady && spreadsheetId && isOnline()) {
      try {
        await deleteTransactionFromSheet(spreadsheetId, id);
        setLastSyncedState(new Date());
      } catch (error) {
        console.error('Failed to delete from sheets:', error);
        queueChange({ id, type: 'delete', timestamp: new Date() });
        setPendingCount(prev => prev + 1);
      }
    } else {
      queueChange({ id, type: 'delete', timestamp: new Date() });
      setPendingCount(prev => prev + 1);
    }
  }, [isAuthenticated, isGapiReady, spreadsheetId]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    let updatedTransaction: Transaction | null = null;

    // Update local state immediately
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          updatedTransaction = { ...t, ...updates };
          return updatedTransaction;
        }
        return t;
      });
      saveTransactions(updated);
      return updated;
    });

    // Sync to sheets or queue for later
    if (updatedTransaction && isAuthenticated && isGapiReady && spreadsheetId && isOnline()) {
      try {
        await updateTransactionInSheet(spreadsheetId, updatedTransaction);
        setLastSyncedState(new Date());
      } catch (error) {
        console.error('Failed to update in sheets:', error);
        queueChange({ id, type: 'update', transaction: updatedTransaction, timestamp: new Date() });
        setPendingCount(prev => prev + 1);
      }
    } else if (updatedTransaction) {
      queueChange({ id, type: 'update', transaction: updatedTransaction, timestamp: new Date() });
      setPendingCount(prev => prev + 1);
    }
  }, [isAuthenticated, isGapiReady, spreadsheetId]);

  const manualSync = useCallback(async () => {
    if (!isAuthenticated || !isGapiReady || !isOnline()) return;

    setIsSyncing(true);
    try {
      const sheetId = spreadsheetId || await findOrCreateSpreadsheet();
      if (!spreadsheetId) setSpreadsheetId(sheetId);

      await syncPendingChanges(sheetId);
      const remoteData = await fetchTransactions(sheetId);
      setTransactions(remoteData);
      saveTransactions(remoteData);
      setPendingCount(0);
      setLastSyncedState(new Date());
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
    setIsSyncing(false);
  }, [isAuthenticated, isGapiReady, spreadsheetId]);

  const holdings = useMemo((): Holding[] => {
    const holdingsMap = new Map<string, { shares: number; totalCost: number; category: PortfolioCategory }>();

    transactions.forEach(t => {
      const current = holdingsMap.get(t.ticker) || { shares: 0, totalCost: 0, category: t.category };

      if (t.type === 'buy') {
        current.shares += t.shares;
        current.totalCost += t.totalValue + t.commission;
      } else {
        current.shares -= t.shares;
      }

      holdingsMap.set(t.ticker, current);
    });

    return Array.from(holdingsMap.entries())
      .filter(([_, data]) => data.shares > 0)
      .map(([ticker, data]) => {
        const currentPrice = currentPrices[ticker] || 0;
        const marketValue = data.shares * currentPrice;
        const unrealizedPL = marketValue - data.totalCost;
        const unrealizedPLPercent = data.totalCost > 0 ? (unrealizedPL / data.totalCost) * 100 : 0;

        return {
          ticker,
          totalShares: data.shares,
          averageCost: data.totalCost / data.shares,
          totalInvested: data.totalCost,
          currentPrice,
          marketValue,
          unrealizedPL,
          unrealizedPLPercent,
          category: data.category,
        };
      });
  }, [transactions]);

  const summary = useMemo((): PortfolioSummary => {
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalUnrealizedPL = holdings.reduce((sum, h) => sum + h.unrealizedPL, 0);
    const totalRealizedPL = transactions
      .filter(t => t.type === 'sell' && t.realizedPL !== undefined)
      .reduce((sum, t) => sum + (t.realizedPL || 0), 0);
    const totalPL = totalRealizedPL + totalUnrealizedPL;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    const sortedByPL = [...holdings].sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent);

    return {
      totalValue,
      totalInvested,
      totalRealizedPL,
      totalUnrealizedPL,
      totalPL,
      totalPLPercent,
      bestPerformer: sortedByPL[0] || null,
      worstPerformer: sortedByPL[sortedByPL.length - 1] || null,
    };
  }, [holdings, transactions]);

  const filterTransactions = useCallback((filters: FilterOptions): Transaction[] => {
    return transactions.filter(t => {
      if (filters.profitOnly && t.type === 'sell' && (t.realizedPL || 0) <= 0) return false;
      if (filters.lossOnly && t.type === 'sell' && (t.realizedPL || 0) >= 0) return false;
      if (filters.category && t.category !== filters.category) return false;
      if (filters.ticker && !t.ticker.includes(filters.ticker.toUpperCase())) return false;
      if (filters.startDate && t.timestamp < filters.startDate) return false;
      if (filters.endDate && t.timestamp > filters.endDate) return false;
      return true;
    });
  }, [transactions]);

  const getBuyTransactionsForSale = useCallback((ticker: string): Transaction[] => {
    return transactions.filter(t => t.type === 'buy' && t.ticker === ticker.toUpperCase());
  }, [transactions]);

  const getCurrentPrice = useCallback((ticker: string): number => {
    return currentPrices[ticker.toUpperCase()] || 0;
  }, []);

  const importTransactions = useCallback(async (data: {
    ticker: string;
    type: TransactionType;
    shares: number;
    price: number;
    date: string;
    commission?: number;
    category?: PortfolioCategory;
  }[]) => {
    const newTransactions: Transaction[] = data.map(item => {
      const pricePerShare = item.price;
      const totalValue = item.shares * pricePerShare;
      const timestamp = new Date(item.date);
      const commission = item.commission || 0;

      return {
        id: crypto.randomUUID(), // Use UUID for reliable unique IDs
        ticker: item.ticker.toUpperCase(),
        type: item.type,
        shares: item.shares,
        pricePerShare,
        totalValue,
        commission,
        timestamp,
        category: item.category || 'long-term',
      };
    });

    // Update local state immediately
    setTransactions(prev => {
      const updated = [...prev, ...newTransactions];
      saveTransactions(updated);
      return updated;
    });

    // Sync to sheets or queue for later
    if (isAuthenticated && isGapiReady && spreadsheetId && isOnline()) {
      setIsSyncing(true);
      try {
        // We'll queue them first to ensure they are processed sequentially
        // or we could implement a batch add function in sheetsService
        // For now, let's queue them to be safe and simple
        for (const t of newTransactions) {
          queueChange({ id: t.id, type: 'add', transaction: t, timestamp: new Date() });
        }
        setPendingCount(prev => prev + newTransactions.length);

        // Trigger sync immediately
        await syncPendingChanges(spreadsheetId);
        setPendingCount(0);
        setLastSyncedState(new Date());
      } catch (error) {
        console.error('Failed to batch add to sheets:', error);
        // They are already queued from the loop above if failed midway? 
        // Actually best to strictly queue them all first then try sync.
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Offline or not auth
      for (const t of newTransactions) {
        queueChange({ id: t.id, type: 'add', transaction: t, timestamp: new Date() });
      }
      setPendingCount(prev => prev + newTransactions.length);
    }
  }, [isAuthenticated, isGapiReady, spreadsheetId]);

  return {
    transactions,
    holdings,
    summary,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    filterTransactions,
    getBuyTransactionsForSale,
    getCurrentPrice,
    // New sync-related properties
    isLoading,
    isSyncing,
    lastSynced,
    pendingCount,
    manualSync,
    isOnline: isOnline(),
    importTransactions,
  };
}
