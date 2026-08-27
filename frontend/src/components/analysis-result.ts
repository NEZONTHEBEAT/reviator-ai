import { executeRecovery, getRecoveryActions, getTransaction, runAgent, updateActionStatus } from "../services/transaction-api.js";
import { exportRecoveryReportPdf } from "../services/export.js";
import { ApiError } from "../services/api.js";
import { upsertHistory } from "../services/history.js";
import { revealResultPanel, crossfadeIn, pulseNode } from "../animations/gsap.js";
import { escapeHtml, labelize } from "../utils.js";
import type {
  AnalyseTransactionResponse,
  RecoveryAction,
  TransactionInput,
  TransactionRecord,
} from "../types/api.js";

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

type PanelState = "empty" | "loading" | "content" | "failed" | "no-action";

interface NormalizedResult {
  transaction_id: string;
  customer_id?: string;
  amount?: number;
  currency?: string;
  failure_reason?: string | null;
  recovery_score?: number | null;
  recovery_probability?: number | null;
  recovery_priority?: string | null;
  recommended_action?: string | null;
  recovery_channel?: string | null;
  reasons?: string[];
  noActionMessage?: string;
}

let current: NormalizedResult | null = null;

function mapAnalyseResponse(input: TransactionInput, result: AnalyseTransactionResponse): NormalizedResult {
  return {
    transaction_id: result.transaction_id ?? input.transaction_id,
    customer_id: result.customer_id ?? input.customer_id,
    amount: result.amount ?? input.amount,
    currency: result.currency ?? input.currency,
    failure_reason: result.failure_reason ?? input.failure_reason,
    recovery_score: result.recovery_score,
    recovery_probability: result.recovery_probability,
    recovery_priority: result.recovery_priority,
    recommended_action: result.recommended_action,
    recovery_channel: result.recovery_channel,
    reasons: result.reasons,
    noActionMessage: result.message,
  };
}

function mapTransactionRecord(record: TransactionRecord): NormalizedResult {
  return {
    transaction_id: record.transaction_id,
    customer_id: record.customer_id,
    amount: record.amount,
    currency: record.currency,
    failure_reason: record.failure_reason,
    recovery_score: record.recovery_score,
    recovery_probability: record.recovery_probability,
    recovery_priority: record.recovery_priority,
    recommended_action: record.recommended_action,
    recovery_channel: record.recovery_channel,
    reasons: [],
    noActionMessage: record.status !== "failed" ? "This transaction is not marked as failed." : undefined,
  };
}

// ---------------------------------------------------------------------------
// Pipeline rail — Ready / Detected / Decided / Recovered. Detected+Decided
// arrive in the SAME api response, so they're revealed with a short stagger
// for a readable cascade rather than a fake wait.
// ---------------------------------------------------------------------------
const RAIL_STAGES = ["ready", "detected", "decided", "recovered"] as const;
type RailStage = (typeof RAIL_STAGES)[number];

function setPipelineStage(stage: RailStage | "failed"): void {
  const failedAt = RAIL_STAGES.indexOf("detected");
  RAIL_STAGES.forEach((s, i) => {
    const node = el(`pipeline-node-${s}`);
    if (!node) return;
    const activeIndex = stage === "failed" ? failedAt : RAIL_STAGES.indexOf(stage);
    node.classList.remove("is-active", "is-done", "is-failed");
    if (stage === "failed" && i === failedAt) {
      node.classList.add("is-failed");
    } else if (i < activeIndex) {
      node.classList.add("is-done");
    } else if (i === activeIndex) {
      node.classList.add("is-active");
      const dot = node.querySelector<HTMLElement>(".node-dot");
      if (dot) pulseNode(dot);
    }
  });
  el("pipeline-rail")?.classList.remove("hidden");
  el("pipeline-idle-hint")?.classList.add("hidden");
}

function resetPipeline(): void {
  el("pipeline-rail")?.classList.add("hidden");
  el("pipeline-idle-hint")?.classList.remove("hidden");
  RAIL_STAGES.forEach((s) => el(`pipeline-node-${s}`)?.classList.remove("is-active", "is-done", "is-failed"));
}

// ---------------------------------------------------------------------------
// Panel state
// ---------------------------------------------------------------------------
function showPanel(state: PanelState): void {
  const map: Record<PanelState, string> = {
    empty: "result-state-empty",
    loading: "result-state-loading",
    content: "result-state-content",
    failed: "result-state-failed",
    "no-action": "result-state-no-action",
  };
  (Object.keys(map) as PanelState[]).forEach((key) => {
    const node = el(map[key]);
    if (!node) return;
    const show = key === state;
    node.classList.toggle("hidden", !show);
    if (show) crossfadeIn(node);
  });
}

const PRIORITY_BADGE: Record<string, string> = {
  low: "badge-pending",
  medium: "badge-pending",
  high: "badge-failed",
  critical: "badge-failed",
};

function renderReasons(items: string[] | undefined): void {
  const list = el("result-reasons-list");
  const wrap = el("result-reasons-wrap");
  if (!list || !wrap) return;
  if (!items || items.length === 0) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  list.innerHTML = items
    .map(
      (r) =>
        `<li class="flex gap-2 text-sm leading-relaxed"><span class="text-muted-foreground">•</span><span>${escapeHtml(r)}</span></li>`
    )
    .join("");
}

function renderResult(normalized: NormalizedResult, opts: { fromLookup?: boolean } = {}): void {
  current = normalized;

  if (normalized.noActionMessage && !normalized.recommended_action) {
    el("result-no-action-message")!.textContent = normalized.noActionMessage;
    el("result-no-action-txn")!.textContent = normalized.transaction_id;
    showPanel("no-action");
    resetPipeline();
    upsertHistory({
      transaction_id: normalized.transaction_id,
      customer_id: normalized.customer_id ?? "",
      amount: normalized.amount ?? 0,
      currency: normalized.currency ?? "INR",
      status: "success",
    });
    window.dispatchEvent(new CustomEvent("reviator:history-changed"));
    return;
  }

  const priority = normalized.recovery_priority ?? "low";
  const badge = el("result-priority-badge");
  if (badge) {
    badge.textContent = labelize(priority);
    badge.className = `badge text-sm ${PRIORITY_BADGE[priority] ?? "badge-pending"}`;
  }

  const score = normalized.recovery_score ?? 0;
  const scoreValue = el("result-score-value");
  if (scoreValue) scoreValue.textContent = String(score);
  const ring = el("result-score-ring");
  if (ring) ring.style.background = `conic-gradient(hsl(var(--primary)) ${score * 3.6}deg, hsl(var(--border)) 0deg)`;

  const probEl = el("result-probability");
  if (probEl) probEl.textContent = `${Math.round((normalized.recovery_probability ?? 0) * 100)}%`;

  const txnLabel = el("result-txn-label");
  if (txnLabel) txnLabel.textContent = `${normalized.transaction_id} · ${normalized.customer_id ?? "—"}`;

  const actionEl = el("result-recommended-action");
  if (actionEl) actionEl.textContent = labelize(normalized.recommended_action ?? undefined);
  const channelEl = el("result-recovery-channel");
  if (channelEl) channelEl.textContent = labelize(normalized.recovery_channel ?? undefined);
  const reasonEl = el("result-failure-reason");
  if (reasonEl) reasonEl.textContent = labelize(normalized.failure_reason ?? undefined);
  const amountEl = el("result-amount");
  if (amountEl) {
    amountEl.textContent =
      normalized.amount != null ? `${normalized.currency ?? "INR"} ${normalized.amount.toLocaleString("en-IN")}` : "—";
  }

  renderReasons(normalized.reasons);

  showPanel("content");
  const panel = el("result-state-content");
  if (panel) revealResultPanel(panel);

  if (!opts.fromLookup) {
    setPipelineStage("ready");
    window.setTimeout(() => setPipelineStage("detected"), 120);
    window.setTimeout(() => setPipelineStage("decided"), 420);
  } else {
    setPipelineStage("decided");
  }

  // Reset the agent + recovery-action sub-panels for the new transaction.
  el("agent-panel")?.classList.add("hidden");
  loadRecoveryActions(normalized.transaction_id, { silent: true });

  upsertHistory({
    transaction_id: normalized.transaction_id,
    customer_id: normalized.customer_id ?? "",
    amount: normalized.amount ?? 0,
    currency: normalized.currency ?? "INR",
    status: "failed",
    recovery_priority: priority as any,
    recovery_score: score,
    recommended_action: normalized.recommended_action ?? undefined,
  });
  window.dispatchEvent(new CustomEvent("reviator:history-changed"));
}

// ---------------------------------------------------------------------------
// Run Agent — response shape isn't confirmed yet, so render generically.
// ---------------------------------------------------------------------------
function renderGenericObject(container: HTMLElement, obj: unknown): void {
  if (obj == null) {
    container.innerHTML = '<p class="text-sm text-muted-foreground">No data returned.</p>';
    return;
  }
  if (typeof obj !== "object") {
    container.innerHTML = `<p class="text-sm">${escapeHtml(String(obj))}</p>`;
    return;
  }
  const rows = Object.entries(obj as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([key, value]) => {
      let display: string;
      if (Array.isArray(value)) {
        display = value.map((v) => escapeHtml(String(v))).join(", ") || "—";
      } else if (typeof value === "object") {
        display = `<code class="font-mono text-xs">${escapeHtml(JSON.stringify(value))}</code>`;
      } else {
        display = escapeHtml(String(value));
      }
      return `<div class="flex items-start justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
        <span class="text-muted-foreground">${escapeHtml(labelize(key))}</span>
        <span class="text-right font-medium">${display}</span>
      </div>`;
    })
    .join("");
  container.innerHTML = rows || '<p class="text-sm text-muted-foreground">No data returned.</p>';
}

async function handleRunAgent(): Promise<void> {
  if (!current) return;
  const panel = el("agent-panel");
  const content = el("agent-panel-content");
  const errorBox = el("agent-panel-error");
  const btn = el<HTMLButtonElement>("result-run-agent-btn");
  panel?.classList.remove("hidden");
  errorBox?.classList.add("hidden");
  if (content) content.innerHTML = '<p class="text-sm text-muted-foreground">Running the agent…</p>';
  if (btn) btn.disabled = true;
  try {
    const result = await runAgent(current.transaction_id);
    if (content) renderGenericObject(content, result);
    if (panel) crossfadeIn(panel);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Agent call failed.";
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.classList.remove("hidden");
    }
    if (content) content.innerHTML = "";
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Execute Recovery
// ---------------------------------------------------------------------------
async function handleExecute(): Promise<void> {
  if (!current) return;
  const btn = el<HTMLButtonElement>("result-execute-btn");
  const outcomeBox = el("execute-outcome");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Executing…";
  }
  try {
    const outcome = await executeRecovery(current.transaction_id);
    if (outcomeBox) {
      outcomeBox.classList.remove("hidden");
      if (outcome.status === "action_created") {
        outcomeBox.className = "badge badge-success mt-3";
        outcomeBox.textContent = `Action ${outcome.action_id} created — ${labelize(outcome.execution_status)}`;
        setPipelineStage("recovered");
        upsertHistory({
          transaction_id: current.transaction_id,
          customer_id: current.customer_id ?? "",
          amount: current.amount ?? 0,
          currency: current.currency ?? "INR",
          status: "failed",
          action_id: outcome.action_id,
          action_status: outcome.execution_status as any,
        });
        window.dispatchEvent(new CustomEvent("reviator:history-changed"));
      } else {
        outcomeBox.className = "badge badge-pending mt-3";
        outcomeBox.textContent = outcome.message || labelize(outcome.status);
      }
    }
    await loadRecoveryActions(current.transaction_id);
  } catch (error) {
    if (outcomeBox) {
      outcomeBox.classList.remove("hidden");
      outcomeBox.className = "badge badge-failed mt-3";
      outcomeBox.textContent = error instanceof ApiError ? error.message : "Execution failed.";
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Execute Recovery";
    }
  }
}

// ---------------------------------------------------------------------------
// Recovery actions audit trail
// ---------------------------------------------------------------------------
const ACTION_STATUSES = ["created", "pending", "executed", "completed", "failed"];
let lastActions: RecoveryAction[] = [];

function renderActionsList(actions: RecoveryAction[]): void {
  lastActions = actions;
  const list = el("recovery-actions-list");
  const empty = el("recovery-actions-empty");
  if (!list) return;
  if (actions.length === 0) {
    list.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");
  list.innerHTML = actions
    .map(
      (a) => `
      <li class="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0" data-action-id="${escapeHtml(a.action_id)}">
        <div class="min-w-0">
          <p class="text-sm font-medium">${escapeHtml(labelize(a.action))}</p>
          <p class="text-xs text-muted-foreground">${escapeHtml(labelize(a.channel))} · ${a.amount.toLocaleString("en-IN")}</p>
        </div>
        <select data-action-status-select="${escapeHtml(a.action_id)}" class="rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          ${ACTION_STATUSES.map((s) => `<option value="${s}" ${s === a.status ? "selected" : ""}>${labelize(s)}</option>`).join("")}
        </select>
      </li>`
    )
    .join("");

  list.querySelectorAll<HTMLSelectElement>("[data-action-status-select]").forEach((select) => {
    const previousValue = select.value;
    select.addEventListener("change", async () => {
      const actionId = select.dataset.actionStatusSelect!;
      const attemptedValue = select.value;
      select.disabled = true;
      try {
        const updated = await updateActionStatus(actionId, attemptedValue);
        if (current) {
          upsertHistory({
            transaction_id: current.transaction_id,
            customer_id: current.customer_id ?? "",
            amount: current.amount ?? 0,
            currency: current.currency ?? "INR",
            status: "failed",
            action_id: updated.action_id,
            action_status: updated.status as any,
          });
          window.dispatchEvent(new CustomEvent("reviator:history-changed"));
        }
      } catch (error) {
        select.value = previousValue;
        alert(error instanceof ApiError ? error.message : "Could not update status.");
      } finally {
        select.disabled = false;
      }
    });
  });
}

async function loadRecoveryActions(transactionId: string, opts: { silent?: boolean } = {}): Promise<void> {
  const panel = el("recovery-actions-panel");
  panel?.classList.remove("hidden");
  if (!opts.silent) el("recovery-actions-loading")?.classList.remove("hidden");
  try {
    const { actions } = await getRecoveryActions(transactionId);
    renderActionsList(actions);
  } catch {
    renderActionsList([]);
  } finally {
    el("recovery-actions-loading")?.classList.add("hidden");
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
export function initAnalysisResult(): void {
  showPanel("empty");
  resetPipeline();

  window.addEventListener("reviator:transaction-reset", () => {
    current = null;
    showPanel("empty");
    resetPipeline();
    el("agent-panel")?.classList.add("hidden");
    el("recovery-actions-panel")?.classList.add("hidden");
  });

  window.addEventListener("reviator:transaction-analysing", () => showPanel("loading"));

  window.addEventListener("reviator:transaction-analysed", ((
    event: CustomEvent<{ input: TransactionInput; result: AnalyseTransactionResponse }>
  ) => {
    renderResult(mapAnalyseResponse(event.detail.input, event.detail.result));
  }) as EventListener);

  window.addEventListener("reviator:transaction-loaded", ((event: CustomEvent<{ record: TransactionRecord }>) => {
    renderResult(mapTransactionRecord(event.detail.record), { fromLookup: true });
  }) as EventListener);

  window.addEventListener("reviator:transaction-error", ((event: CustomEvent<{ message: string }>) => {
    const msgEl = el("result-failed-message");
    if (msgEl) msgEl.textContent = event.detail?.message || "Something went wrong.";
    showPanel("failed");
  }) as EventListener);

  el("result-try-again-btn")?.addEventListener("click", () => {
    el<HTMLFormElement>("transaction-form")?.requestSubmit();
  });

  el("result-run-agent-btn")?.addEventListener("click", () => void handleRunAgent());
  el("result-execute-btn")?.addEventListener("click", () => void handleExecute());

  el("result-download-pdf")?.addEventListener("click", async (e) => {
    if (!current) return;
    const btn = e.currentTarget as HTMLButtonElement;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Preparing PDF…";
    try {
      await exportRecoveryReportPdf({ ...current, actions: lastActions });
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

/** Used by the "look up an existing transaction" control in the form. */
export async function lookupTransaction(transactionId: string): Promise<void> {
  showPanel("loading");
  try {
    const record = await getTransaction(transactionId);
    window.dispatchEvent(new CustomEvent("reviator:transaction-loaded", { detail: { record } }));
  } catch (error) {
    const msgEl = el("result-failed-message");
    if (msgEl) {
      msgEl.textContent = error instanceof ApiError ? error.message : "Transaction not found.";
    }
    showPanel("failed");
  }
}
