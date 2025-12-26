// Google OAuth Configuration
export const GOOGLE_CLIENT_ID = '983559703202-doi5ns897abucpana9tlr44sag7lbikl.apps.googleusercontent.com';

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
