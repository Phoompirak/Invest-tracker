// Web Worker for FIFO P/L calculations
// This runs in a separate thread to avoid blocking the UI

interface Transaction {
    id: string;
    type: 'buy' | 'sell' | 'dividend';
    ticker: string;
    shares: number;
    pricePerShare: number;
    totalValue: number;
    commission: number;
    category: string;
    timestamp: Date;
    currency?: string;
    realizedPL?: number;
    realizedPLPercent?: number;
}

interface StockSplit {
    id: string;
    ticker: string;
    ratio: number;
    effectiveDate: Date | string;
}

interface Lot {
    id: string;
    shares: number;
    costPerShare: number;
    remaining: number;
}

function applySplits(transactions: Transaction[], splits: StockSplit[]): Transaction[] {
    if (!splits || splits.length === 0) return transactions;

    // Deep copy transactions to avoid mutating original
    const adjusted = transactions.map(t => ({ ...t, timestamp: new Date(t.timestamp) }));

    // Sort splits by date (oldest first)
    // Note: If multiple splits happen, order matters?
    // Usually splits are applied chronologically.
    const sortedSplits = [...splits].sort((a, b) =>
        new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    for (const split of sortedSplits) {
        const splitDate = new Date(split.effectiveDate);
        const ratio = split.ratio;

        // Apply to all transactions BEFORE the split date
        for (const t of adjusted) {
            if (t.ticker === split.ticker && t.timestamp < splitDate) {
                // Adjust shares and price
                // Example: 2:1 split. Ratio = 2.
                // Old: 10 shares @ 100.
                // New: 20 shares @ 50.
                t.shares = t.shares * ratio;
                t.pricePerShare = t.pricePerShare / ratio;
                // totalValue stays same (roughly, ignoring floating point)
                // t.commission stays same? Usually yes, commission was paid in past.
            }
        }
    }

    return adjusted;
}

function recalculateFIFO(transactions: Transaction[], splits: StockSplit[]): Transaction[] {
    // 0. Apply stock splits to generate "Adjusted History"
    const adjustedTransactions = applySplits(transactions, splits);

    // 1. Sort all transactions by date
    const sorted = adjustedTransactions.sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
    );

    // 2. Track inventory PER TICKER
    const inventoryByTicker = new Map<string, Lot[]>();

    const updatedTransactions = sorted.map(t => {
        if (t.type === 'buy') {
            // Cost per share = (totalValue + commission) / shares
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

            // Match with available inventory (FIFO)
            for (const lot of tickerInventory) {
                if (sharesToSell <= 0.000001) break;
                if (lot.remaining <= 0.000001) continue;

                const taking = Math.min(lot.remaining, sharesToSell);
                totalCost += taking * lot.costPerShare;

                lot.remaining -= taking;
                sharesToSell -= taking;
            }

            // Calculate P/L
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

    return updatedTransactions;
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<{ type: string; transactions: Transaction[]; stockSplits?: StockSplit[] }>) => {
    const { type, transactions, stockSplits } = event.data;

    if (type === 'recalculate') {
        try {
            const result = recalculateFIFO(transactions, stockSplits || []);
            self.postMessage({ type: 'success', transactions: result });
        } catch (error) {
            self.postMessage({ type: 'error', error: String(error) });
        }
    }
};

export { };
