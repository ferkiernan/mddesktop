// UI timings on the real app (release build) over WebView2 CDP.
// Usage: node scripts/perf/measure-ui.mjs <exe> [sizeKB=100]
// Reports: time from process start until the document is rendered (open), and tab-switch latency (SC-003).
import { spawn, execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2];
const sizeKB = Number(process.argv[3] ?? 100);
const exeName = exe.split(/[\\/]/).pop();
rmSync(join(process.env.APPDATA, "com.ferkiernan.mddesktop"), { recursive: true, force: true });
const dir = join(process.env.TEMP, "mdd-perf");
mkdirSync(dir, { recursive: true });
const para = "## Seccion\n\nTexto de ejemplo con **negrita**, *cursiva* y un [enlace](https://example.com).\n\n- uno\n- dos\n- tres\n\n";
const body = para.repeat(Math.ceil((sizeKB * 1024) / para.length));
const files = [1, 2, 3].map((n) => join(dir, `doc${n}.md`));
files.forEach((f, i) => writeFileSync(f, `# Documento ${i + 1}\n\n${body}`));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9370;
const t0 = performance.now();
const child = spawn(exe, files, { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: "ignore" });
let targets;
for (let i = 0; i < 400; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some((t) => t.type === "page")) break; } catch {}
  await sleep(25);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;

// time until the first document is rendered (measured from process spawn)
let openMs = null;
while (performance.now() - t0 < 20000) {
  if (await evalJs(`!!document.querySelector(".editor-slot:not([hidden]) .ProseMirror")?.textContent.includes("Documento")`)) { openMs = Math.round(performance.now() - t0); break; }
  await sleep(10);
}
await sleep(1500); // let the other two files open

// tab switch: click -> next paint with the new tab selected and its editor visible
const switches = [];
for (let i = 0; i < 12; i++) {
  const ms = await evalJs(`(async () => {
    const tabs = [...document.querySelectorAll("[role=tab]")];
    const target = tabs[${i} % tabs.length];
    const t = performance.now();
    target.click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const ok = target.getAttribute("aria-selected") === "true" && !!document.querySelector(".editor-slot:not([hidden]) .ProseMirror");
    return ok ? performance.now() - t : -1;
  })()`);
  switches.push(Math.round(ms));
  await sleep(150);
}
const valid = switches.filter((x) => x >= 0).sort((a, b) => a - b);
const median = valid[Math.floor(valid.length / 2)];
console.log(JSON.stringify({ docSizeKB: sizeKB, openFromProcessStartMs: openMs, tabSwitchMs: switches, tabSwitchMedianMs: median, tabSwitchMaxMs: valid.at(-1) }));
ws.close();
try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {}
process.exit(0);
