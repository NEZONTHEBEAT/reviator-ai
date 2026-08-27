import { analyseTransaction } from "../services/transaction-api.js";
import { ApiError } from "../services/api.js";
import { getBackendStatus, subscribeBackendStatus, checkNow } from "./backend-status.js";
import { lookupTransaction } from "./analysis-result.js";
import { generateId } from "../utils.js";
import type { AnalyseTransactionResponse, TransactionInput, TransactionStatus } from "../types/api.js";

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

let revenueAtRiskTouched = false;

function newIds(): void {
  const txnInput = el<HTMLInputElement>("txn-id-input");
  const custInput = el<HTMLInputElement>("customer-id-input");
  if (txnInput) txnInput.value = generateId("TXN");
  if (custInput) custInput.value = generateId("CUST");
}

function setFormError(message: string): void {
  const box = el("transaction-form-error");
  if (!box) return;
  box.textContent = message;
  box.classList.toggle("hidden", !message);
}

function readForm(): TransactionInput | null {
  const transactionId = el<HTMLInputElement>("txn-id-input")?.value.trim();
  const customerId = el<HTMLInputElement>("customer-id-input")?.value.trim();
  const amount = Number(el<HTMLInputElement>("amount-input")?.value);
  const currency = el<HTMLInputElement>("currency-input")?.value.trim() || "INR";
  const status = el<HTMLSelectElement>("status-select")?.value as TransactionStatus | undefined;
  const failureReason = el<HTMLSelectElement>("failure-reason-select")?.value || null;
  const prevSuccess = Number(el<HTMLInputElement>("prev-success-input")?.value || 0);
  const prevFailed = Number(el<HTMLInputElement>("prev-failed-input")?.value || 0);
  const revenueAtRisk = Number(el<HTMLInputElement>("revenue-at-risk-input")?.value || 0);

  if (!transactionId || !customerId) {
    setFormError("Transaction ID and Customer ID are required.");
    return null;
  }
  if (!amount || amount <= 0) {
    setFormError("Amount must be greater than 0.");
    return null;
  }
  if (!status) {
    setFormError("Pick a status.");
    return null;
  }
  if (prevSuccess < 0 || prevFailed < 0 || revenueAtRisk < 0) {
    setFormError("Payment counts and revenue at risk can't be negative.");
    return null;
  }

  return {
    transaction_id: transactionId,
    customer_id: customerId,
    amount,
    currency,
    status,
    failure_reason: status === "failed" ? failureReason : null,
    previous_successful_payments: prevSuccess,
    previous_failed_payments: prevFailed,
    revenue_at_risk: revenueAtRisk,
  };
}

function toggleFailureReasonVisibility(): void {
  const status = el<HTMLSelectElement>("status-select")?.value;
  el("failure-reason-wrap")?.classList.toggle("hidden", status !== "failed");
}

function setSubmitting(isSubmitting: boolean): void {
  const btn = el<HTMLButtonElement>("analyse-submit-btn");
  if (!btn) return;
  btn.disabled = isSubmitting || getBackendStatus() !== "connected";
  btn.textContent = isSubmitting ? "Analysing…" : "Analyse Transaction";
}

async function submitForm(): Promise<void> {
  setFormError("");
  const input = readForm();
  if (!input) return;

  setSubmitting(true);
  window.dispatchEvent(new CustomEvent("reviator:transaction-analysing", { detail: { input } }));

  try {
    const result = await analyseTransaction(input);
    window.dispatchEvent(
      new CustomEvent<{ input: TransactionInput; result: AnalyseTransactionResponse }>(
        "reviator:transaction-analysed",
        { detail: { input, result } }
      )
    );
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Something went wrong.";
    setFormError(message);
    window.dispatchEvent(new CustomEvent("reviator:transaction-error", { detail: { message } }));
  } finally {
    setSubmitting(false);
  }
}

export function initTransactionForm(): void {
  newIds();
  toggleFailureReasonVisibility();

  el("status-select")?.addEventListener("change", toggleFailureReasonVisibility);

  el("txn-id-regenerate-btn")?.addEventListener("click", () => {
    const input = el<HTMLInputElement>("txn-id-input");
    if (input) input.value = generateId("TXN");
  });
  el("txn-id-lookup-btn")?.addEventListener("click", () => {
    const id = el<HTMLInputElement>("txn-id-input")?.value.trim();
    if (id) void lookupTransaction(id);
  });
  el("customer-id-regenerate-btn")?.addEventListener("click", () => {
    const input = el<HTMLInputElement>("customer-id-input");
    if (input) input.value = generateId("CUST");
  });

  // Keep "revenue at risk" synced to amount until the user edits it directly.
  const amountInput = el<HTMLInputElement>("amount-input");
  const riskInput = el<HTMLInputElement>("revenue-at-risk-input");
  amountInput?.addEventListener("input", () => {
    if (!revenueAtRiskTouched && riskInput) riskInput.value = amountInput.value;
  });
  riskInput?.addEventListener("input", () => {
    revenueAtRiskTouched = true;
  });

  el("transaction-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    void submitForm();
  });

  el("txn-form-reset-btn")?.addEventListener("click", () => {
    revenueAtRiskTouched = false;
    setFormError("");
    window.dispatchEvent(new CustomEvent("reviator:transaction-reset"));
  });

  subscribeBackendStatus((status) => {
    const disconnected = status === "disconnected";
    el("txn-form-disconnected-state")?.classList.toggle("hidden", !disconnected);
    el("txn-form-fields")?.classList.toggle("hidden", disconnected);
    setSubmitting(false);
  });
  el("txn-form-retry-backend-btn")?.addEventListener("click", () => checkNow());
}
