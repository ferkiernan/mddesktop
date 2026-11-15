// Run: node tests/e2e/native/editor-options.cdp.mjs <path-to-built-exe>   (debug build, WebView2 CDP)
// Spec 003 US6: "Mostrar barra de herramientas" and "Historial de versiones" are on by default, are persisted by the
// real settings command and survive a reload in the real app.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2] ?? join(process.env.TEMP, "mddesktop-test.exe");
const exeName = exe.split(/[\/]/).pop();
// isolated app-data dir (debug builds honor MDD_DATA_DIR): never touch the user's real data
const DATA_DIR = join(process.env.TEMP, "mdd-e2e-data-options");
rmSync(DATA_DIR, { recursive: true, force: true });
mkdirSync(DATA_DIR, { recursive: true });
process.env.MDD_DATA_DIR = DATA_DIR;
const doc = join(process.env.TEMP, "mdd-options-doc.md");
writeFileSync(doc, "# Opciones\n\nTexto.\n");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9420;
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
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600));
  return r.result.value;
};
const state = () => evalJs(`JSON.stringify({
  toolbar: document.querySelectorAll(".editor-slot:not([hidden]) .MarkdownEditor_toolbar").length,
  history: document.querySelectorAll('.editor-slot:not([hidden]) button[aria-label="Historial de versiones"]').length,
})`).then(JSON.parse);

let failures = 0;
const check = (name, ok, extra = "") => { if (!ok) failures++; console.log(ok ? "ok  " : "FAIL", name, extra); };

await sleep(4000);
let s = await state();
check("defaults: toolbar and history button visible", s.toolbar === 1 && s.history === 1, JSON.stringify(s));

const saved = await evalJs(`window.__TAURI_INTERNALS__.invoke("settings_save", { patch: { editorToolbarVisible: false, editorHistory: false } })`);
check("settings command stores both options", saved.editorToolbarVisible === false && saved.editorHistory === false);
await send("Page.reload");
await sleep(4000);
s = await state();
check("after reload: toolbar hidden", s.toolbar === 0, JSON.stringify(s));

await evalJs(`window.__TAURI_INTERNALS__.invoke("settings_save", { patch: { editorToolbarVisible: true } })`);
await send("Page.reload");
await sleep(4000);
s = await state();
check("toolbar back, history still off (no clock button)", s.toolbar === 1 && s.history === 0, JSON.stringify(s));

await evalJs(`window.__TAURI_INTERNALS__.invoke("settings_save", { patch: { editorHistory: true } })`);
await send("Page.reload");
await sleep(4000);
s = await state();
check("history back on", s.toolbar === 1 && s.history === 1, JSON.stringify(s));

// spec 015: Configuración > Desactivar corrector ortográfico (menu action -> preference -> editor), kept after reload
const spell = () => evalJs(`document.querySelector(".editor-slot:not([hidden]) .ProseMirror")?.spellcheck`);
check("spell checking on by default", (await spell()) === true);
await evalJs(`window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "menu://action", payload: { id: "settings.toggleSpellcheck" } })`);
await sleep(1000);
check("menu check turns spell checking off", (await spell()) === false);
await send("Page.reload");
await sleep(4000);
check("still off after reload", (await spell()) === false);
await evalJs(`window.__TAURI_INTERNALS__.invoke("settings_save", { patch: { spellcheckDisabled: false } })`);
await send("Page.reload");
await sleep(4000);
check("back on", (await spell()) === true);

ws.close();
try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {}
rmSync(DATA_DIR, { recursive: true, force: true });
console.log(failures ? `FAIL (${failures})` : "PASS");
process.exit(failures ? 1 : 0);
