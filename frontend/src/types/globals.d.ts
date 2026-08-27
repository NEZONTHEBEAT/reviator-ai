/**
 * Ambient declarations for third-party libraries loaded via <script> tags
 * in index.html (GSAP, ScrollTrigger, Bootstrap, jsPDF, Google Identity
 * Services). We use the CDN builds directly instead of npm packages so
 * the project stays bundler-free — see README.md.
 */

declare const gsap: any;
declare const ScrollTrigger: any;
declare const bootstrap: any;

interface JsPdfCtor {
  new (...args: any[]): any;
}
declare const jspdf: { jsPDF: JsPdfCtor };

interface GoogleAccountsId {
  initialize(config: Record<string, any>): void;
  renderButton(parent: HTMLElement, options: Record<string, any>): void;
  prompt(): void;
}
interface Window {
  google?: { accounts: { id: GoogleAccountsId } };
  __REVIATOR_API_BASE__?: string;
}
