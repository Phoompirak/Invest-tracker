import { Transaction, PortfolioCategory, TransactionType } from '@/types/portfolio';
import { SPREADSHEET_NAME, TRANSACTIONS_SHEET_NAME } from '@/config/authConfig';
import {
    getSpreadsheetId,
    saveSpreadsheetId,
    getPendingChanges,
    clearPendingChanges,
    PendingChange,
    setLastSynced,
} from './offlineStorage';

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

// Find existing spreadsheet or create a new one
export async function findOrCreateSpreadsheet(): Promise<string> {
    // Check if we have a saved spreadsheet ID
    const savedId = getSpreadsheetId();
    if (savedId) {
        try {
            // Verify it still exists
            await window.gapi!.client.sheets.spreadsheets.get({ spreadsheetId: savedId });
            return savedId;
        } catch {
            // Spreadsheet doesn't exist anymore, will create new one
            console.log('Saved spreadsheet not found, creating new one...');
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
            return spreadsheetId;
        }
    } catch (error) {
        console.error('Error searching for spreadsheet:', error);
    }

    // Create new spreadsheet
    try {
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

// Fetch all transactions from the spreadsheet
export async function fetchTransactions(spreadsheetId: string): Promise<Transaction[]> {
    try {
        const response = await window.gapi!.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET_NAME}!A2:N`,
        });

        const values = response.result.values;
        if (!values || values.length === 0) {
            return [];
        }

        return values.map(row => rowToTransaction(row));
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

// Add a single transaction to the spreadsheet
export async function addTransactionToSheet(spreadsheetId: string, transaction: Transaction): Promise<void> {
    try {
        await window.gapi!.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET_NAME}!A:N`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [transactionToRow(transaction)],
            },
        });
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
        await window.gapi!.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${TRANSACTIONS_SHEET_NAME}!A${rowNumber}:N${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [transactionToRow(transaction)],
            },
        });
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
    const remoteTransactions = await fetchTransactions(spreadsheetId);

    setLastSynced(new Date());
    return remoteTransactions;
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
