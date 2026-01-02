// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// API Scopes required for the application
export const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// Spreadsheet configuration
export const SPREADSHEET_NAME = 'Invest-Tracker Portfolio Data';
export const TRANSACTIONS_SHEET_NAME = 'Transactions';
export const CONFIG_SHEET_NAME = 'Config'; // For stock splits, adjustments, etc.
