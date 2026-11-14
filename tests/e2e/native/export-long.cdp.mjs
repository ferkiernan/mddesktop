// Run: node tests/e2e/native/export-long.cdp.mjs [exe]   (build it with `node scripts/build-test-exe.mjs`)
// Spec 005 US2 on the real WebView2: a long document (tall table, wide table, tall diagram, long code block,
// long paragraphs) exported to PDF is never cut through a row, an image or a line, nothing is wider than the
// page and long tables repeat their header. Also checks that the content zoom never reaches the export (007).
import { spawn, execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2] ?? join(process.env.TEMP, "mddesktop-test.exe");
const exeName = exe.split(/[\\/]/).pop();
const out = process.argv[3] ?? join(process.env.TEMP, "mdd-export-long");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
process.env.MDD_DATA_DIR = join(process.env.TEMP, "mdd-e2e-data-long");
rmSync(process.env.MDD_DATA_DIR, { recursive: true, force: true });

const rows = Array.from({ length: 120 }, (_, i) => `| fila ${i + 1} | valor ${i * 7} | texto ${"x".repeat(i % 30)} |`).join("\n");
const wide =
  "| " + Array.from({ length: 12 }, (_, i) => `columna_ancha_${i}`).join(" | ") + " |\n|" + "---|".repeat(12) + "\n| " +
  Array.from({ length: 12 }, () => "valor_largo_largo").join(" | ") + " |";
const code = Array.from({ length: 200 }, (_, i) => `const linea${i} = ${i}; // ${"comentario ".repeat(i % 12)}`).join("\n");
const para = Array.from({ length: 60 }, (_, i) => `Frase número ${i + 1} de un párrafo muy largo.`).join(" ");
const tall = "graph TD\n" + Array.from({ length: 30 }, (_, i) => `  N${i}[Paso ${i}] --> N${i + 1}[Paso ${i + 1}]`).join("\n");
const FENCE = "```";
const longDoc = `# Largo\n\n| A | B | C |\n|---|---|---|\n${rows}\n\n${wide}\n\n${FENCE}mermaid\n${tall}\n${FENCE}\n\n${FENCE}ts\n${code}\n${FENCE}\n\n${para}\n\n${para}\n`;
const doc = join(out, "largo.md");
writeFileSync(doc, longDoc);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9430;
spawn(exe, [doc], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: "ignore" });
let targets;
for (let i = 0; i < 80; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some((t) => t.type === "page")) break; } catch {}
  await sleep(250);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
  return r.result.value;
};
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "ok  " : "FAIL", name, extra); };

await sleep(4000);
window_check: {
  if (!(await evalJs("typeof window.__mdd")).includes("object")) throw new Error("not an E2E build (VITE_E2E)");
}

// measure in the page: lay out like the PDF does, then verify every cut against the fitted markup
async function measure(zoom) {
  await evalJs(`window.__TAURI_INTERNALS__.invoke("settings_save", { patch: { contentZoom: ${zoom} } })`);
  return evalJs(`(async () => {
    const md = ${JSON.stringify(longDoc)};
    const v = await window.__mdd.viewerApi();
    const sn = await window.__mdd.snapshotApi();
    const ra = await window.__mdd.rasterApi();
    return v.withViewer(md, async ({ content, background }) => {
      const snap = await sn.snapshotContent(content, background);
      const layout = await ra.layoutPages(snap);
      const frame = document.createElement("iframe");
      frame.style.cssText = "position:fixed;left:-20000px;top:0;width:680px;height:200px;border:0";
      const loaded = new Promise((r) => frame.addEventListener("load", r, { once: true }));
      frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><div style="width:680px;position:relative">' + layout.html + "</div></body></html>";
      document.body.appendChild(frame);
      await loaded;
      const root = frame.contentDocument.body.firstElementChild.firstElementChild;
      const left = root.getBoundingClientRect().left;
      const base = root.getBoundingClientRect().top;
      const tooWide = Array.from(root.querySelectorAll("*")).filter((e) => e.getBoundingClientRect().right - left > 681).length;
      const cuts = layout.slices.slice(0, -1).map((s) => s.top + s.height);
      const crosses = (sel, maxH) => cuts.filter((c) => Array.from(root.querySelectorAll(sel)).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top - base < c - 1 && r.bottom - base > c + 1 && r.height < maxH;
      })).length;
      const result = {
        pages: layout.slices.length,
        headers: layout.slices.filter((s) => s.header).length,
        warnings: layout.warnings,
        tooWide,
        throughRow: crosses("tr", 1009),
        throughImg: crosses("img", 100000),
        contentWidth: Math.round(content.getBoundingClientRect().width),
      };
      frame.remove();
      return result;
    });
  })()`);
}

const at100 = await measure(1);
console.log("-- 100 %:", JSON.stringify(at100));
check("several A4 pages", at100.pages >= 4, `${at100.pages}`);
check("long table repeats its header on continuation pages", at100.headers >= 2, `${at100.headers}`);
check("nothing wider than the page (wide table scaled, code wrapped)", at100.tooWide === 0, `${at100.tooWide}`);
check("no cut through a table row", at100.throughRow === 0, `${at100.throughRow}`);
check("no cut through an image or diagram", at100.throughImg === 0, `${at100.throughImg}`);

const at150 = await measure(1.5);
check("content zoom 150 % does not change the export (spec 007)", at150.pages === at100.pages && at150.contentWidth === at100.contentWidth, `${at150.pages} vs ${at100.pages}`);
await evalJs(`window.__TAURI_INTERNALS__.invoke("settings_save", { patch: { contentZoom: 1 } })`);

// keep two page images for a visual check
const imgs = await evalJs(`(async () => {
  const m = await window.__mdd.exportApi();
  const r = await m.buildExport(${JSON.stringify(longDoc)}, "pdf", "largo");
  return [1, 2].map((i) => m.toBase64(r.pages[i].jpeg));
})()`);
imgs.forEach((b64, i) => writeFileSync(join(out, `page${i + 2}.jpeg`), Buffer.from(b64, "base64")));

const failed = results.filter((x) => !x).length;
console.log(failed ? `FAIL (${failed})` : "PASS", "-> files in", out);
ws.close();
try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {}
rmSync(process.env.MDD_DATA_DIR, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
