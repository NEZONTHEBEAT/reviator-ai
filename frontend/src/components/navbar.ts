import { getTheme, toggleTheme } from "../theme.js";
import { mountBackendStatusPill } from "./backend-status.js";
import { getStoredUser, signOut } from "../services/auth-api.js";
import { openAuthModal } from "./auth-modal.js";

function updateThemeIcon(button: HTMLElement): void {
  const isDark = getTheme() === "dark";
  const sun = button.querySelector<HTMLElement>('[data-icon="sun"]');
  const moon = button.querySelector<HTMLElement>('[data-icon="moon"]');
  sun?.classList.toggle("hidden", isDark);
  moon?.classList.toggle("hidden", !isDark);
  button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

function renderProfileButton(button: HTMLElement): void {
  const user = getStoredUser();
  const label = button.querySelector<HTMLElement>("[data-profile-label]");
  const avatar = button.querySelector<HTMLImageElement>("[data-profile-avatar]");
  const initial = button.querySelector<HTMLElement>("[data-profile-initial]");

  if (user) {
    const name = user.name || user.phone || user.email || "Account";
    if (label) label.textContent = name;
    if (user.avatarUrl && avatar) {
      avatar.src = user.avatarUrl;
      avatar.classList.remove("hidden");
      initial?.classList.add("hidden");
    } else if (initial) {
      initial.textContent = name.charAt(0).toUpperCase();
      initial.classList.remove("hidden");
      avatar?.classList.add("hidden");
    }
  } else {
    if (label) label.textContent = "Sign in";
    initial?.classList.remove("hidden");
    if (initial) initial.textContent = "?";
    avatar?.classList.add("hidden");
  }
}

export function initNavbar(): void {
  const statusSlot = document.querySelector<HTMLElement>("#backend-status-slot");
  if (statusSlot) mountBackendStatusPill(statusSlot);
  const statusSlotMobile = document.querySelector<HTMLElement>("#backend-status-slot-mobile");
  if (statusSlotMobile) mountBackendStatusPill(statusSlotMobile);

  // Theme toggle
  const themeButton = document.querySelector<HTMLElement>("#theme-toggle");
  if (themeButton) {
    updateThemeIcon(themeButton);
    themeButton.addEventListener("click", () => {
      toggleTheme();
      updateThemeIcon(themeButton);
    });
  }

  // Mobile menu
  const menuButton = document.querySelector<HTMLElement>("#mobile-menu-toggle");
  const mobilePanel = document.querySelector<HTMLElement>("#mobile-menu-panel");
  menuButton?.addEventListener("click", () => {
    const isOpen = mobilePanel?.classList.toggle("flex");
    mobilePanel?.classList.toggle("hidden", !isOpen);
    menuButton.setAttribute("aria-expanded", String(!!isOpen));
  });

  // Profile / auth
  const profileButton = document.querySelector<HTMLElement>("#profile-button");
  const profileMenu = document.querySelector<HTMLElement>("#profile-menu");
  if (profileButton) {
    renderProfileButton(profileButton);
    profileButton.addEventListener("click", () => {
      const user = getStoredUser();
      if (!user) {
        openAuthModal();
        return;
      }
      profileMenu?.classList.toggle("hidden");
    });
  }

  document.querySelector<HTMLElement>("#profile-sign-out")?.addEventListener("click", () => {
    signOut();
    if (profileButton) renderProfileButton(profileButton);
    profileMenu?.classList.add("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!profileMenu || profileMenu.classList.contains("hidden")) return;
    const target = event.target as Node;
    if (!profileMenu.contains(target) && !profileButton?.contains(target)) {
      profileMenu.classList.add("hidden");
    }
  });

  // Re-render the profile chip once a sign-in completes elsewhere (auth-modal dispatches this).
  window.addEventListener("reviator:auth-changed", () => {
    if (profileButton) renderProfileButton(profileButton);
  });
}
