import { HISTORY_LIMIT, HISTORY_STORAGE_KEY } from "../config.js";
import type { HistoryEntry } from "../types/api.js";

/**
 * The backend has no "list all transactions" endpoint yet, so Stats and
 * Recent Analyses are driven from a local, per-browser history instead.
 * Entries are progressively enriched as the same transaction moves through
 * analyse → agent → execute → status updates. This is a convenience layer
 * only — it doesn't affect anything sent to the backend. See README for
 * the optional one-route backend addition that would make this a true
 * cross-device list.
 */

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    /* storage full or unavailable — history just won't persist across reloads */
  }
}

export function getHistory(): HistoryEntry[] {
  return readAll();
}

/** Creates or merges a history row for a transaction_id, moves it to the front. */
export function upsertHistory(patch: Partial<HistoryEntry> & { transaction_id: string }): void {
  const all = readAll();
  const idx = all.findIndex((e) => e.transaction_id === patch.transaction_id);
  const existing = idx >= 0 ? all[idx] : undefined;
  const merged: HistoryEntry = {
    customer_id: "",
    amount: 0,
    currency: "INR",
    status: "failed",
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) all.splice(idx, 1);
  all.unshift(merged);
  writeAll(all);
}

export function clearHistory(): void {
  writeAll([]);
}

export function computeStats(): { totalAnalyses: number; successful: number; issuesFound: number } {
  const all = readAll();
  return {
    totalAnalyses: all.length,
    successful: all.filter((e) => e.action_status === "completed").length,
    issuesFound: all.filter((e) => e.status === "failed").length,
  };
}
