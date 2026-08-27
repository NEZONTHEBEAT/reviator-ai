import { ENDPOINTS } from "../config.js";
import { apiFetch } from "./api.js";
import type {
  AgentResult,
  AnalyseTransactionResponse,
  ExecuteRecoveryResponse,
  RecoveryAction,
  RecoveryActionsListResponse,
  TransactionInput,
  TransactionRecord,
} from "../types/api.js";

export function analyseTransaction(input: TransactionInput): Promise<AnalyseTransactionResponse> {
  return apiFetch<AnalyseTransactionResponse>(ENDPOINTS.analyseTransaction, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function runAgent(transactionId: string): Promise<AgentResult> {
  return apiFetch<AgentResult>(ENDPOINTS.runAgent(transactionId), { method: "POST" });
}

export function getTransaction(transactionId: string): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(ENDPOINTS.getTransaction(transactionId));
}

export function executeRecovery(transactionId: string): Promise<ExecuteRecoveryResponse> {
  return apiFetch<ExecuteRecoveryResponse>(ENDPOINTS.executeRecovery(transactionId), { method: "POST" });
}

export function updateActionStatus(actionId: string, status: string): Promise<RecoveryAction> {
  return apiFetch<RecoveryAction>(ENDPOINTS.updateActionStatus(actionId), {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getRecoveryActions(transactionId: string): Promise<RecoveryActionsListResponse> {
  return apiFetch<RecoveryActionsListResponse>(ENDPOINTS.getRecoveryActions(transactionId));
}
