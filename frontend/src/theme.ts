import { THEME_STORAGE_KEY } from "./config.js";
export type Theme = "light" | "dark";
const THEME_EVENT = "reviator:theme-change";

/**
 * Resolves the theme to use on this load.
 * - If the user has toggled before, we always honor that stored choice.
 * - Otherwise we fall back to the OS preference *once* and persist it,
 *   so a later change to the OS setting won't flip the site on refresh.
 *   (Matches the requirement: theme never changes on refresh, only on
 *   manual toggle.)
 */

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const initial: Theme = prefersDark ? "dark" : "light";
  localStorage.setItem(THEME_STORAGE_KEY, initial);
  return initial;
}

function apply(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

/** Call once on boot. Note: index.html also inlines a tiny sync copy of
 * this logic in <head> to avoid a flash of the wrong theme before this
 * module loads — keep the two in sync if you change the storage key. */

export function initTheme(): Theme {
  const theme = resolveInitialTheme();
  apply(theme);
  return theme;
}

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  apply(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function onThemeChange(callback: (theme: Theme) => void): () => void {
  const handler = (event: Event) => callback((event as CustomEvent<Theme>).detail);
  window.addEventListener(THEME_EVENT, handler);
  return () => window.removeEventListener(THEME_EVENT, handler);
}
