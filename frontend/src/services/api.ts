import { API_BASE_URL, ENDPOINTS } from "../config.js";
import type { ApiErrorShape } from "../types/api.js";

export class ApiError extends Error {
  status?: number;
  constructor({ message, status }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("reviator-auth-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Thin JSON fetch wrapper. Throws ApiError on non-2xx responses. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
        ...init.headers,
      },
    });
  } catch (networkError) {
    throw new ApiError({ message: "Could not reach the backend. Is FastAPI running?" });
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body?.detail || body?.message || message;
    } catch {
      /* response wasn't JSON — keep default message */
    }
    throw new ApiError({ message, status: response.status });
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Pings the FastAPI health endpoint. Resolves false on any failure
 * (network error, timeout, non-2xx) rather than throwing, since callers
 * use this purely to drive the connected/disconnected pill. */
export async function checkBackendHealth(timeoutMs = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.health}`, {
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
