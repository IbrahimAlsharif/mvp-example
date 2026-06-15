/**
 * Best-effort browser family detection, used ONLY to pick the correct
 * Arabic-first re-enable guidance after a hard denial (US-0.2 AC-7). A generic
 * "change your settings" message does not satisfy AC-7 for a non-technical
 * Elderly user, so we tailor the steps to the detected browser. Detection is
 * advisory — a wrong guess still shows actionable steps, never a dead-end.
 */
export type BrowserFamily = "chrome" | "safari" | "firefox" | "generic";

export function detectBrowser(ua?: string): BrowserFamily {
  const s = (ua ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (!s) return "generic";
  // Order matters: Chrome UA also contains "safari"; Edge/Opera contain "chrome".
  if (s.includes("firefox") || s.includes("fxios")) return "firefox";
  if (s.includes("edg/") || s.includes("opr/") || s.includes("chrome") || s.includes("crios")) {
    return "chrome";
  }
  if (s.includes("safari")) return "safari";
  return "generic";
}

/** i18n key under the `capture` namespace for a browser's re-enable steps. */
export function reenableKey(family: BrowserFamily): string {
  return {
    chrome: "reenableChrome",
    safari: "reenableSafari",
    firefox: "reenableFirefox",
    generic: "reenableGeneric",
  }[family];
}
