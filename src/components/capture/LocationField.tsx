"use client";

import { useState } from "react";
import { MapPin, X, LocateFixed, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { requestLocation } from "@/lib/capture/permissions";
import { fallbackForResult } from "@/lib/capture/types";
import { emit } from "@/lib/telemetry";

/**
 * Location entry for the create-event form (US-0.2 AC-4/AC-10, US-2.2 AC-3).
 *
 *  - Location is OFF by default: the field starts empty and an event saves with
 *    no location unless the user explicitly adds one.
 *  - "Use my current location" asks for geolocation ON DEMAND (just-in-time);
 *    a denial yields NO coordinates and never falls back to IP/coarse geo.
 *  - A resolved/auto-suggested location is a SUGGESTION the user must confirm or
 *    clear — never silently committed (AC-10 / US-2.2 AC-3). While unconfirmed
 *    it shows a "confirm or change" affordance and is not yet the saved value.
 *  - No coordinate is ever sent to telemetry (G4 + child-data minimization).
 */
export function LocationField({
  value,
  suggested,
  onChange,
  onConfirmSuggestion,
  onClear,
}: {
  value: { lat: number; lng: number } | null;
  /** True when `value` is an unconfirmed suggestion (from EXIF or device geo). */
  suggested: boolean;
  onChange: (loc: { lat: number; lng: number } | null, suggested: boolean) => void;
  onConfirmSuggestion: () => void;
  onClear: () => void;
}) {
  const t = useTranslations("capture");
  const [busy, setBusy] = useState(false);

  async function useDeviceLocation() {
    setBusy(true);
    emit("capture_permission_requested", { permission_type: "location" });
    const { result, coords } = await requestLocation();
    emit("capture_permission_result", { permission_type: "location", result });
    setBusy(false);
    if (result === "granted" && coords) {
      // A device location is a SUGGESTION — surfaced for confirmation, not saved
      // silently (AC-10).
      onChange(coords, true);
    } else {
      // Denied/dismissed/unsupported → no coordinates, manual entry remains
      // available; the location simply stays empty (AC-4, no IP fallback).
      const fb = fallbackForResult("location", result);
      if (fb) emit("capture_fallback_used", { fallback_type: fb });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="location-field">
      {value ? (
        <span
          className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-medium ${
            suggested
              ? "border-amber-200 bg-amber-50/70 text-amber-700"
              : "border-emerald-200 bg-emerald-50/70 text-emerald-700"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {suggested ? t("locationSuggested") : t("locationManualLabel")}
          {suggested && (
            <button
              type="button"
              onClick={onConfirmSuggestion}
              aria-label={t("locationConfirm")}
              className="tap-target ms-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            aria-label={t("locationClear")}
            className="tap-target inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-current"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={useDeviceLocation}
          disabled={busy}
          data-testid="use-device-location"
          className="tap-target inline-flex items-center gap-1.5 rounded-2xl border border-white/60 bg-white/40 px-3 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-white/70 disabled:opacity-50"
        >
          <LocateFixed className="h-3.5 w-3.5" aria-hidden />
          {t("locationUseDevice")}
        </button>
      )}
    </div>
  );
}
