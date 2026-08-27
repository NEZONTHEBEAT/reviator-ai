import { ENDPOINTS } from "../config.js";
import { apiFetch } from "./api.js";
import type { AuthResponse, GoogleAuthPayload, OtpSendPayload, OtpVerifyPayload } from "../types/api.js";

const TOKEN_KEY = "reviator-auth-token";
const USER_KEY = "reviator-auth-user";

export function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(ENDPOINTS.authGoogle, {
    method: "POST",
    body: JSON.stringify({ idToken } satisfies GoogleAuthPayload),
  }).then(persistSession);
}

export function sendOtp(phone: string): Promise<{ sent: boolean }> {
  return apiFetch<{ sent: boolean }>(ENDPOINTS.otpSend, {
    method: "POST",
    body: JSON.stringify({ phone } satisfies OtpSendPayload),
  });
}

export function verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(ENDPOINTS.otpVerify, {
    method: "POST",
    body: JSON.stringify({ phone, otp } satisfies OtpVerifyPayload),
  }).then(persistSession);
}

function persistSession(auth: AuthResponse): AuthResponse {
  sessionStorage.setItem(TOKEN_KEY, auth.token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  return auth;
}

export function getStoredUser(): AuthResponse["user"] | null {
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function signOut(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}
