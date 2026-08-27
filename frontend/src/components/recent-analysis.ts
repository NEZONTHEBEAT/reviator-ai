import { clearHistory, getHistory } from "../services/history.js";
import { exportHistoryCsv } from "../services/export.js";
import { formatRelativeTime, labelize } from "../utils.js";
import type { HistoryEntry } from "../types/api.js";

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function outcomeBadge(entry: HistoryEntry): { label: string; cls: string } {
  if (entry.action_status === "completed") return { label: "Completed ✓", cls: "badge-success" };
  if (entry.action_status === "failed") return { label: "Failed ✕", cls: "badge-failed" };
  if (entry.action_status) return { label: labelize(entry.action_status), cls: "badge-pending" };
  if (entry.status === "success") return { label: "No Action Needed", cls: "badge-success" };
  return { label: "Awaiting Recovery", cls: "badge-pending" };
}

function renderRows(items: HistoryEntry[]): void {
  const list = el("recent-analysis-list");
  const empty = el("recent-analysis-empty");
  if (!list) return;

  if (items.length === 0) {
    list.innerHTML = "";
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");

  list.innerHTML = items
    .map((entry) => {
      const badge = outcomeBadge(entry);
      return `
        <li class="flex items-center justify-between gap-3 border-b border-border/70 py-3 last:border-0">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">${escapeHtml(entry.transaction_id)}</p>
            <p class="text-xs text-muted-foreground">${escapeHtml(entry.customer_id || "—")} · ${formatRelativeTime(entry.updatedAt)}</p>
          </div>
          <span class="badge ${badge.cls} shrink-0">${badge.label}</span>
        </li>`;
    })
    .join("");
}

function refresh(): void {
  renderRows(getHistory());
}

export function initRecentAnalysis(): void {
  refresh();
  window.addEventListener("reviator:history-changed", refresh);

  el("export-csv-btn")?.addEventListener("click", () => exportHistoryCsv(getHistory()));

  el("clear-history-btn")?.addEventListener("click", () => {
    if (confirm("Clear locally saved transaction history from this browser? This doesn't affect the backend.")) {
      clearHistory();
      window.dispatchEvent(new CustomEvent("reviator:history-changed"));
    }
  });
}
