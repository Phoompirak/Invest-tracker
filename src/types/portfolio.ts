export type TransactionType = 'buy' | 'sell' | 'dividend';

// export type PortfolioCategory = 'securities' | 'long-term' | 'speculation';
export type PortfolioCategory = string; // Allow custom categories


export interface Transaction {
  id: string;
  ticker: string;
  type: TransactionType;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  commission: number;
  timestamp: Date;
  category: PortfolioCategory;
  relatedBuyId?: string; // For sell transactions linked to specific buy
  realizedPL?: number; // Profit/Loss for sell transactions
  realizedPLPercent?: number;
  dividendPerShare?: number; // For dividend transactions
  withholdingTax?: number; // Tax withheld on dividends
  currency?: 'THB' | 'USD';
  exchangeRate?: number; // Historical exchange rate at time of transaction
}

export interface Holding {
  ticker: string;
  totalShares: number;
  averageCost: number;
  totalInvested: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number; // Total realized P/L from all sell transactions
  category: PortfolioCategory;
  isClosed: boolean; // True if all shares have been sold
  hasPriceData: boolean; // True if we have valid price data (API or manual)
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalRealizedPL: number;
  totalUnrealizedPL: number;
  totalDividends: number;
  totalPL: number;
  totalPLPercent: number;
  bestPerformer: Holding | null;
  worstPerformer: Holding | null;
}

export interface FilterOptions {
  profitOnly: boolean;
  lossOnly: boolean;
  minProfitPercent?: number;
  maxLossPercent?: number;
  startDate?: Date;
  endDate?: Date;
  category?: PortfolioCategory;
  ticker?: string;
}
