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
  loadCustomCategories,
  saveCustomCategories,
  loadHiddenCategories,
  saveHiddenCategories,
  loadManualPrices,
  setManualPrice as saveManualPrice,
} from '@/services/offlineStorage';
import {
  findOrCreateSpreadsheet,
  fetchTransactions,
  addTransactionToSheet,
  deleteTransactionFromSheet,
  updateTransactionInSheet,
  syncPendingChanges,
} from '@/services/sheetsService';

import { fetchCurrentPrices, fetchExchangeRate } from '@/services/stockPriceService';

// Helper to safely cast to number
const cNumber = (val: any) => Number(val) || 0;

export function usePortfolio() {
  const { isAuthenticated, isGapiReady } = useAuth();
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [exchangeRate, setExchangeRate] = useState<number>(34.5); // Default THB/USD

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSyncedState] = useState<Date | null>(getLastSynced());
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(getPendingChanges().length);
  const [customCategories, setCustomCategories] = useState<string[]>(loadCustomCategories());
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(loadHiddenCategories());
  const [manualPrices, setManualPrices] = useState<Record<string, number>>(loadManualPrices());
  const [currency, setCurrencyState] = useState<'THB' | 'USD'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('portfolio_currency') as 'THB' | 'USD') || 'THB';
    }
    return 'THB';
  });

  const setCurrency = useCallback((newCurrency: 'THB' | 'USD') => {
    localStorage.setItem('portfolio_currency', newCurrency);
    setCurrencyState(newCurrency);
  }, []);

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

  // Discover and manage categories from transactions
  useEffect(() => {
    if (transactions.length === 0) return;

    const discoveredCategories = Array.from(new Set(transactions.map(t => t.category)))
      .filter(cat =>
        cat &&
        !['securities', 'long-term', 'speculation'].includes(cat) &&
        !customCategories.includes(cat) &&
        !hiddenCategories.includes(cat)
      );

    if (discoveredCategories.length > 0) {
      const updatedCustom = [...customCategories, ...discoveredCategories];
      setCustomCategories(updatedCustom);
      saveCustomCategories(updatedCustom);
    }
  }, [transactions, customCategories, hiddenCategories]);

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

  // Fetch current prices for all tickers in portfolio
  useEffect(() => {
    const fetchPrices = async () => {
      if (!isOnline()) return;

      // Get unique ticker + currency combinations
      const uniqueItemsMap = new Map<string, { ticker: string; currency: 'THB' | 'USD' }>();
      transactions.forEach(t => {
        if (!uniqueItemsMap.has(t.ticker)) {
          uniqueItemsMap.set(t.ticker, { ticker: t.ticker, currency: t.currency || 'THB' });
        }
      });
      const items = Array.from(uniqueItemsMap.values());

      if (items.length === 0) return;

      try {
        const prices = await fetchCurrentPrices(items);
        setCurrentPrices(prev => ({ ...prev, ...prices }));

        // Fetch USD rate
        const rate = await fetchExchangeRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };

    fetchPrices();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [transactions]);

  const addTransaction = useCallback(async (
    ticker: string,
    type: TransactionType,
    shares: number,
    pricePerShare: number,
    commission: number,
    timestamp: Date,
    category: PortfolioCategory,
    relatedBuyId?: string,
    withholdingTax?: number,
    currency?: 'THB' | 'USD',
    manualRealizedPL?: number,
    exchangeRate?: number
  ) => {
    // Add to custom categories if new
    if (category && !['securities', 'long-term', 'speculation'].includes(category)) {
      // If was hidden, unhide it
      if (hiddenCategories.includes(category)) {
        const updatedHidden = hiddenCategories.filter(c => c !== category);
        setHiddenCategories(updatedHidden);
        saveHiddenCategories(updatedHidden);
      }

      if (!customCategories.includes(category)) {
        const updatedCategories = [...customCategories, category];
        setCustomCategories(updatedCategories);
        saveCustomCategories(updatedCategories);
      }
    }

    // For dividends: totalValue is the dividend amount (pricePerShare)
    const totalValue = type === 'dividend' ? pricePerShare : shares * pricePerShare;

    let realizedPL: number | undefined = manualRealizedPL;
    let realizedPLPercent: number | undefined;

    if (type === 'sell') {
      if (manualRealizedPL !== undefined) {
        // Calculated based on manual input
        realizedPL = manualRealizedPL;
        // Recalculate percent based on cost derived from PL
        // PL = Value - Cost - Comm -> Cost = Value - PL - Comm
        const impliedCost = totalValue - manualRealizedPL - commission;
        if (impliedCost > 0) {
          realizedPLPercent = (manualRealizedPL / impliedCost) * 100;
        }
      } else if (relatedBuyId) {
        const buyTransaction = transactions.find(t => t.id === relatedBuyId);
        if (buyTransaction) {
          const costBasis = buyTransaction.pricePerShare * shares;
          realizedPL = totalValue - costBasis - commission;
          realizedPLPercent = ((pricePerShare - buyTransaction.pricePerShare) / buyTransaction.pricePerShare) * 100;
        }
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
      withholdingTax: type === 'dividend' ? withholdingTax : undefined,
      currency: currency || 'THB',
      exchangeRate,
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



  // Fix: Recalculate FIFO history for all transactions to ensure correct Realized P/L
  const recalculateHistory = useCallback(async () => {
    setTransactions(prev => {
      // 1. Sort all transactions by date
      const sorted = [...prev].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // 2. Track inventory PER TICKER (Map of ticker -> array of lots)
      const inventoryByTicker = new Map<string, { id: string; shares: number; costPerShare: number; remaining: number }[]>();

      const updatedTransactions = sorted.map(t => {
        if (t.type === 'buy') {
          // Cost per share = (totalValue + commission) / shares
          // This ensures commission is included in the cost basis
          const costPerShare = (t.totalValue + t.commission) / t.shares;

          // Get or create inventory array for this ticker
          const tickerInventory = inventoryByTicker.get(t.ticker) || [];
          tickerInventory.push({
            id: t.id,
            shares: t.shares,
            costPerShare: costPerShare,
            remaining: t.shares
          });
          inventoryByTicker.set(t.ticker, tickerInventory);

          return t;
        } else if (t.type === 'sell') {
          let sharesToSell = t.shares;
          let totalCost = 0;

          // Get inventory for THIS ticker only
          const tickerInventory = inventoryByTicker.get(t.ticker) || [];

          // Match with available inventory (FIFO) for this ticker
          for (const lot of tickerInventory) {
            if (sharesToSell <= 0.000001) break; // Float tolerance
            if (lot.remaining <= 0.000001) continue;

            const taking = Math.min(lot.remaining, sharesToSell);
            // Use costPerShare which INCLUDES buy commission
            totalCost += taking * lot.costPerShare;

            lot.remaining -= taking;
            sharesToSell -= taking;
          }

          // Update P/L: saleValue - totalCost (with buy commission) - sell commission
          const saleValue = t.shares * t.pricePerShare;
          const realizedPL = saleValue - totalCost - t.commission;
          let realizedPLPercent = 0;

          const impliedCost = saleValue - realizedPL - t.commission;
          if (impliedCost > 0) {
            realizedPLPercent = (realizedPL / impliedCost) * 100;
          }

          return {
            ...t,
            realizedPL,
            realizedPLPercent
          };
        }
        return t;
      });

      saveTransactions(updatedTransactions);

      // Sync to sheets if online
      if (isAuthenticated && isGapiReady && spreadsheetId && isOnline()) {
        // This acts as a "mass update". In reality, we might want to just overwrite the whole sheet 
        // or update changed rows. For now, let's just update local and queue changes? 
        // Updating 100s of rows individually is slow.
        // A better approach for "fix" is to maybe just let them sync slowly or rely on local assumption.
        // For this immediate fix, we'll try to batch update if possible, or just queue updates for SELLS.
        const changedSells = updatedTransactions.filter(t => t.type === 'sell');
        changedSells.forEach(t => {
          queueChange({ id: t.id, type: 'update', transaction: t, timestamp: new Date() });
        });
        setPendingCount(prev => prev + changedSells.length);
      }

      return updatedTransactions;
    });
  }, [isAuthenticated, isGapiReady, spreadsheetId]);

  const manualSync = useCallback(async () => {
    if (!isAuthenticated || !isGapiReady || !isOnline()) return;

    setIsSyncing(true);
    try {
      // Always verify spreadsheet existence to handle cases where user deleted it
      const sheetId = await findOrCreateSpreadsheet();
      if (sheetId !== spreadsheetId) setSpreadsheetId(sheetId);

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
      // Skip dividends - they don't affect share count
      if (t.type === 'dividend') return;

      const current = holdingsMap.get(t.ticker) || { shares: 0, totalCost: 0, category: t.category };

      // Convert to THB if needed
      // Use historical exchange rate if available (for precise cost basis), otherwise fallback to current
      const rate = t.currency === 'USD' ? (t.exchangeRate || exchangeRate) : 1;
      const transactionCost = cNumber(t.totalValue + t.commission) * rate;

      if (t.type === 'buy') {
        current.shares += cNumber(t.shares);
        current.totalCost += transactionCost;
      } else {
        // Reduce cost basis proportionally
        if (current.shares > 0) {
          const costPerShare = current.totalCost / current.shares;
          current.totalCost -= (costPerShare * cNumber(t.shares));
        }
        current.shares -= cNumber(t.shares);
      }

      current.category = t.category;

      holdingsMap.set(t.ticker, current);
    });

    return Array.from(holdingsMap.entries())
      .map(([ticker, data]) => {
        // Check if ticker is likely USD
        const isUsd = transactions.some(t => t.ticker === ticker && t.currency === 'USD');
        const rate = isUsd ? exchangeRate : 1;

        // Use manual price as fallback if API price is 0
        const apiPrice = currentPrices[ticker] || 0;
        const manualPrice = manualPrices[ticker] || 0;
        const currentPrice = apiPrice > 0 ? apiPrice : manualPrice;
        const hasPriceData = currentPrice > 0;

        // Check for "dust" (value < 1.0 in original currency)
        const rawValue = data.shares * currentPrice;
        const isDust = hasPriceData && rawValue < 1 && rawValue > 0;

        const isClosed = data.shares <= 0.01 || isDust;
        // Market Value in THB (0 for closed positions)
        const marketValue = isClosed ? 0 : data.shares * currentPrice * rate;
        const unrealizedPL = isClosed ? 0 : (hasPriceData ? marketValue - data.totalCost : 0);
        const unrealizedPLPercent = (data.totalCost > 0 && !isClosed && hasPriceData) ? (unrealizedPL / data.totalCost) * 100 : 0;

        // Calculate realized P/L from all sell transactions for this ticker
        const tickerRealizedPL = transactions
          .filter(t => t.ticker === ticker && t.type === 'sell' && t.realizedPL !== undefined)
          .reduce((sum, t) => {
            const txRate = t.currency === 'USD' ? exchangeRate : 1;
            return sum + (t.realizedPL || 0) * txRate;
          }, 0);

        return {
          ticker,
          totalShares: isClosed ? 0 : data.shares,
          averageCost: (data.shares > 0 && data.totalCost > 0) ? data.totalCost / data.shares : 0,
          totalInvested: isClosed ? 0 : data.totalCost,
          currentPrice,
          marketValue,
          unrealizedPL,
          unrealizedPLPercent,
          realizedPL: tickerRealizedPL,
          category: data.category,
          isClosed,
          hasPriceData,
        };
      });
  }, [transactions]);

  const summary = useMemo((): PortfolioSummary => {
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalUnrealizedPL = holdings.reduce((sum, h) => sum + h.unrealizedPL, 0);
    const totalRealizedPL = transactions
      .filter(t => t.type === 'sell' && t.realizedPL !== undefined)
      .reduce((sum, t) => {
        const rate = t.currency === 'USD' ? exchangeRate : 1;
        return sum + (t.realizedPL || 0) * rate;
      }, 0);
    const totalDividends = transactions
      .filter(t => t.type === 'dividend')
      .reduce((sum, t) => {
        const rate = t.currency === 'USD' ? exchangeRate : 1;
        return sum + (t.totalValue - (t.withholdingTax || 0)) * rate;
      }, 0);
    const totalPL = totalRealizedPL + totalUnrealizedPL + totalDividends;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    const sortedByPL = [...holdings].sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent);

    return {
      totalValue,
      totalInvested,
      totalRealizedPL,
      totalUnrealizedPL,
      totalDividends,
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
    currency?: 'THB' | 'USD';
  }[]) => {
    let addedCount = 0;
    let skippedCount = 0;
    const newTransactions: Transaction[] = [];

    // Create a quick lookup set for existing transactions to improve performance
    // Composite key: TICKER|TYPE|SHARES|PRICE|TIMESTAMP_EPOCH
    const existingSet = new Set(
      transactions.map(t =>
        `${t.ticker}|${t.type}|${t.shares}|${t.pricePerShare}|${t.timestamp.getTime()}`
      )
    );

    for (const item of data) {
      const pricePerShare = item.price;
      const totalValue = item.shares * pricePerShare;
      // Ensure date is parsed correctly (handling potential timezones if needed, but assuming ISO string is sufficient)
      const timestamp = new Date(item.date);
      const commission = item.commission || 0;
      const currency = item.currency || 'THB';
      const type = item.type;
      const ticker = item.ticker.toUpperCase();
      const shares = item.shares;

      // Construct key for duplicate check
      const key = `${ticker}|${type}|${shares}|${pricePerShare}|${timestamp.getTime()}`;

      if (existingSet.has(key)) {
        skippedCount++;
        continue;
      }

      let realizedPL: number | undefined = undefined;
      let realizedPLPercent: number | undefined = undefined;

      // FIFO Logic for Sell during Import
      if (type === 'sell') {
        // Calculate manually based on FIFO
        // 1. Gather all potential buys (existing + ones added in this batch so far)
        const allBuys = [
          ...transactions.filter(t => t.ticker === ticker && t.type === 'buy'),
          ...newTransactions.filter(t => t.ticker === ticker && t.type === 'buy')
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        let remainingSharesToSell = shares;
        let totalCost = 0;

        for (const buy of allBuys) {
          if (remainingSharesToSell <= 0) break;
          // Note: This logic assumes these buys are "available". 
          // It effectively re-uses the same "all buys" logic as the frontend, 
          // which assumes "Sold All" or "Matches History".
          const usedShares = Math.min(buy.shares, remainingSharesToSell);
          totalCost += usedShares * buy.pricePerShare;
          remainingSharesToSell -= usedShares;
        }

        const sellTotalValue = shares * pricePerShare;
        realizedPL = sellTotalValue - totalCost - commission;

        const impliedCost = sellTotalValue - realizedPL - commission;
        if (impliedCost > 0) {
          realizedPLPercent = (realizedPL / impliedCost) * 100;
        }
      }

      newTransactions.push({
        id: crypto.randomUUID(),
        ticker,
        type,
        shares,
        pricePerShare,
        totalValue,
        commission,
        timestamp,
        category: item.category || 'long-term',
        currency,
        realizedPL,
        realizedPLPercent,
      });
      existingSet.add(key); // Add to set to prevent duplicates within the import file itself
      addedCount++;
    }

    if (newTransactions.length > 0) {
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
    }

    return { added: addedCount, skipped: skippedCount };
  }, [transactions, isAuthenticated, isGapiReady, spreadsheetId]);

  const resetPortfolio = useCallback(async () => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      return;
    }

    setIsLoading(true);
    try {
      // 1. Clear local data
      const { resetLocalData } = await import('@/services/offlineStorage');
      resetLocalData();

      // 2. Clear remote data if online
      if (isAuthenticated && isGapiReady && spreadsheetId && isOnline()) {
        const { clearTransactionsFromSheet } = await import('@/services/sheetsService');
        await clearTransactionsFromSheet(spreadsheetId);
      }

      // 3. Reset state
      setTransactions([]);
      setPendingCount(0);
      setLastSyncedState(null);

      // 4. Force reload or just clear state? State clear is enough.
    } catch (error) {
      console.error('Failed to reset portfolio:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isGapiReady, spreadsheetId]);

  const deleteCategory = useCallback((categoryName: string) => {
    // Add to hidden list
    const updatedHidden = Array.from(new Set([...hiddenCategories, categoryName]));
    setHiddenCategories(updatedHidden);
    saveHiddenCategories(updatedHidden);

    // Remove from custom list
    const updatedCustom = customCategories.filter(c => c !== categoryName);
    setCustomCategories(updatedCustom);
    saveCustomCategories(updatedCustom);
  }, [customCategories, hiddenCategories]);

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
    resetPortfolio,
    exchangeRate,
    customCategories,
    deleteCategory,
    setManualPrice: (ticker: string, price: number) => {
      saveManualPrice(ticker, price);
      setManualPrices(prev => ({ ...prev, [ticker]: price }));
    },
    recalculateHistory,
    currency,
    setCurrency,
    manualPrices,
  };
}

