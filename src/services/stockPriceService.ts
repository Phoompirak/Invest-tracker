import { Transaction } from "@/types/portfolio";

const CORS_PROXY = 'https://corsproxy.io/?';
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
            let searchTicker = ticker;

            // Determine the correct Yahoo Finance symbol
            if (ticker.toUpperCase().includes('GOLD')) {
                searchTicker = 'XAUUSD=X';
            } else if (currency === 'USD') {
                // US stocks - use ticker as-is
                searchTicker = ticker;
            } else if (!ticker.includes('.') && !ticker.includes('=')) {
                // Thai stocks - add .BK suffix
                searchTicker = `${ticker}.BK`;
            }

            // Fetch with the processed ticker
            // Pass 'USD' as currency to prevent fetchHistoricalPrices from adding .BK suffix again
            const url = `${YAHOO_BASE_URL}/${searchTicker}?interval=1d&range=5d`;
            const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch for ${ticker}`);
            }

            const data = await response.json();

            if (data.chart && data.chart.result && data.chart.result.length > 0) {
                const result = data.chart.result[0];
                if (result && result.indicators && result.indicators.quote[0]) {
                    const closes = result.indicators.quote[0].close;
                    // Get the last non-null close price
                    for (let i = closes.length - 1; i >= 0; i--) {
                        if (closes[i] != null && closes[i] > 0) {
                            prices[ticker] = closes[i];
                            break;
                        }
                    }
                }
            }

            // Fallback for Gold if primary failed
            if (ticker.toUpperCase().includes('GOLD') && !prices[ticker]) {
                console.warn('XAUUSD=X failed, trying GC=F fallback');
                const fallbackUrl = `${YAHOO_BASE_URL}/GC=F?interval=1d&range=5d`;
                const fallbackResponse = await fetch(`${CORS_PROXY}${encodeURIComponent(fallbackUrl)}`);
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                        const closes = fallbackData.chart.result[0].indicators.quote[0].close;
                        for (let i = closes.length - 1; i >= 0; i--) {
                            if (closes[i] != null && closes[i] > 0) {
                                prices[ticker] = closes[i];
                                break;
                            }
                        }
                    }
                }
            }

            // Fallback for Thai stocks (.BK) => Try raw ticker (US) if failed
            // This helps if user forgot to set currency to USD for a US stock
            if (!prices[ticker] && searchTicker.endsWith('.BK')) {
                const rawTicker = ticker;
                console.warn(`${searchTicker} failed, trying raw ticker ${rawTicker} as fallback`);
                const rawUrl = `${YAHOO_BASE_URL}/${rawTicker}?interval=1d&range=5d`;
                try {
                    const rawResponse = await fetch(`${CORS_PROXY}${encodeURIComponent(rawUrl)}`);
                    if (rawResponse.ok) {
                        const rawData = await rawResponse.json();
                        if (rawData.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                            const closes = rawData.chart.result[0].indicators.quote[0].close;
                            for (let i = closes.length - 1; i >= 0; i--) {
                                if (closes[i] != null && closes[i] > 0) {
                                    prices[ticker] = closes[i];
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Fallback fetch for ${rawTicker} failed`, e);
                }
            }

            if (!prices[ticker]) {
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
