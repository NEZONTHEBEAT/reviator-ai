/**
 * Types mirroring the REAL backend schema (app/models/transaction.py,
 * app/models/*_db.py, app/schemas/recovery_action.py — confirmed against
 * the pasted routes.py / Swagger UI, not guessed).
 */

export type BackendStatus = "checking" | "connected" | "disconnected";

export type TransactionStatus = "success" | "failed";
export type RecoveryPriority = "low" | "medium" | "high" | "critical";
export type RecoveryActionStatus = "created" | "pending" | "executed" | "completed" | "failed";

/** The known failure_reason values the scoring/decision logic actually
 * recognizes (see recovery_service.py + recovery_decision.py). Anything
 * else is accepted by the API but only gets the default score bump. */
export const FAILURE_REASONS = [
  { value: "insufficient_balance", label: "Insufficient balance" },
  { value: "card_declined", label: "Card declined" },
  { value: "bank_declined", label: "Bank declined" },
  { value: "payment_failed", label: "Payment failed" },
  { value: "expired_card", label: "Expired card" },
  { value: "invalid_card", label: "Invalid card" },
  { value: "network_error", label: "Network error" },
  { value: "gateway_error", label: "Gateway error" },
  { value: "timeout", label: "Timeout" },
  { value: "bank_timeout", label: "Bank timeout" },
  { value: "technical_error", label: "Technical error" },
  { value: "temporary_failure", label: "Temporary failure" },
] as const;

export interface TransactionInput {
  transaction_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  failure_reason?: string | null;
  previous_successful_payments: number;
  previous_failed_payments: number;
  revenue_at_risk: number;
  recovery_priority?: RecoveryPriority;
}

/** Response from POST /api/transactions/ — shape differs slightly for the
 * "not failed, no recovery needed" early-return branch (no customer_id/
 * amount/database_status in that case). */
export interface AnalyseTransactionResponse {
  transaction_id: string;
  customer_id?: string;
  amount?: number;
  currency?: string;
  failure_reason?: string | null;
  revenue_at_risk?: number;
  message?: string;
  recovery_score: number;
  recovery_probability: number;
  recovery_priority: RecoveryPriority;
  recommended_action: string;
  recovery_channel: string;
  reasons: string[];
  database_status?: string;
}

/** Response from GET /api/transactions/{id} */
export interface TransactionRecord {
  transaction_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  previous_successful_payments: number | null;
  previous_failed_payments: number | null;
  revenue_at_risk: number | null;
  recovery_score: number | null;
  recovery_probability: number | null;
  recovery_priority: string | null;
  recommended_action: string | null;
  recovery_channel: string | null;
}

/** Response from POST /api/transactions/{id}/agent — exact shape not yet
 * confirmed (run_recovery_agent isn't shared), so kept as a loose bag of
 * fields and rendered generically until that file is available. */
export type AgentResult = Record<string, unknown>;

export interface RecoveryAction {
  action_id: string;
  transaction_id: string;
  customer_id: string;
  action: string;
  channel: string;
  amount: number;
  status: RecoveryActionStatus | string;
}

export interface ExecuteRecoveryResponse {
  status: string; // "action_created" | "no_action_required"
  action_id?: string;
  transaction_id: string;
  customer_id?: string;
  action?: string;
  channel?: string;
  amount?: number;
  execution_status?: string;
  message?: string;
}

export interface RecoveryActionsListResponse {
  transaction_id: string;
  customer_id: string;
  total_actions: number;
  actions: RecoveryAction[];
}

/** Google ID-token sign-in payload sent to the backend. */
export interface GoogleAuthPayload {
  idToken: string;
}
export interface OtpSendPayload {
  phone: string;
}
export interface OtpVerifyPayload {
  phone: string;
  otp: string;
}
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
  };
}

export interface ApiErrorShape {
  message: string;
  status?: number;
}

/** One row of browser-local transaction history — used to drive the
 * Dashboard + Recent Analyses sections since the backend has no list
 * endpoint yet. Progressively enriched as the user analyses / executes /
 * updates a transaction. See src/services/history.ts. */
export interface HistoryEntry {
  transaction_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  recovery_priority?: RecoveryPriority;
  recovery_score?: number;
  recommended_action?: string;
  action_id?: string;
  action_status?: RecoveryActionStatus | string;
  updatedAt: string;
}
