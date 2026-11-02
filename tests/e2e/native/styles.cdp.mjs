// Run: node tests/e2e/native/styles.cdp.mjs <path-to-built-exe> [outDir]   (debug build, WebView2 CDP)
// Applies each editor style through the real settings command, reloads, checks the editor is styled
// (toolbar has its gradient and icons) and saves a screenshot per style.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2];
const out = process.argv[3] ?? join(process.env.TEMP, "mdd-styles");
mkdirSync(out, { recursive: true });
const exeName = exe.split(/[\\/]/).pop();
// isolated app-data dir (debug builds honor MDD_DATA_DIR): never touch the user's real data
const DATA_DIR = join(process.env.TEMP, "mdd-e2e-data");
rmSync(DATA_DIR, { recursive: true, force: true });
process.env.MDD_DATA_DIR = DATA_DIR;
const doc = join(process.env.TEMP, "mdd-styles-doc.md");
writeFileSync(doc, "# Estilos\n\nTexto con **negrita**, *cursiva* y un [enlace](https://example.com).\n\n- uno\n- dos\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9380;
const child = spawn(exe, [doc], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: "ignore" });
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
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;

await sleep(4000);
const styles = ["default", "dark", "notebook", "terminal", "winamp", "cg", "anthropic"];
let failures = 0;
for (const s of styles) {
  // same call the UI makes when a style is picked from the Configuración menu
  await evalJs(`window.__TAURI_INTERNALS__.invoke("settings_save", { patch: { editorStyle: ${JSON.stringify(s)} } })`);
  await send("Page.reload");
  await sleep(3500);
  const info = JSON.parse(await evalJs(`JSON.stringify((() => {
    const root = document.querySelector(".mdd-editor");
    const tb = root?.firstElementChild;
    return { style: document.documentElement.dataset.editorStyle, rootClass: root?.className,
      toolbarBg: tb && getComputedStyle(tb).backgroundImage.slice(0, 40), icons: root?.querySelectorAll("svg").length };
  })())`));
  const ok = info.style === s && /MarkdownEditor_root/.test(info.rootClass ?? "") && (info.icons ?? 0) > 5 && info.toolbarBg?.includes("gradient");
  if (!ok) failures++;
  console.log(ok ? "ok  " : "FAIL", s, JSON.stringify(info));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(out, `${s}.png`), Buffer.from(shot.data, "base64"));
}
console.log(failures ? `FAIL (${failures})` : "PASS", "screenshots in", out);
ws.close();
try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {}
process.exit(failures ? 1 : 0);
