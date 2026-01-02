import { Transaction, PortfolioCategory, TransactionType, StockSplit } from '@/types/portfolio';
import { SPREADSHEET_NAME, TRANSACTIONS_SHEET_NAME, CONFIG_SHEET_NAME } from '@/config/authConfig';
import {
    getSpreadsheetId,
    saveSpreadsheetId,
    getPendingChanges,
    clearPendingChanges,
    PendingChange,
    setLastSynced,
} from './offlineStorage';

// ============================================================================
//  CACHE & ERROR HANDLING UTILITIES
// ============================================================================

/** Simple In-Memory Cache */
class CacheManager {
    private cache = new Map<string, { data: any; expires: number }>();

    set(key: string, data: any, ttlMs: number = 60000) {
        this.cache.set(key, {
            data,
            expires: Date.now() + ttlMs,
        });
    }

    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        return item.data as T;
    }

    clear(key: string) {
        // Clear exact key or prefix match (if needed)
        this.cache.delete(key);
        // Also clear if key is a prefix? Simple for now.
        console.log(`Cache cleared for: ${key}`);
    }

    clearAll() {
        this.cache.clear();
    }
}

export const sheetsCache = new CacheManager();

/**
 * Retry wrapper for API calls
 * @param fn - Async function to retry
 * @param retries - Number of retries (default 3)
 * @param delayMs - Initial delay in ms (default 1000)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries <= 0) throw error;

        // Check error status
        const status = error.status || (error.result && error.result.error && error.result.error.code);

        // Don't retry on Auth errors (401, 403) or Not Found (404)
        if (status === 401 || status === 403 || status === 404) {
            throw error;
        }

        // Retry on Rate Limit (429) or Server Errors (5xx)
        if (status === 429 || (status >= 500 && status < 600)) {
            console.warn(`API Error ${status}. Retrying in ${delayMs}ms... (${retries} left)`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return withRetry(fn, retries - 1, delayMs * 2); // Exponential backoff
        }

        throw error;
    }
}

// Column indices for the Transactions sheet
const COLUMNS = {
    ID: 0,
    TICKER: 1,
    TYPE: 2,
    SHARES: 3,
    PRICE_PER_SHARE: 4,
    TOTAL_VALUE: 5,
    COMMISSION: 6,
    TIMESTAMP: 7,
    CATEGORY: 8,
    RELATED_BUY_ID: 9,
    REALIZED_PL: 10,
    REALIZED_PL_PERCENT: 11,
    WITHHOLDING_TAX: 12,
    CURRENCY: 13,
};

const HEADER_ROW = ['ID', 'Ticker', 'Type', 'Shares', 'PricePerShare', 'TotalValue', 'Commission', 'Timestamp', 'Category', 'RelatedBuyId', 'RealizedPL', 'RealizedPLPercent', 'WithholdingTax', 'Currency'];

// Lock to prevent race condition when creating spreadsheet
let spreadsheetCreationPromise: Promise<string> | null = null;

// Find existing spreadsheet or create a new one
export async function findOrCreateSpreadsheet(): Promise<string> {
    // If there's already a creation in progress, wait for it
    if (spreadsheetCreationPromise) {
        console.log('Spreadsheet creation already in progress, waiting...');
        return spreadsheetCreationPromise;
    }

    // Create the promise and store it
    spreadsheetCreationPromise = findOrCreateSpreadsheetInternal();

    try {
        const result = await spreadsheetCreationPromise;
        return result;
    } finally {
        // Clear the lock after completion (success or failure)
        spreadsheetCreationPromise = null;
    }
}

async function findOrCreateSpreadsheetInternal(): Promise<string> {
    // Check if we have a saved spreadsheet ID
    const savedId = getSpreadsheetId();
    if (savedId) {
        try {
            // Verify it still exists
            await window.gapi!.client.sheets.spreadsheets.get({ spreadsheetId: savedId });
            return savedId;
        } catch (error: any) {
            // If error is 404 (Not Found), continue to search/new
            // If error is 403 (Permission) or others, throw it!
            if (error.status === 404 || (error.result && error.result.error && error.result.error.code === 404)) {
                console.log('Saved spreadsheet not found (404), creating new one...');
            } else {
                console.error('Error verifying spreadsheet:', error);
                throw error; // Propagate 403/500 errors
            }
        }
    }

    // Search for existing spreadsheet in Drive
    try {
        const response = await window.gapi!.client.drive.files.list({
            q: `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (response.result.files && response.result.files.length > 0) {
            const spreadsheetId = response.result.files[0].id;
            saveSpreadsheetId(spreadsheetId);
            console.log('Found existing spreadsheet:', spreadsheetId);
            return spreadsheetId;
        }
    } catch (error) {
        console.error('Error searching for spreadsheet:', error);
        throw error; // Do NOT continue to create if search failed (e.g. 403)
    }

    // Create new spreadsheet
    try {
        console.log('Creating new spreadsheet...');
        const response = await window.gapi!.client.sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: SPREADSHEET_NAME,
                },
                sheets: [
                    {
                        properties: {
                            title: TRANSACTIONS_SHEET_NAME,
                        },
                    },
                ],
            },
        });

        const spreadsheetId = response.result.spreadsheetId;
        saveSpreadsheetId(spreadsheetId);
        console.log('Created new spreadsheet:', spreadsheetId);

        // Add header row
        await window.gapi!.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET_NAME}!A1:N1`,
            valueInputOption: 'RAW',
            resource: {
                values: [HEADER_ROW],
            },
        });

        return spreadsheetId;
    } catch (error) {
        console.error('Error creating spreadsheet:', error);
        throw error;
    }
}

// Convert sheet row to Transaction object
function rowToTransaction(row: string[]): Transaction {
    return {
        id: row[COLUMNS.ID] || '',
        ticker: row[COLUMNS.TICKER] || '',
        type: (row[COLUMNS.TYPE] || 'buy') as TransactionType,
        shares: parseFloat(row[COLUMNS.SHARES]) || 0,
        pricePerShare: parseFloat(row[COLUMNS.PRICE_PER_SHARE]) || 0,
        totalValue: parseFloat(row[COLUMNS.TOTAL_VALUE]) || 0,
        commission: parseFloat(row[COLUMNS.COMMISSION]) || 0,
        timestamp: new Date(row[COLUMNS.TIMESTAMP] || Date.now()),
        category: (row[COLUMNS.CATEGORY] || 'long-term') as PortfolioCategory,
        relatedBuyId: row[COLUMNS.RELATED_BUY_ID] || undefined,
        realizedPL: row[COLUMNS.REALIZED_PL] ? parseFloat(row[COLUMNS.REALIZED_PL]) : undefined,
        realizedPLPercent: row[COLUMNS.REALIZED_PL_PERCENT] ? parseFloat(row[COLUMNS.REALIZED_PL_PERCENT]) : undefined,
        withholdingTax: row[COLUMNS.WITHHOLDING_TAX] ? parseFloat(row[COLUMNS.WITHHOLDING_TAX]) : undefined,
        currency: (row[COLUMNS.CURRENCY] as 'THB' | 'USD') || 'THB',
    };
}

// Convert Transaction object to sheet row
function transactionToRow(t: Transaction): (string | number)[] {
    return [
        t.id,
        t.ticker,
        t.type,
        t.shares,
        t.pricePerShare,
        t.totalValue,
        t.commission,
        t.timestamp instanceof Date ? t.timestamp.toISOString() : t.timestamp,
        t.category,
        t.relatedBuyId || '',
        t.realizedPL ?? '',
        t.realizedPLPercent ?? '',
        t.withholdingTax ?? '',
        t.currency || 'THB',
    ];
}

// Fetch all transactions from the spreadsheet (with Cache & Retry)
export async function fetchTransactions(spreadsheetId: string, forceRefresh = false): Promise<Transaction[]> {
    const cacheKey = `transactions_${spreadsheetId}`;

    if (!forceRefresh) {
        const cached = sheetsCache.get<Transaction[]>(cacheKey);
        if (cached) {
            console.log('Using cached transactions');
            return cached;
        }
    }

    try {
        const result = await withRetry(async () => {
            const response = await window.gapi!.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${TRANSACTIONS_SHEET_NAME}!A2:N`,
            });
            return response.result.values;
        });

        const values = result;
        if (!values || values.length === 0) {
            sheetsCache.set(cacheKey, [], 60000); // Cache empty result for 1 min
            return [];
        }

        const transactions = values.map(row => rowToTransaction(row));
        sheetsCache.set(cacheKey, transactions, 300000); // Cache for 5 mins (write operations will invalidate)
        return transactions;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

// Add a single transaction to the spreadsheet
export async function addTransactionToSheet(spreadsheetId: string, transaction: Transaction): Promise<void> {
    try {
        await withRetry(async () => {
            await window.gapi!.client.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${TRANSACTIONS_SHEET_NAME}!A:N`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [transactionToRow(transaction)],
                },
            });
        });

        // Invalidate Cache
        sheetsCache.clear(`transactions_${spreadsheetId}`);
    } catch (error) {
        console.error('Error adding transaction:', error);
        throw error;
    }
}

// Find row number by transaction ID
async function findRowByTransactionId(spreadsheetId: string, transactionId: string): Promise<number | null> {
    try {
        const response = await window.gapi!.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET_NAME}!A:A`,
        });

        const values = response.result.values;
        if (!values) return null;

        for (let i = 0; i < values.length; i++) {
            if (values[i][0] === transactionId) {
                return i + 1; // 1-indexed
            }
        }
        return null;
    } catch (error) {
        console.error('Error finding row:', error);
        return null;
    }
}

// Update a transaction in the spreadsheet
export async function updateTransactionInSheet(spreadsheetId: string, transaction: Transaction): Promise<void> {
    const rowNumber = await findRowByTransactionId(spreadsheetId, transaction.id);
    if (!rowNumber) {
        console.warn('Transaction not found in sheet, adding instead');
        await addTransactionToSheet(spreadsheetId, transaction);
        return;
    }

    try {
        await withRetry(async () => {
            await window.gapi!.client.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${TRANSACTIONS_SHEET_NAME}!A${rowNumber}:N${rowNumber}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [transactionToRow(transaction)],
                },
            });
        });

        // Invalidate Cache
        sheetsCache.clear(`transactions_${spreadsheetId}`);
    } catch (error) {
        console.error('Error updating transaction:', error);
        throw error;
    }
}

// Delete a transaction from the spreadsheet
export async function deleteTransactionFromSheet(spreadsheetId: string, transactionId: string): Promise<void> {
    const rowNumber = await findRowByTransactionId(spreadsheetId, transactionId);
    if (!rowNumber) {
        console.warn('Transaction not found in sheet');
        return;
    }

    try {
        // Get sheet ID
        const spreadsheet = await window.gapi!.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheet.result.sheets?.find(s => s.properties.title === TRANSACTIONS_SHEET_NAME);
        const sheetId = sheet?.properties.sheetId ?? 0;

        // Delete the row
        await withRetry(async () => {
            await window.gapi!.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [
                        {
                            deleteRange: {
                                range: {
                                    sheetId,
                                    startRowIndex: rowNumber - 1,
                                    endRowIndex: rowNumber,
                                },
                                shiftDimension: 'ROWS',
                            },
                        },
                    ],
                },
            });
        });

        // Invalidate Cache
        sheetsCache.clear(`transactions_${spreadsheetId}`);
    } catch (error) {
        console.error('Error deleting transaction:', error);
        throw error;
    }
}

// Sync pending changes to the spreadsheet
export async function syncPendingChanges(spreadsheetId: string): Promise<boolean> {
    const pending = getPendingChanges();
    if (pending.length === 0) {
        return true;
    }

    try {
        for (const change of pending) {
            await processPendingChange(spreadsheetId, change);
        }

        clearPendingChanges();
        setLastSynced(new Date());
        return true;
    } catch (error) {
        console.error('Error syncing pending changes:', error);
        return false;
    }
}

async function processPendingChange(spreadsheetId: string, change: PendingChange): Promise<void> {
    switch (change.type) {
        case 'add':
            if (change.transaction) {
                await addTransactionToSheet(spreadsheetId, change.transaction);
            }
            break;
        case 'update':
            if (change.transaction) {
                await updateTransactionInSheet(spreadsheetId, change.transaction);
            }
            break;
        case 'delete':
            await deleteTransactionFromSheet(spreadsheetId, change.id);
            break;
    }
}

// Full sync: fetch from sheet and merge with local
export async function fullSync(spreadsheetId: string, localTransactions: Transaction[]): Promise<Transaction[]> {
    // First, sync any pending changes
    await syncPendingChanges(spreadsheetId);

    // Then fetch all transactions from sheet
    const remoteTransactions = await fetchTransactions(spreadsheetId, true); // Force refresh

    setLastSynced(new Date());
    return remoteTransactions;
}

/**
 * ลบ Transactions ซ้ำออกจาก Google Sheets อย่างถาวร
 * 
 * ⚠️ ใช้เมื่อตรวจพบว่า Sheets มีข้อมูลซ้ำ (แก้ปัญหา inflated P/L)
 * 
 * หลักการ:
 * 1. ดึงข้อมูลทั้งหมดจาก Sheets
 * 2. กรองเหลือเฉพาะ ID ที่ไม่ซ้ำ (เก็บตัวแรกที่เจอ)
 * 3. ลบข้อมูลเก่าทั้งหมดแล้วใส่ข้อมูลใหม่ที่ไม่ซ้ำ
 * 
 * @returns จำนวนรายการที่ถูกลบ
 */
export async function cleanupDuplicatesInSheet(spreadsheetId: string): Promise<{ removed: number; kept: number }> {
    try {
        // 1. Fetch all transactions
        const allTransactions = await fetchTransactions(spreadsheetId, true);

        // 2. Deduplicate by ID (keep first occurrence)
        const seenIds = new Set<string>();
        const uniqueTransactions: Transaction[] = [];
        const duplicateIds: string[] = [];

        allTransactions.forEach(t => {
            if (seenIds.has(t.id)) {
                duplicateIds.push(t.id);
            } else {
                seenIds.add(t.id);
                uniqueTransactions.push(t);
            }
        });

        if (duplicateIds.length === 0) {
            console.log('No duplicates found in Google Sheets.');
            return { removed: 0, kept: allTransactions.length };
        }

        console.log(`🔧 Cleaning up ${duplicateIds.length} duplicate transactions from Sheets...`);
        console.log('Duplicate IDs:', duplicateIds.slice(0, 10));

        // 3. Rewrite sheet with unique transactions only
        await saveAllTransactionsToSheet(spreadsheetId, uniqueTransactions);

        console.log(`✅ Cleanup complete. Removed ${duplicateIds.length}, kept ${uniqueTransactions.length}`);

        // Invalidate cache
        sheetsCache.clear(`transactions_${spreadsheetId}`);

        return { removed: duplicateIds.length, kept: uniqueTransactions.length };
    } catch (error) {
        console.error('Error cleaning up duplicates:', error);
        throw error;
    }
}
// Clear all transactions from the spreadsheet (keep header)
export async function clearTransactionsFromSheet(spreadsheetId: string): Promise<void> {
    try {
        await (window.gapi!.client.sheets.spreadsheets.values as any).clear({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET_NAME}!A2:N`,
        });
    } catch (error) {
        console.error('Error clearing transactions:', error);
        throw error;
    }
}

// Bulk save all transactions (overwrite sheet)
export async function saveAllTransactionsToSheet(spreadsheetId: string, transactions: Transaction[]): Promise<void> {
    try {
        // 1. Clear existing data
        await clearTransactionsFromSheet(spreadsheetId);

        if (transactions.length === 0) return;

        // 2. Prepare rows
        const rows = transactions.map(t => transactionToRow(t));

        // 3. Write new data in batch
        await window.gapi!.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET_NAME}!A2`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: rows,
            },
        });

        setLastSynced(new Date());
    } catch (error) {
        console.error('Error batch saving transactions:', error);
        throw error;
    }
}

// ==================== CONFIG SHEET FUNCTIONS ====================
// These functions manage metadata (stock splits, etc.) without modifying the Transactions sheet

const CONFIG_COLUMNS = {
    TYPE: 0,      // 'SPLIT' | 'ADJUSTMENT' | etc.
    ID: 1,
    TICKER: 2,
    VALUE: 3,     // For splits: ratio. For adjustments: value.
    DATE: 4,
    CREATED_AT: 5,
};

const CONFIG_HEADER_ROW = ['Type', 'ID', 'Ticker', 'Value', 'Date', 'CreatedAt'];

// Ensure Config sheet exists in the spreadsheet
export async function ensureConfigSheet(spreadsheetId: string): Promise<void> {
    try {
        // Check if sheet exists
        const response = await window.gapi!.client.sheets.spreadsheets.get({ spreadsheetId });
        const sheets = response.result.sheets || [];
        const configSheetExists = sheets.some(
            (s: any) => s.properties?.title === CONFIG_SHEET_NAME
        );

        if (configSheetExists) return;

        // Create the sheet
        await (window.gapi!.client.sheets.spreadsheets.batchUpdate as any)({
            spreadsheetId,
            resource: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: CONFIG_SHEET_NAME,
                            },
                        },
                    },
                ],
            },
        });

        // Add header row
        await window.gapi!.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${CONFIG_SHEET_NAME}!A1:F1`,
            valueInputOption: 'RAW',
            resource: {
                values: [CONFIG_HEADER_ROW],
            },
        });

        console.log('Config sheet created successfully');
    } catch (error) {
        console.error('Error ensuring config sheet:', error);
        throw error;
    }
}

// Fetch all stock splits from Config sheet
export async function fetchStockSplits(spreadsheetId: string, forceRefresh = false): Promise<StockSplit[]> {
    const cacheKey = `splits_${spreadsheetId}`;

    if (!forceRefresh) {
        const cached = sheetsCache.get<StockSplit[]>(cacheKey);
        if (cached) return cached;
    }

    try {
        await ensureConfigSheet(spreadsheetId);

        const result = await withRetry(async () => {
            const response = await window.gapi!.client.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${CONFIG_SHEET_NAME}!A2:F`,
            });
            return response.result.values;
        });

        const rows = result || [];
        const splits = rows
            .filter((row: any[]) => row[CONFIG_COLUMNS.TYPE] === 'SPLIT')
            .map((row: any[]) => ({
                id: row[CONFIG_COLUMNS.ID] || '',
                ticker: row[CONFIG_COLUMNS.TICKER] || '',
                ratio: parseFloat(row[CONFIG_COLUMNS.VALUE]) || 1,
                effectiveDate: new Date(row[CONFIG_COLUMNS.DATE]),
                createdAt: new Date(row[CONFIG_COLUMNS.CREATED_AT]),
            }));

        sheetsCache.set(cacheKey, splits, 600000); // Cache for 10 mins
        return splits;
    } catch (error) {
        console.error('Error fetching stock splits:', error);
        return [];
    }
}

// Add a new stock split to Config sheet
export async function addStockSplit(spreadsheetId: string, split: Omit<StockSplit, 'id' | 'createdAt'>): Promise<StockSplit> {
    try {
        await ensureConfigSheet(spreadsheetId);

        const newSplit: StockSplit = {
            ...split,
            id: crypto.randomUUID(),
            createdAt: new Date(),
        };

        const row = [
            'SPLIT',
            newSplit.id,
            newSplit.ticker,
            newSplit.ratio.toString(),
            newSplit.effectiveDate.toISOString(),
            newSplit.createdAt.toISOString(),
        ];

        await withRetry(async () => {
            await (window.gapi!.client.sheets.spreadsheets.values.append as any)({
                spreadsheetId,
                range: `${CONFIG_SHEET_NAME}!A:F`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [row] },
            });
        });

        // Invalidate Cache
        sheetsCache.clear(`splits_${spreadsheetId}`);

        console.log('Stock split added:', newSplit);
        return newSplit;
    } catch (error) {
        console.error('Error adding stock split:', error);
        throw error;
    }
}

// Delete a stock split from Config sheet
export async function deleteStockSplit(spreadsheetId: string, splitId: string): Promise<void> {
    try {
        // Fetch all rows to find the one to delete
        const response = await window.gapi!.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${CONFIG_SHEET_NAME}!A2:F`,
        });

        const rows = response.result.values || [];
        const rowIndex = rows.findIndex((row: any[]) => row[CONFIG_COLUMNS.ID] === splitId);

        if (rowIndex === -1) {
            console.warn('Stock split not found:', splitId);
            return;
        }

        // Get sheet ID for the Config sheet
        const sheetResponse = await window.gapi!.client.sheets.spreadsheets.get({ spreadsheetId });
        const configSheet = sheetResponse.result.sheets?.find(
            (s: any) => s.properties?.title === CONFIG_SHEET_NAME
        );

        if (!configSheet) return;

        const sheetId = configSheet.properties?.sheetId;

        // Delete the row (rowIndex + 2 because of 0-index and header row)
        await withRetry(async () => {
            await (window.gapi!.client.sheets.spreadsheets.batchUpdate as any)({
                spreadsheetId,
                resource: {
                    requests: [
                        {
                            deleteDimension: {
                                range: {
                                    sheetId,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex + 1, // +1 for header
                                    endIndex: rowIndex + 2,
                                },
                            },
                        },
                    ],
                },
            });
        });

        // Invalidate Cache
        sheetsCache.clear(`splits_${spreadsheetId}`);

        console.log('Stock split deleted:', splitId);
    } catch (error) {
        console.error('Error deleting stock split:', error);
        throw error;
    }
}
