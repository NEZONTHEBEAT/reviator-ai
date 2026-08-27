import { GOOGLE_CLIENT_ID } from "../config.js";
import { sendOtp, signInWithGoogle, verifyOtp } from "../services/auth-api.js";
import { ApiError } from "../services/api.js";

let modalInstance: any = null;
let otpPhone = "";
let resendTimer: number | undefined;

function el<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setError(message: string): void {
  const box = el("auth-error");
  if (!box) return;
  box.textContent = message;
  box.classList.toggle("hidden", !message);
}

function switchTab(tab: "google" | "phone"): void {
  el("auth-tab-google")?.classList.toggle("bg-accent", tab === "google");
  el("auth-tab-phone")?.classList.toggle("bg-accent", tab === "phone");
  el("auth-panel-google")?.classList.toggle("hidden", tab !== "google");
  el("auth-panel-phone")?.classList.toggle("hidden", tab !== "phone");
  setError("");
}

function announceAuthChanged(): void {
  window.dispatchEvent(new CustomEvent("reviator:auth-changed"));
}

function initGoogleButton(): void {
  const target = el("google-signin-btn");
  if (!target) return;

  if (GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_OAUTH_CLIENT_ID")) {
    target.innerHTML =
      '<p class="text-xs text-muted-foreground">Add your Google OAuth client ID in <code class="font-mono">src/config.ts</code> to enable this button.</p>';
    return;
  }

  if (!window.google?.accounts?.id) {
    target.innerHTML = '<p class="text-xs text-muted-foreground">Loading Google Sign-In…</p>';
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (response: { credential: string }) => {
      try {
        await signInWithGoogle(response.credential);
        announceAuthChanged();
        closeAuthModal();
      } catch (error) {
        setError(error instanceof ApiError ? error.message : "Google sign-in failed.");
      }
    },
  });
  window.google.accounts.id.renderButton(target, { theme: "outline", size: "large", width: 280 });
}

function startResendCountdown(seconds = 30): void {
  const resendBtn = el<HTMLButtonElement>("otp-resend-btn");
  if (!resendBtn) return;
  let remaining = seconds;
  resendBtn.disabled = true;
  window.clearInterval(resendTimer);
  resendTimer = window.setInterval(() => {
    remaining -= 1;
    resendBtn.textContent = remaining > 0 ? `Resend OTP (${remaining}s)` : "Resend OTP";
    if (remaining <= 0) {
      window.clearInterval(resendTimer);
      resendBtn.disabled = false;
    }
  }, 1000);
}

function initPhoneFlow(): void {
  const phoneInput = el<HTMLInputElement>("otp-phone-input");
  const otpInput = el<HTMLInputElement>("otp-code-input");
  const otpStep = el("otp-step-2");
  const sendBtn = el<HTMLButtonElement>("otp-send-btn");
  const verifyBtn = el<HTMLButtonElement>("otp-verify-btn");
  const resendBtn = el<HTMLButtonElement>("otp-resend-btn");

  const doSend = async () => {
    const phone = phoneInput?.value.trim();
    if (!phone || phone.length < 8) {
      setError("Enter a valid phone number, with country code.");
      return;
    }
    setError("");
    sendBtn && (sendBtn.disabled = true);
    try {
      await sendOtp(phone);
      otpPhone = phone;
      otpStep?.classList.remove("hidden");
      otpInput?.focus();
      startResendCountdown();
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Could not send OTP. Try again.");
    } finally {
      sendBtn && (sendBtn.disabled = false);
    }
  };

  sendBtn?.addEventListener("click", doSend);
  resendBtn?.addEventListener("click", doSend);

  verifyBtn?.addEventListener("click", async () => {
    const code = otpInput?.value.trim();
    if (!code || code.length < 4) {
      setError("Enter the OTP you received.");
      return;
    }
    setError("");
    verifyBtn.disabled = true;
    try {
      await verifyOtp(otpPhone, code);
      announceAuthChanged();
      closeAuthModal();
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "That OTP didn't match. Try again.");
    } finally {
      verifyBtn.disabled = false;
    }
  });
}

export function initAuthModal(): void {
  const modalEl = el("auth-modal");
  if (modalEl && typeof bootstrap !== "undefined") {
    modalInstance = new bootstrap.Modal(modalEl);
    modalEl.addEventListener("shown.bs.modal", initGoogleButton);
  }

  el("auth-tab-google")?.addEventListener("click", () => switchTab("google"));
  el("auth-tab-phone")?.addEventListener("click", () => switchTab("phone"));
  initPhoneFlow();
}

export function openAuthModal(): void {
  switchTab("google");
  modalInstance?.show();
}

export function closeAuthModal(): void {
  modalInstance?.hide();
}
