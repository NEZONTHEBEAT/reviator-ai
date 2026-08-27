/**
 * All motion lives here so components stay focused on state/markup.
 * GSAP + ScrollTrigger are loaded from CDN in index.html (see the
 * <script> tags before ./dist/main.js) and declared as globals in
 * src/types/globals.d.ts.
 */

let scrollTriggerRegistered = false;

function ensureScrollTrigger(): void {
  if (scrollTriggerRegistered || typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  scrollTriggerRegistered = true;
}

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Staggered entrance for the hero eyebrow/title/subhead/CTAs on first paint. */
export function playHeroEntrance(): void {
  if (typeof gsap === "undefined") return;
  const targets = document.querySelectorAll<HTMLElement>("[data-hero-item]");
  if (targets.length === 0) return;

  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    targets,
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.09, delay: 0.1 }
  );
}

/** Fade + rise reveal for any section marked [data-reveal] as it scrolls into view. */
export function initScrollReveals(): void {
  if (typeof gsap === "undefined" || prefersReducedMotion()) return;
  ensureScrollTrigger();

  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 28 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      }
    );
  });

  document.querySelectorAll<HTMLElement>("[data-reveal-stagger]").forEach((group) => {
    const items = group.querySelectorAll<HTMLElement>("[data-reveal-item]");
    gsap.fromTo(
      items,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: "top 85%", once: true },
      }
    );
  });
}

/** Counts a numeric readout up from 0 to `value`, formatting with commas. */
export function animateCountUp(el: HTMLElement, value: number, duration = 1.1): void {
  if (typeof gsap === "undefined" || prefersReducedMotion()) {
    el.textContent = value.toLocaleString("en-IN");
    return;
  }
  const counter = { n: 0 };
  gsap.to(counter, {
    n: value,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      el.textContent = Math.round(counter.n).toLocaleString("en-IN");
    },
  });
}

/** Quick pop used when a pipeline node (Ready/Uploading/Analyzing/...) turns active. */
export function pulseNode(el: HTMLElement): void {
  if (typeof gsap === "undefined" || prefersReducedMotion()) return;
  gsap.fromTo(el, { scale: 0.7 }, { scale: 1, duration: 0.45, ease: "back.out(2.4)" });
}

/** Gentle attention pulse for the result panel once analysis completes. */
export function revealResultPanel(el: HTMLElement): void {
  if (typeof gsap === "undefined" || prefersReducedMotion()) {
    el.style.opacity = "1";
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: 16, scale: 0.98 },
    { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" }
  );
}

/** Crossfade helper used for swapping empty/error/content states in a panel. */
export function crossfadeIn(el: HTMLElement): void {
  if (typeof gsap === "undefined" || prefersReducedMotion()) {
    el.style.opacity = "1";
    return;
  }
  gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" });
}
