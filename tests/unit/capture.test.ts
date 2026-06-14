import { describe, it, expect } from "vitest";
import { routeForResult, fallbackForResult } from "@/lib/capture/types";
import { detectBrowser, reenableKey } from "@/lib/capture/browser";
import { isModalitySupported } from "@/lib/capture/permissions";

describe("US-0.2 capture routing (AC-3/AC-4)", () => {
  it("only a grant yields live capture; every non-grant falls back, never dead-ends", () => {
    expect(routeForResult("camera", "granted")).toEqual({ mode: "live", modality: "camera" });
    // camera/mic non-grant → upload fallback
    for (const r of ["denied", "dismissed", "unsupported"] as const) {
      expect(routeForResult("camera", r)).toEqual({ mode: "upload" });
      expect(routeForResult("mic", r)).toEqual({ mode: "upload" });
    }
    // location non-grant → manual entry (never IP fallback)
    for (const r of ["denied", "dismissed", "unsupported"] as const) {
      expect(routeForResult("location", r)).toEqual({ mode: "manual_location" });
    }
  });

  it("maps non-grants to the correct content-blind fallback enum", () => {
    expect(fallbackForResult("camera", "granted")).toBeNull();
    expect(fallbackForResult("camera", "denied")).toBe("upload");
    expect(fallbackForResult("mic", "unsupported")).toBe("upload");
    expect(fallbackForResult("location", "denied")).toBe("manual_location");
  });
});

describe("US-0.2 browser detection for re-enable guidance (AC-7)", () => {
  it("detects the major families from UA strings, defaulting to generic", () => {
    expect(detectBrowser("Mozilla/5.0 (X11) Firefox/124.0")).toBe("firefox");
    // Chrome UA also contains "Safari" — must still resolve to chrome.
    expect(detectBrowser("Mozilla/5.0 ... Chrome/124 Safari/537.36")).toBe("chrome");
    expect(detectBrowser("Mozilla/5.0 (Macintosh) Version/17 Safari/605")).toBe("safari");
    expect(detectBrowser("SomethingWeird/1.0")).toBe("generic");
    expect(detectBrowser("")).toBe("generic");
  });

  it("each family maps to a distinct, concrete re-enable copy key (not generic-only)", () => {
    expect(reenableKey("chrome")).toBe("reenableChrome");
    expect(reenableKey("safari")).toBe("reenableSafari");
    expect(reenableKey("firefox")).toBe("reenableFirefox");
    expect(reenableKey("generic")).toBe("reenableGeneric");
  });
});

describe("US-0.2 support detection is SSR-safe and non-throwing (AC-6)", () => {
  it("reports unsupported (never throws) when navigator is absent", () => {
    // In the node test env there is no navigator → unsupported, no throw.
    expect(() => isModalitySupported("camera")).not.toThrow();
    expect(isModalitySupported("camera")).toBe(false);
    expect(isModalitySupported("location")).toBe(false);
  });
});
