// Run: node tests/e2e/native/recovery.cdp.mjs <path-to-built-exe>   (debug build, WebView2 CDP)
// Kills the app abruptly with unsaved edits, relaunches, and checks the recovery flow (US4).
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
await app.evalJs(`document.querySelector(".tab-new").click()`);
await sleep(2000);
await app.evalJs(`document.querySelector(".editor-slot:not([hidden]) .ProseMirror").focus()`);
await app.send("Input.insertText", { text: "texto sin guardar para recuperar" });
await sleep(5500); // > 4 s recovery debounce
kill();
await sleep(1500);

// --- run 2: expect the recovery dialog ---
app = await launch();
await sleep(3500);
const dialog = await app.evalJs(`document.querySelector(".dialog")?.innerText ?? null`);
console.log("1) dialog:", JSON.stringify(dialog));
await app.evalJs(`[...document.querySelectorAll(".dialog button")].find(b=>b.textContent==="Recuperar").click()`);
await sleep(2500);
const after = await app.evalJs(`JSON.stringify({tabs:[...document.querySelectorAll("[role=tab] .tab-name")].map(e=>e.textContent), dirty:!!document.querySelector(".tab-dirty"), text:document.querySelector(".editor-slot:not([hidden]) .ProseMirror")?.innerText})`);
console.log("2) after recover:", after);
const ok = dialog?.includes("Recuperar") && after.includes("texto sin guardar para recuperar");
console.log(ok ? "PASS" : "FAIL");
kill();
process.exit(ok ? 0 : 1);
