import { initTheme } from "./theme.js";
import { startHealthPolling } from "./components/backend-status.js";
import { initNavbar } from "./components/navbar.js";
import { initAuthModal } from "./components/auth-modal.js";
import { initTransactionForm } from "./components/transaction-form.js";
import { initAnalysisResult } from "./components/analysis-result.js";
import { initStats } from "./components/stats.js";
import { initRecentAnalysis } from "./components/recent-analysis.js";
import { playHeroEntrance, initScrollReveals } from "./animations/gsap.js";

function initYear(): void {
  const el = document.getElementById("current-year");
  if (el) el.textContent = String(new Date().getFullYear());
}

function boot(): void {
  initTheme();
  initYear();

  initNavbar();
  initAuthModal();
  initTransactionForm();
  initAnalysisResult();
  initStats();
  initRecentAnalysis();

  startHealthPolling();

  playHeroEntrance();
  initScrollReveals();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
