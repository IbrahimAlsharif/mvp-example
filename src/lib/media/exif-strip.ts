/**
 * Dependency-free JPEG metadata stripping (US-2.2 AC-6).
 *
 * A coarsened *displayed* location is not enough: if the downloadable media
 * file still carries intact GPS EXIF, exact whereabouts leak through the file
 * itself. Before serving a JPEG to a share-link (non-owner) viewer we strip the
 * metadata segments that can hold location — APP1 (EXIF, XMP) and the other
 * APPn application markers — leaving the image data intact.
 *
 * Scope: JPEG is the only format in the upload allowlist that embeds GPS EXIF
 * from a camera/phone capture. PNG/MP4/WAV/MP3 do not carry the same
 * camera-GPS EXIF block, so they pass through unchanged.
 *
 * Implementation: a JPEG is a sequence of marker segments. We keep SOI (FFD8),
 * the frame/scan data, and drop every APPn (FFE0–FFEF) and COM (FFFE) segment.
 * Once we hit Start-of-Scan (FFDA) the rest is entropy-coded image data and is
 * copied verbatim.
 */

const isJpeg = (buf: Uint8Array): boolean =>
  buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8;

export function stripJpegMetadata(input: Uint8Array): Uint8Array {
  if (!isJpeg(input)) return input;

  const out: number[] = [0xff, 0xd8]; // SOI
  let i = 2;

  while (i + 1 < input.length) {
    // Markers are 0xFF followed by a non-0x00, non-0xFF marker code.
    if (input[i] !== 0xff) {
      // Not at a marker boundary (shouldn't happen in a well-formed header);
      // bail out and copy the remainder verbatim rather than risk corruption.
      for (let k = i; k < input.length; k++) out.push(input[k]);
      return Uint8Array.from(out);
    }
    const marker = input[i + 1];

    // Start of Scan: image data follows to EOI — copy everything verbatim.
    if (marker === 0xda) {
      for (let k = i; k < input.length; k++) out.push(input[k]);
      return Uint8Array.from(out);
    }

    // Standalone markers (no length payload): RSTn, EOI, TEM.
    if (marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }

    // Length-bearing segment: 2-byte big-endian length (includes the 2 bytes).
    const len = (input[i + 2] << 8) | input[i + 3];
    const segStart = i;
    const segEnd = i + 2 + len;

    const isAppn = marker >= 0xe0 && marker <= 0xef; // APP0–APP15 (EXIF/XMP/etc.)
    const isComment = marker === 0xfe; // COM
    if (!isAppn && !isComment) {
      // Keep frame headers, quant/huffman tables, etc. verbatim.
      for (let k = segStart; k < segEnd && k < input.length; k++) out.push(input[k]);
    }
    // else: drop the whole metadata segment.

    i = segEnd;
  }

  return Uint8Array.from(out);
}
