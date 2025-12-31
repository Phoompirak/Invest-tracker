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

            // Determine the correct Yahoo Finance symbol
            if (ticker.toUpperCase().includes('GOLD')) {
                searchTicker = 'XAUUSD=X';
            } else if (currency === 'USD') {
                searchTicker = ticker;
            } else if (!ticker.includes('.') && !ticker.includes('=')) {
                searchTicker = `${ticker}.BK`;
            }

            const url = `${YAHOO_BASE_URL}/${searchTicker}?interval=1d&range=5d`;
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);

            if (!response.ok) return null;

            const data = await response.json();
            if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                const closes = data.chart.result[0].indicators.quote[0].close;
                for (let i = closes.length - 1; i >= 0; i--) {
                    if (closes[i] != null && closes[i] > 0) {
                        return closes[i];
                    }
                }
            }
            return null;
        } catch (error) {
            console.warn(`Yahoo Finance fetch failed for ${ticker}:`, error);
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
            else return null; // Only support specific crypto/assets

            const targetCurrency = currency.toLowerCase(); // 'thb' or 'usd'
            const url = `${COINGECKO_BASE_URL}?ids=${coinId}&vs_currencies=${targetCurrency}`;

            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();
            if (data[coinId] && data[coinId][targetCurrency]) {
                return data[coinId][targetCurrency];
            }
            return null;
        } catch (error) {
            console.warn(`CoinGecko fetch failed for ${ticker}:`, error);
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

export async function fetchCurrentPrices(items: { ticker: string; currency: 'THB' | 'USD' }[]): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};
    const exchangeRate = await fetchExchangeRate(); // Need rate for conversions if backup provider currency differs (simplified here: provider handles currency request)

    const promises = items.map(async ({ ticker, currency }) => {
        let price: number | null = null;

        for (const provider of PROVIDERS) {
            price = await provider.getPrice(ticker, currency);
            if (price !== null) {
                // Gold Conversion Logic (if source is USD/oz but needed THB/gram or similar adjustments)
                // Note: CoinGecko 'pax-gold' in 'thb' is already price per coin (approx per oz).
                // API for Gold via Yahoo is XAUUSD=X (USD/oz).

                // If ticker is GOLD, we need to ensure standardized unit (e.g. THB per gram for User's MTS-GOLD?)
                // User's previous request implies MTS-GOLD is THB based.
                // standard XAU price is per Troy Oz. 1 Troy Oz = 31.1035 gram.
                // If ticker is GOLD and we got price (likely per Oz), let's normalize if needed.
                // However, without strict unit metadata from user, we assume the API returns "Market Price" compatible with "Shares/Units".
                // For MTS-GOLD (Thai), 1 unit might be 1 gram? Or 1 Baht-weight?
                // User said "1.61504 ออนซ์" (Ounces). So if we get price per Oz, we are good!

                // Correction: User said "MTS-GOLD 1.61504 ออนซ์". So Price/Oz is correct.
                // If Yahoo returns XAUUSD=X in USD, and user currency is THB, we must convert USD->THB.
                // YahooProvider handles symbol selection but returns values in that symbol's currency.
                // XAUUSD=X is in USD.

                if (ticker.toUpperCase().includes('GOLD') && provider.name === 'Yahoo Finance') {
                    // Yahoo XAUUSD=X is in USD. If user wanted THB, we must convert.
                    if (currency === 'THB') {
                        price = price * exchangeRate;
                    }
                }

                console.log(`Fetched ${ticker} via ${provider.name}: ${price}`);
                break; // Stop at first success
            }
        }

        if (price !== null) {
            prices[ticker] = price;
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

export async function fetchExchangeRate(): Promise<number> {
    try {
        // Try Yahoo first for rate
        const yahooData = await YahooFinanceProvider.getPrice('USDTHB=X', 'USD'); // Currency arg irrelevant for rate ticker
        if (yahooData) return yahooData;

        return 34.5;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return 34.5;
    }
}
