import { Transaction } from "@/types/portfolio";

const CORS_PROXY = 'https://corsproxy.io/?';
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3/simple/price';

export interface StockPrice {
    date: Date;
    price: number;
}

export interface HistoricalData {
    ticker: string;
    prices: StockPrice[];
}

interface PriceProvider {
    name: string;
    getPrice(ticker: string, currency: 'THB' | 'USD'): Promise<number | null>;
}

// --- Providers ---

const YahooFinanceProvider: PriceProvider = {
    name: 'Yahoo Finance',
    async getPrice(ticker: string, currency: 'THB' | 'USD'): Promise<number | null> {
        try {
            let searchTicker = ticker;

            if (ticker.toUpperCase().includes('GOLD')) {
                searchTicker = 'GC=F'; // Switch to Gold Futures which is more reliable than XAUUSD=X on Yahoo
            } else if (currency === 'USD') {
                searchTicker = ticker;
            } else if (!ticker.includes('.') && !ticker.includes('=')) {
                searchTicker = `${ticker}.BK`;
            }

            const url = `${YAHOO_BASE_URL}/${searchTicker}?interval=1d&range=5d`;

            // Try primary proxy
            let fetchUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
            let response = await fetch(fetchUrl);

            // If primary proxy fails (404/500), try backup proxy
            if (!response.ok) {
                // Secondary proxy: allorigins
                fetchUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                response = await fetch(fetchUrl);
            }

            if (!response.ok) return null;

            const data = await response.json();
            if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                const closes = data.chart.result[0].indicators.quote[0].close;
                for (let i = closes.length - 1; i >= 0; i--) {
                    if (closes[i] != null && closes[i] > 0) {
                        let finalPrice = closes[i];

                        // Automatic conversion to THB if requested and likely USD source
                        const isThai = ticker.includes('.BK');
                        const isExchangeRate = ticker === 'USDTHB=X';

                        if (currency === 'THB' && !isThai && !isExchangeRate) {
                            const rate = await fetchExchangeRate();
                            finalPrice = finalPrice * rate;
                        }
                        return finalPrice;
                    }
                }
            }
            return null;
        } catch (error) {
            // console.warn(`Yahoo Finance fetch failed for ${ticker}:`, error);
            return null;
        }
    }
};

const CoinGeckoProvider: PriceProvider = {
    name: 'CoinGecko',
    async getPrice(ticker: string, currency: 'THB' | 'USD'): Promise<number | null> {
        try {
            // Mapping for CoinGecko IDs
            let coinId = '';
            if (ticker.toUpperCase().includes('GOLD')) coinId = 'pax-gold'; // Proxy for Gold
            else if (ticker.toUpperCase() === 'BTC') coinId = 'bitcoin';
            else if (ticker.toUpperCase() === 'ETH') coinId = 'ethereum';
            else return null;

            const targetCurrency = currency.toLowerCase();
            const url = `${COINGECKO_BASE_URL}?ids=${coinId}&vs_currencies=${targetCurrency}`;

            // Try direct first
            let response = await fetch(url);

            // If CORS fails or other error, try proxy
            if (!response.ok) {
                response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
            }

            if (!response.ok) return null;

            const data = await response.json();
            if (data[coinId] && data[coinId][targetCurrency]) {
                return data[coinId][targetCurrency];
            }
            return null;
        } catch (error) {
            // console.warn(`CoinGecko fetch failed for ${ticker}:`, error);
            // Suppress log to avoid spam
            return null;
        }
    }
};

const PROVIDERS: PriceProvider[] = [YahooFinanceProvider, CoinGeckoProvider];

// --- Exported Functions ---

export async function fetchHistoricalPrices(ticker: string, range: string = '5y', interval: string = '1d', currency?: string): Promise<StockPrice[]> {
    // Keep existing implementation for historical charts (charts usually need more data, distinct from current price)
    // For now, relies on Yahoo as it's the only one providing compatible historical data format here.
    try {
        let symbol = ticker;
        if (ticker.toUpperCase().includes('GOLD')) {
            symbol = 'XAUUSD=X';
        } else if (currency === 'USD' || ticker.includes('.') || ticker.includes('=')) {
            symbol = ticker;
        } else {
            symbol = `${ticker}.BK`;
        }

        const url = `${YAHOO_BASE_URL}/${symbol}?interval=${interval}&range=${range}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);

        if (!response.ok) throw new Error(`Failed to fetch data for ${ticker}`);

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) return [];

        const timestamps = result.timestamp;
        const closes = result.indicators.quote[0].close;

        return timestamps.map((timestamp: number, index: number) => ({
            date: new Date(timestamp * 1000),
            price: closes[index] || 0
        })).filter((item: StockPrice) => item.price > 0);

    } catch (error) {
        console.error(`Error fetching historical prices for ${ticker}:`, error);
        return [];
    }
}

const PRICE_CACHE: Record<string, { price: number; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchCurrentPrices(items: { ticker: string; currency: 'THB' | 'USD' }[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const exchangeRate = await fetchExchangeRate();

    const promises = items.map(async ({ ticker, currency }) => {
        const cacheKey = `${ticker}-${currency}`;
        const cached = PRICE_CACHE[cacheKey];
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            prices[ticker] = cached.price;
            return;
        }

        let price: number | null = null;

        for (const provider of PROVIDERS) {
            price = await provider.getPrice(ticker, currency);
            if (price !== null) {
                break;
            }
        }

        if (price !== null) {
            prices[ticker] = price;
            PRICE_CACHE[cacheKey] = { price, timestamp: Date.now() };
        } else {
            console.warn(`All providers failed for ${ticker}`);
        }
    });

    await Promise.all(promises);
    return prices;
}

export function findPriceOnDate(prices: StockPrice[], date: Date): number | null {
    const targetTime = date.getTime();
    const sortedPrices = [...prices].sort((a, b) => a.date.getTime() - b.date.getTime());
    let closestPrice = null;

    for (const pricePoint of sortedPrices) {
        const priceTime = pricePoint.date.getTime();
        if (pricePoint.date.toDateString() === date.toDateString()) return pricePoint.price;
        if (priceTime < targetTime) closestPrice = pricePoint.price;
        else break;
    }
    return closestPrice;
}

// Cache for exchange rate
let exchangeRateCache: { rate: number; timestamp: number } | null = null;

export async function fetchExchangeRate(): Promise<number> {
    // Check cache
    if (exchangeRateCache && Date.now() - exchangeRateCache.timestamp < CACHE_DURATION) {
        return exchangeRateCache.rate;
    }

    try {
        // Try Yahoo first for rate
        const yahooData = await YahooFinanceProvider.getPrice('USDTHB=X', 'USD'); // Currency arg irrelevant for rate ticker
        if (yahooData) {
            exchangeRateCache = { rate: yahooData, timestamp: Date.now() };
            return yahooData;
        }

        return 34.5;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return 34.5;
    }
}
