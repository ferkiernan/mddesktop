// Run: node tests/e2e/native/about.cdp.mjs <path-to-built-exe>  (debug build, WebView2 CDP)
// Spec 011: Ayuda > Acerca de shows the executable's version and build date; the link command only
// accepts its closed list (an unknown id is rejected, so nothing is opened).
import { spawn } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2];
const DATA_DIR = join(process.env.TEMP, "mdd-e2e-data");
rmSync(DATA_DIR, { recursive: true, force: true });
process.env.MDD_DATA_DIR = DATA_DIR;
const version = JSON.parse(readFileSync("package.json", "utf8")).version;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9391;
const child = spawn(exe, [], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: "ignore" });
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
let failures = 0;
const check = (ok, label, info) => { if (!ok) failures++; console.log(ok ? "ok  " : "FAIL", label, info ?? ""); };

// same event the native "Ayuda > Acerca de MD Desktop…" item emits
await evalJs(`window.__TAURI_INTERNALS__.invoke("plugin:event|emit", { event: "menu://action", payload: { id: "help.about" } })`);
await sleep(1500);
const text = await evalJs(`document.querySelector("[role=dialog]")?.innerText ?? ""`);
check(text.includes(`Versión ${version}`), "version of the executable", JSON.stringify(text.split("\n").slice(0, 4)));
check(/compilada el \d{2}\/\d{2}\/\d{4}/.test(text), "build date");
check(text.includes("Fernando Manuel Kiernan") && text.includes("mdwysiwyg") && text.includes("@ferkiernan"), "author and library credit");
const logo = await evalJs(`(() => { const i = document.querySelector("[role=dialog] img"); return i ? i.complete && i.naturalWidth : 0; })()`);
check(logo > 0, "logo loads", logo);
const rejected = await evalJs(`window.__TAURI_INTERNALS__.invoke("open_about_link", { which: "file:///C:/Windows" }).then(() => "opened", (e) => "rejected:" + JSON.stringify(e))`);
check(String(rejected).startsWith("rejected"), "unknown link id is refused", rejected);
await evalJs(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))`);
await sleep(400);
check((await evalJs(`document.querySelectorAll("[role=dialog]").length`)) === 0, "Escape closes");

ws.close();
spawn("taskkill", ["/F", "/T", "/PID", String(child.pid)], { stdio: "ignore" });
await sleep(500);
console.log(failures ? `${failures} failure(s)` : "all ok");
process.exit(failures ? 1 : 0);
