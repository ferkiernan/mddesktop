// Run: node --experimental-strip-types tests/e2e/native/export-mermaid.cdp.mjs [exe]   (build it with `node scripts/build-test-exe.mjs`)
// Bug pdf-mermaid-missing: with many diagrams the export captured Mermaid's source placeholder (<pre>) instead of
// the diagram. Every parsable diagram must reach the export as an image (any style); an invalid one stays as code.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const { EDITOR_STYLES } = await import(new URL("../../../src/features/settings/editorStyles.ts", import.meta.url));

const exe = process.argv[2] ?? join(process.env.TEMP, "mddesktop-test.exe");
const out = join(process.env.TEMP, "mdd-export-mermaid");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
process.env.MDD_DATA_DIR = join(process.env.TEMP, "mdd-e2e-data-mermaid");
rmSync(process.env.MDD_DATA_DIR, { recursive: true, force: true });

const FENCE = "```";
const N = 20;
// sized like a real document's diagrams (about 12 nodes, multi-line labels): together they take ~1 s to render
const diagram = (i) =>
  `flowchart TD\n  A${i}["Inicio ${i}"] --> B${i}{"¿Pregunta<br/>número ${i}?"}\n  B${i} -- "Sí" --> C${i}["Camino<br/>afirmativo"]\n  B${i} -- "No" --> D${i}["Camino<br/>negativo"]\n` +
  Array.from({ length: 8 }, (_, k) => `  ${k ? `N${i}_${k - 1}` : `C${i} & D${i}`} --> N${i}_${k}["Paso ${k} del diagrama ${i}<br/>con una segunda línea"]`).join("\n");
const markdown =
  "# Diagramas\n\n" +
  Array.from({ length: N }, (_, i) => `## Parte ${i + 1}\n\n${"Texto del párrafo. ".repeat(60)}\n\n${FENCE}mermaid\n${diagram(i)}\n${FENCE}\n`).join("\n") +
  `\n${FENCE}mermaid\nflowchart TD\n  A --> \n${FENCE}\n`;
const doc = join(out, "diagramas.md");
writeFileSync(doc, markdown);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9434;
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
if (!(await evalJs("typeof window.__mdd")).includes("object")) throw new Error("not an E2E build (VITE_E2E)");
const docId = await evalJs("window.__mdd.store.getState().activeId");

for (const sid of ["default", "anthropic"]) {
  const vars = EDITOR_STYLES.find((s) => s.id === sid).vars;
  const html = await evalJs(`(async () => {
    const m = await window.__mdd.exportApi();
    const b = await m.buildExport(${JSON.stringify(markdown)}, "html", "x", undefined, ${JSON.stringify(docId)}, ${JSON.stringify(vars)});
    return new TextDecoder().decode(b.bytes);
  })()`);
  writeFileSync(join(out, `${sid}.html`), html);
  const imgs = (html.match(/data:image\/svg\+xml/g) || []).length;
  check(`${sid}: all ${N} diagrams exported as images`, imgs === N, `(${imgs})`);
  check(`${sid}: no diagram source left as code`, !html.includes("Pregunta&lt;br/&gt;") && !html.includes("Pregunta<br/>número"));
  check(`${sid}: the invalid diagram stays as code`, html.includes("A --&gt;"));
}

ws.close();
try { (await import("node:child_process")).execSync(`taskkill /IM ${exe.split(/[\/]/).pop()} /F`, { stdio: "ignore" }); } catch {}
const failed = results.filter((r) => !r).length;
console.log(failed ? `${failed} FAILED` : `all ${results.length} passed`);
process.exit(failed ? 1 : 0);
