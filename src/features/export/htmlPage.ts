// Self-contained web page: A4-wide (210 mm), centred, no external resources (spec FR-005).
import type { Snapshot } from "./snapshot";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildHtmlPage(snap: Snapshot, title: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
html{background:#e5e7eb}
body{margin:0;padding:24px 0}
.page{box-sizing:border-box;width:210mm;min-height:297mm;margin:0 auto;padding:15mm;${snap.backgroundCss};color:${snap.color};font-family:${snap.fontFamily.replace(/"/g, "'")};box-shadow:0 2px 12px rgba(0,0,0,.25)}
@media print{html{background:none}body{padding:0}.page{box-shadow:none;margin:0}@page{size:A4;margin:0}}
</style>
</head>
<body>
<div class="page">
${snap.html}
</div>
</body>
</html>
`;
}
