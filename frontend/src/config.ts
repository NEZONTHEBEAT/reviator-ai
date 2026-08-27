``` ts
/**
 * Central config for the Reviator AI frontend.
 *
 * API requests are sent to the deployed Render backend in production.
 * For local development, Vite uses VITE_API_BASE_URL from .env.local.
 */

const DEFAULT_API_BASE_URL = "https://reviator-ai-backend.onrender.com";

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  DEFAULT_API_BASE_URL;

export const ENDPOINTS = {
  health: "/api/health",

  analyseTransaction: "/api/transactions/",

  runAgent: (transactionId: string) =>
    `/api/transactions/${encodeURIComponent(transactionId)}/agent`,

  getTransaction: (transactionId: string) =>
    `/api/transactions/${encodeURIComponent(transactionId)}`,

  executeRecovery: (transactionId: string) =>
    `/api/transactions/${encodeURIComponent(transactionId)}/execute`,

  updateActionStatus: (actionId: string) =>
    `/api/transactions/recovery-actions/${encodeURIComponent(actionId)}/status`,

  getRecoveryActions: (transactionId: string) =>
    `/api/transactions/${encodeURIComponent(transactionId)}/recovery-actions`,

  authGoogle: "/api/auth/google",
  otpSend: "/api/auth/otp/send",
  otpVerify: "/api/auth/otp/verify",
} as const;

/** How often the navbar re-checks backend connectivity, in ms. */
export const HEALTH_POLL_INTERVAL = 15_000;

export const THEME_STORAGE_KEY = "reviator-theme";
export const HISTORY_STORAGE_KEY = "reviator-transaction-history";
export const HISTORY_LIMIT = 50;

/** Set the real Google OAuth Web Client ID to enable Google Sign-In. */
export const GOOGLE_CLIENT_ID =
  "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com";
```
