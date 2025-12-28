export type TransactionType = 'buy' | 'sell' | 'dividend';

export type PortfolioCategory = 'securities' | 'long-term' | 'speculation';

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
  category: PortfolioCategory;
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
