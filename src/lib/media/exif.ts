import exifr from "exifr";

export interface ExtractedExif {
  /** Original capture date (ISO yyyy-mm-dd) if the photo carries one. */
  date?: string;
  /** GPS coordinates from the photo, if present. */
  lat?: number;
  lng?: number;
}

/**
 * Read capture date + GPS from an image client-side, so the create-event form
 * can auto-fill the date and location instead of asking the user (US-AI / J2).
 * Best-effort and silent: any parse failure or missing tag just returns {}.
 * Only attempts images; videos/audio are skipped.
 */
export async function readExif(file: File): Promise<ExtractedExif> {
  if (!file.type.startsWith("image/")) return {};
  try {
    const data = await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "CreateDate"] });
    if (!data) return {};
    const out: ExtractedExif = {};
    const captured: Date | undefined = data.DateTimeOriginal ?? data.CreateDate;
    if (captured instanceof Date && !isNaN(captured.getTime())) {
      out.date = captured.toISOString().slice(0, 10);
    }
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      out.lat = data.latitude;
      out.lng = data.longitude;
    }
    return out;
  } catch {
    return {};
  }
}
