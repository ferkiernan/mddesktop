// Colours, contrast and fonts for the native Word/ODT export (spec 006 FR-010, FR-011).

export type Rgb = [number, number, number];

/** Parses `rgb()/rgba()` or `#rgb/#rrggbb`; fully transparent colours return null. */
export function parseColor(css: string | null | undefined): Rgb | null {
  if (!css) return null;
  const s = css.trim();
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;
    return [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])];
  }
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s)?.[1];
  if (!h) return null;
  const full = h.length === 3 ? [...h].map((x) => x + x).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

export const hex = (c: Rgb) => c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

function luminance([r, g, b]: Rgb): number {
  const ch = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Keeps `fg` when it reads well on `bg` (>= 4.5:1); otherwise black or white, whichever contrasts more. */
export function readable(fg: Rgb, bg: Rgb): Rgb {
  if (contrast(fg, bg) >= 4.5) return fg;
  return contrast([0, 0, 0], bg) >= contrast([255, 255, 255], bg) ? [0, 0, 0] : [255, 255, 255];
}

export const isDark = (c: Rgb) => luminance(c) < 0.2;

/** Fonts installed on practically every Windows/Office and LibreOffice machine. */
const COMMON = [
  "Arial", "Calibri", "Cambria", "Candara", "Consolas", "Constantia", "Corbel", "Courier New", "Georgia",
  "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana", "Lucida Console",
];

/** First common family of a CSS `font-family` list, or a common substitute for its generic family. */
export function commonFont(cssFamily: string, mono = false): string {
  const families = cssFamily.split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
  for (const f of families) {
    const hit = COMMON.find((c) => c.toLowerCase() === f.toLowerCase());
    if (hit) return hit;
  }
  const generic = families.find((f) => /^(serif|sans-serif|monospace|system-ui|ui-monospace|ui-sans-serif|ui-serif)$/i.test(f));
  if (mono || /mono/i.test(generic ?? "") || families.some((f) => /mono|code|courier/i.test(f))) return "Consolas";
  if (/serif/i.test(generic ?? "") && !/sans/i.test(generic ?? "")) return "Georgia";
  return "Segoe UI";
}
