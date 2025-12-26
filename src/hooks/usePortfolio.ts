import { useState, useCallback, useMemo } from 'react';
import { Transaction, Holding, PortfolioSummary, TransactionType, PortfolioCategory, FilterOptions } from '@/types/portfolio';

// Sample data for demonstration
const initialTransactions: Transaction[] = [
  {
    id: '1',
    ticker: 'PTT',
    type: 'buy',
    shares: 100,
    pricePerShare: 35.50,
    totalValue: 3550,
    commission: 15,
    timestamp: new Date('2024-01-15'),
    category: 'long-term',
  },
  {
    id: '2',
    ticker: 'SCB',
    type: 'buy',
    shares: 200,
    pricePerShare: 120.00,
    totalValue: 24000,
    commission: 25,
    timestamp: new Date('2024-02-01'),
    category: 'securities',
  },
  {
    id: '3',
    ticker: 'KBANK',
    type: 'buy',
    shares: 150,
    pricePerShare: 145.00,
    totalValue: 21750,
    commission: 20,
    timestamp: new Date('2024-03-10'),
    category: 'long-term',
  },
  {
    id: '4',
    ticker: 'DELTA',
    type: 'buy',
    shares: 50,
    pricePerShare: 580.00,
    totalValue: 29000,
    commission: 30,
    timestamp: new Date('2024-04-05'),
    category: 'speculation',
  },
  {
    id: '5',
    ticker: 'PTT',
    type: 'sell',
    shares: 50,
    pricePerShare: 38.00,
    totalValue: 1900,
    commission: 10,
    timestamp: new Date('2024-06-01'),
    category: 'long-term',
    relatedBuyId: '1',
    realizedPL: 115,
    realizedPLPercent: 6.48,
  },
];

// Simulated current prices
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
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  const addTransaction = useCallback((
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

    setTransactions(prev => [...prev, newTransaction]);
    return newTransaction;
  }, [transactions]);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

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
  };
}
