// A4 geometry shared by every paginated export (CSS px at 96 dpi unless noted).

export const A4 = {
  widthMm: 210,
  heightMm: 297,
  widthPx: 794,
  heightPx: 1123,
  widthPt: 595.28,
  heightPt: 841.89,
  /** Page margin: 15 mm. */
  marginPx: 57,
  /** Raster scale: 2x gives about 192 dpi. */
  scale: 2,
  /** DOCX units (1 mm = 36 000 EMU). */
  widthEmu: 7_560_000,
  heightEmu: 10_692_000,
} as const;

export const CONTENT_WIDTH_PX = A4.widthPx - 2 * A4.marginPx; // 680
export const CONTENT_HEIGHT_PX = A4.heightPx - 2 * A4.marginPx; // 1009
export const RASTER_WIDTH_PX = A4.widthPx * A4.scale; // 1588
export const RASTER_HEIGHT_PX = A4.heightPx * A4.scale; // 2246
export const JPEG_QUALITY = 0.92;
