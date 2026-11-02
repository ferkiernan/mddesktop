// Run: node tests/e2e/native/recovery.cdp.mjs <path-to-built-exe>   (debug build, WebView2 CDP)
// Unsaved edits survive a crash (killed process) and a normal close; relaunch restores them as modified, no prompt (US4).
import { spawn, execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2];
const exeName = exe.split(/[\\/]/).pop();
// isolated app-data dir (debug builds honor MDD_DATA_DIR): never touch the user's real data
const DATA_DIR = join(process.env.TEMP, "mdd-e2e-data");
rmSync(DATA_DIR, { recursive: true, force: true });
process.env.MDD_DATA_DIR = DATA_DIR;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let port = 9340;

async function launch() {
  port++;
  const env = { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` };
  const child = spawn(exe, [], { env, stdio: "ignore" });
  let targets;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (targets.some((t) => t.type === "page")) break;
    } catch {}
    await sleep(250);
  }
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result);
  };
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evalJs = async (expression) =>
    (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
  return { child, ws, send, evalJs };
}
const kill = () => { try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {} };

// --- run 1: create a document, type, wait for the recovery write, crash ---
let app = await launch();
await sleep(2500);
await app.evalJs(`document.querySelector(".app-tabs").dispatchEvent(new MouseEvent("auxclick", { button: 1, bubbles: true, cancelable: true }))`);
await sleep(2000);
await app.evalJs(`document.querySelector(".editor-slot:not([hidden]) .ProseMirror").focus()`);
await app.send("Input.insertText", { text: "texto sin guardar para recuperar" });
await sleep(5500); // > 4 s recovery debounce
kill();
await sleep(1500);

const state = (app) => app.evalJs(`JSON.stringify({dialog:document.querySelector(".dialog")?.innerText ?? null, tabs:[...document.querySelectorAll("[role=tab] .tab-name")].map(e=>e.textContent), dirty:!!document.querySelector(".tab-dirty"), text:document.querySelector(".editor-slot:not([hidden]) .ProseMirror")?.innerText})`);
const isRunning = () => execSync(`tasklist /FI "IMAGENAME eq ${exeName}" /NH`).toString().includes(exeName);

// --- run 2 (after a crash): everything is restored as modified, WITHOUT any prompt ---
app = await launch();
await sleep(4000);
const s2 = JSON.parse(await state(app));
console.log("1) after crash:", JSON.stringify(s2));
const ok1 = s2.dialog === null && s2.dirty && s2.text.includes("texto sin guardar para recuperar");

// --- graceful close with edits newer than the 4 s debounce: closing keeps them, no prompt ---
await app.evalJs(`document.querySelector(".editor-slot:not([hidden]) .ProseMirror").focus()`);
await app.send("Input.insertText", { text: " Y MAS CAMBIOS" });
await sleep(800);
execSync(`taskkill /IM ${exeName}`, { stdio: "ignore" }); // no /F: sends WM_CLOSE like the window X button
let exited = false;
for (let i = 0; i < 40 && !exited; i++) { await sleep(250); exited = !isRunning(); }
console.log("2) exited on its own without a dialog:", exited);
if (!exited) kill();
await sleep(1000);

// --- run 3: the latest edits are back, still modified ---
app = await launch();
await sleep(4000);
const s3 = JSON.parse(await state(app));
console.log("3) after graceful close:", JSON.stringify(s3));
const ok2 = exited && s3.dialog === null && s3.dirty && s3.text.includes("Y MAS CAMBIOS");

const ok = ok1 && ok2;
console.log(ok ? "PASS" : "FAIL");
kill();
process.exit(ok ? 0 : 1);
