import { describe, it, expect } from "vitest";
import { coarsenCoordinate, locationForViewer } from "@/lib/events/location";
import { stripJpegMetadata } from "@/lib/media/exif-strip";

describe("US-2.2 shared-location precision (AC-6/AC-7)", () => {
  it("coarsens a coordinate to no finer than ~city/region (0.1° grid)", () => {
    // 24.713552 (a building-level Riyadh coordinate) collapses to the 0.1° grid.
    const c = coarsenCoordinate(24.713552);
    expect(c).toBe(24.7);
    // The coarse value is stable: two nearby precise points map to the same cell.
    expect(coarsenCoordinate(24.681)).toBe(coarsenCoordinate(24.713552));
    // No finer than 0.1° of resolution remains.
    expect(Math.abs(c * 10 - Math.round(c * 10))).toBeLessThan(1e-9);
  });

  it("owner and Family see exact precision; share-link viewers get coarse (AC-6/AC-7)", () => {
    const lat = 24.713552;
    const lng = 46.675297;
    const owner = locationForViewer({ lat, lng, circle: "PUBLIC_UNLISTED", via: "owner" });
    expect(owner.precision).toBe("exact");
    expect(owner.lat).toBe(lat);

    const fam = locationForViewer({ lat, lng, circle: "FAMILY", via: "family_member" });
    expect(fam.precision).toBe("exact");

    const shared = locationForViewer({ lat, lng, circle: "PUBLIC_UNLISTED", via: "share_link" });
    expect(shared.precision).toBe("coarse");
    expect(shared.lat).toBe(24.7);
    expect(shared.lng).toBe(46.7);
    // The exact coordinate is never present in the shared view.
    expect(shared.lat).not.toBe(lat);

    // A non-family authenticated viewer of a PUBLIC event is also exposure beyond
    // the owner+family roster, so it is coarsened identically (never exact GPS).
    const pub = locationForViewer({ lat, lng, circle: "PUBLIC", via: "public" });
    expect(pub.precision).toBe("coarse");
    expect(pub.lat).toBe(24.7);
    expect(pub.lat).not.toBe(lat);
  });

  it("omits location entirely when the owner opts out, or when there is none", () => {
    const omitted = locationForViewer({
      lat: 24.7,
      lng: 46.7,
      circle: "PUBLIC_UNLISTED",
      via: "share_link",
      omitLocation: true,
    });
    expect(omitted.precision).toBe("omitted");
    expect(omitted.lat).toBeNull();

    const none = locationForViewer({ lat: null, lng: null, circle: "PUBLIC_UNLISTED", via: "share_link" });
    expect(none.precision).toBe("omitted");
  });
});

describe("US-2.2 JPEG metadata stripping (AC-6 EXIF leak)", () => {
  // Minimal JPEG: SOI, an APP1 (EXIF) segment carrying fake GPS bytes, a DQT we
  // keep, SOS, one byte of scan data, EOI.
  function jpegWithExif(): Uint8Array {
    const exifPayload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef]; // "Exif\0\0" + GPS-ish
    const app1Len = exifPayload.length + 2;
    return Uint8Array.from([
      0xff, 0xd8, // SOI
      0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...exifPayload, // APP1 (EXIF)
      0xff, 0xdb, 0x00, 0x04, 0x11, 0x22, // DQT (length 4): keep
      0xff, 0xda, 0x00, 0x02, // SOS
      0x99, // scan data byte
      0xff, 0xd9, // EOI
    ]);
  }

  it("removes the APP1/EXIF segment but keeps SOI, frame tables, and scan data", () => {
    const input = jpegWithExif();
    const out = stripJpegMetadata(input);
    // SOI preserved.
    expect([out[0], out[1]]).toEqual([0xff, 0xd8]);
    // The "Exif" marker bytes must be gone.
    const text = Array.from(out);
    const hasExifMarker = text.some(
      (_, i) => out[i] === 0x45 && out[i + 1] === 0x78 && out[i + 2] === 0x69 && out[i + 3] === 0x66,
    );
    expect(hasExifMarker).toBe(false);
    // DQT (0xFFDB) and scan data (0x99) survive.
    const hasDqt = text.some((_, i) => out[i] === 0xff && out[i + 1] === 0xdb);
    expect(hasDqt).toBe(true);
    expect(text).toContain(0x99);
    // Output is smaller than input (metadata removed).
    expect(out.length).toBeLessThan(input.length);
  });

  it("leaves non-JPEG bytes untouched", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03]);
    expect(Array.from(stripJpegMetadata(png))).toEqual(Array.from(png));
  });
});
