import { Transaction } from '@/types/portfolio';

const TRANSACTIONS_KEY = 'invest_tracker_transactions';
const PENDING_CHANGES_KEY = 'invest_tracker_pending_changes';
const LAST_SYNCED_KEY = 'invest_tracker_last_synced';
const SPREADSHEET_ID_KEY = 'invest_tracker_spreadsheet_id';

export type ChangeType = 'add' | 'update' | 'delete';

export interface PendingChange {
    id: string;
    type: ChangeType;
    transaction?: Transaction;
    timestamp: Date;
}

// Save transactions to localStorage
export function saveTransactions(transactions: Transaction[]): void {
    try {
        const serialized = transactions.map(t => ({
            ...t,
            timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : t.timestamp,
        }));
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(serialized));
    } catch (error) {
        console.error('Failed to save transactions to localStorage:', error);
    }
}

// Load transactions from localStorage
export function loadTransactions(): Transaction[] {
    try {
        const data = localStorage.getItem(TRANSACTIONS_KEY);
        if (!data) return [];

        const parsed = JSON.parse(data);
        return parsed.map((t: Record<string, unknown>) => ({
            ...t,
            timestamp: new Date(t.timestamp as string),
        }));
    } catch (error) {
        console.error('Failed to load transactions from localStorage:', error);
        return [];
    }
}

// Queue a change for later sync
export function queueChange(change: PendingChange): void {
    try {
        const pending = getPendingChanges();

        // If there's already a pending change for this ID, update it
        const existingIndex = pending.findIndex(p => p.id === change.id);
        if (existingIndex >= 0) {
            // If original was 'add' and new is 'delete', remove both
            if (pending[existingIndex].type === 'add' && change.type === 'delete') {
                pending.splice(existingIndex, 1);
            } else if (pending[existingIndex].type === 'add' && change.type === 'update') {
                // Keep as 'add' but with updated data
                pending[existingIndex].transaction = change.transaction;
            } else {
                pending[existingIndex] = change;
            }
        } else {
            pending.push(change);
        }

        localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pending.map(p => ({
            ...p,
            timestamp: p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp,
            transaction: p.transaction ? {
                ...p.transaction,
                timestamp: p.transaction.timestamp instanceof Date
                    ? p.transaction.timestamp.toISOString()
                    : p.transaction.timestamp,
            } : undefined,
        }))));
    } catch (error) {
        console.error('Failed to queue change:', error);
    }
}

// Get all pending changes
export function getPendingChanges(): PendingChange[] {
    try {
        const data = localStorage.getItem(PENDING_CHANGES_KEY);
        if (!data) return [];

        const parsed = JSON.parse(data);
        return parsed.map((p: Record<string, unknown>) => ({
            ...p,
            timestamp: new Date(p.timestamp as string),
            transaction: p.transaction ? {
                ...(p.transaction as Record<string, unknown>),
                timestamp: new Date((p.transaction as Record<string, unknown>).timestamp as string),
            } : undefined,
        }));
    } catch (error) {
        console.error('Failed to get pending changes:', error);
        return [];
    }
}

// Clear all pending changes
export function clearPendingChanges(): void {
    localStorage.removeItem(PENDING_CHANGES_KEY);
}

// Get last synced timestamp
export function getLastSynced(): Date | null {
    try {
        const data = localStorage.getItem(LAST_SYNCED_KEY);
        return data ? new Date(data) : null;
    } catch {
        return null;
    }
}

// Set last synced timestamp
export function setLastSynced(date: Date): void {
    localStorage.setItem(LAST_SYNCED_KEY, date.toISOString());
}

// Get saved spreadsheet ID
export function getSpreadsheetId(): string | null {
    return localStorage.getItem(SPREADSHEET_ID_KEY);
}

// Save spreadsheet ID
export function saveSpreadsheetId(id: string): void {
    localStorage.setItem(SPREADSHEET_ID_KEY, id);
}

// Check if online
export function isOnline(): boolean {
    return navigator.onLine;
}

// Check if there are pending changes
export function hasPendingChanges(): boolean {
    return getPendingChanges().length > 0;
}
