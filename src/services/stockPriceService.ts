import { Transaction } from "@/types/portfolio";

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export interface StockPrice {
    date: Date;
    price: number;
}

export interface HistoricalData {
    ticker: string;
    prices: StockPrice[];
}

export async function fetchHistoricalPrices(ticker: string, range: string = '5y', interval: string = '1d', currency?: string): Promise<StockPrice[]> {
    try {
        let symbol = ticker;

        // Special handling for Gold (Dime MTS-GOLD style)
        if (ticker.toUpperCase().includes('GOLD')) {
            symbol = 'XAUUSD=X'; // Gold Spot Price (More reliable than GC=F)
        } else if (currency === 'USD' || ticker.includes('.') || ticker.includes('=')) {
            // Suffix already present or definitely international
            symbol = ticker;
        } else {
            // Default to Thai stock if no suffix
            symbol = `${ticker}.BK`;
        }

        const url = `${YAHOO_BASE_URL}/${symbol}?interval=${interval}&range=${range}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch data for ${ticker}`);
        }

        const data = await response.json();

        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            return [];
        }

        const result = data.chart.result[0];

        if (!result) {
            return [];
        }

        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        const closes = quotes.close;

        return timestamps.map((timestamp: number, index: number) => ({
            date: new Date(timestamp * 1000),
            price: closes[index] || 0
        })).filter((item: StockPrice) => item.price > 0);

    } catch (error) {
        console.error(`Error fetching historical prices for ${ticker}:`, error);
        return [];
    }
}

export async function fetchCurrentPrices(items: { ticker: string; currency: 'THB' | 'USD' }[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    // Fetch in parallel
    const promises = items.map(async ({ ticker, currency }) => {
        try {
            // Special fallback logic for Gold
            let searchTicker = ticker;
            if (ticker.toUpperCase().includes('GOLD')) {
                searchTicker = 'XAUUSD=X';
            } else if (currency !== 'USD' && !ticker.includes('.') && !ticker.includes('=')) {
                searchTicker = `${ticker}.BK`;
            }

            // Use 5d range to ensure we find a closing price even on weekends/holidays
            let data = await fetchHistoricalPrices(searchTicker, '5d', '1d', currency);

            // Fallback for Gold if XAUUSD=X fails
            if (ticker.toUpperCase().includes('GOLD') && (!data || data.length === 0)) {
                console.warn('XAUUSD=X failed, trying GC=F fallback');
                data = await fetchHistoricalPrices('GC=F', '5d', '1d', currency);
            }

            if (data.length > 0) {
                // Get the last available price
                prices[ticker] = data[data.length - 1].price;
            } else {
                // Determine fallback only if we really can't find it
                console.warn(`No price found for ${ticker} (searched as ${searchTicker})`);
            }
        } catch (error) {
            console.error(`Failed to fetch current price for ${ticker}`, error);
        }
    });

    await Promise.all(promises);
    return prices;
}

export function findPriceOnDate(prices: StockPrice[], date: Date): number | null {
    // Find price on the specific date or the closest previous date (if market closed)
    const targetTime = date.getTime();

    // Sort just in case
    const sortedPrices = [...prices].sort((a, b) => a.date.getTime() - b.date.getTime());

    let closestPrice = null;

    for (const pricePoint of sortedPrices) {
        const priceTime = pricePoint.date.getTime();
        // Check if same day (ignoring time)
        const isSameDay = pricePoint.date.toDateString() === date.toDateString();

        if (isSameDay) {
            return pricePoint.price;
        }

        if (priceTime < targetTime) {
            closestPrice = pricePoint.price;
        } else {
            // We passed the date
            break;
        }
    }

    return closestPrice;
}

export async function fetchExchangeRate(): Promise<number> {
    try {
        const data = await fetchHistoricalPrices('USDTHB=X', '1d', '1d', 'USD');
        if (data.length > 0) {
            return data[data.length - 1].price;
        }
        return 34.5; // Fallback rate
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return 34.5;
    }
}
