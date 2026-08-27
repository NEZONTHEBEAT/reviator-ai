import { computeStats } from "../services/history.js";
import { animateCountUp } from "../animations/gsap.js";

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function refreshStats(): void {
  const stats = computeStats();
  const hasAny = stats.totalAnalyses > 0;

  el("stats-empty-state")?.classList.toggle("hidden", hasAny);
  el("stats-grid")?.classList.toggle("hidden", !hasAny);
  if (!hasAny) return;

  const totalEl = el("stat-total-analyses");
  const successEl = el("stat-successful");
  const issuesEl = el("stat-issues-found");
  if (totalEl) animateCountUp(totalEl, stats.totalAnalyses);
  if (successEl) animateCountUp(successEl, stats.successful);
  if (issuesEl) animateCountUp(issuesEl, stats.issuesFound);
}

export function initStats(): void {
  refreshStats();
  window.addEventListener("reviator:history-changed", refreshStats);
}
