import { checkBackendHealth } from "../services/api.js";
import { HEALTH_POLL_INTERVAL } from "../config.js";
import type { BackendStatus } from "../types/api.js";

type Listener = (status: BackendStatus) => void;

let currentStatus: BackendStatus = "checking";
const listeners = new Set<Listener>();
let pollHandle: number | undefined;

function setStatus(next: BackendStatus): void {
  currentStatus = next;
  listeners.forEach((listener) => listener(currentStatus));
}

export function getBackendStatus(): BackendStatus {
  return currentStatus;
}

export function subscribeBackendStatus(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => listeners.delete(listener);
}

export async function checkNow(): Promise<BackendStatus> {
  setStatus("checking");
  const ok = await checkBackendHealth();
  setStatus(ok ? "connected" : "disconnected");
  return currentStatus;
}

export function startHealthPolling(): void {
  if (pollHandle) return;
  checkNow();
  pollHandle = window.setInterval(checkNow, HEALTH_POLL_INTERVAL);
}

const LABEL: Record<BackendStatus, string> = {
  checking: "Checking backend…",
  connected: "Backend Connected",
  disconnected: "Backend Not Connected",
};

/** Renders the status pill into `slot` and keeps it in sync via the shared listener. */
export function mountBackendStatusPill(slot: HTMLElement): void {
  const render = (status: BackendStatus) => {
    slot.className = `status-pill ${
      status === "connected" ? "is-connected" : status === "disconnected" ? "is-disconnected" : "is-checking"
    }`;
    slot.innerHTML = `<span class="dot"></span><span>${LABEL[status]}</span>`;
    slot.setAttribute("role", "status");
    slot.title = "Click to re-check connection";
  };
  slot.style.cursor = "pointer";
  slot.addEventListener("click", () => checkNow());
  subscribeBackendStatus(render);
}
