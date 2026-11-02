// Run: node tests/e2e/native/os-integration.cdp.mjs <path-to-built-exe>  (debug build, WebView2 CDP)
// Real-app check of US5: open via argv, second instance forwarding, rejected files.
import { spawn, execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2];
// isolated app-data dir (debug builds honor MDD_DATA_DIR): never touch the user's real data
process.env.MDD_DATA_DIR = join(process.env.TEMP, "mdd-e2e-data");
const dir = join(process.env.TEMP, "mdd-os-test");
mkdirSync(dir, { recursive: true });
const a = join(dir, "alpha.md"), b = join(dir, "beta.markdown"), c = join(dir, "gamma.txt");
writeFileSync(a, "# Alpha\n\nprimer archivo\n");
writeFileSync(b, "# Beta\n\nsegundo archivo\n");
writeFileSync(c, "no markdown");

const port = 9334;
const env = { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const first = spawn(exe, [a], { env, stdio: "ignore" });

let targets;
for (let i = 0; i < 60; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.some((t) => t.type === "page")) break; } catch {}
  await sleep(250);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg.result); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const state = async () => JSON.parse((await send("Runtime.evaluate", { returnByValue: true, expression:
  `JSON.stringify({tabs:[...document.querySelectorAll("[role=tab] .tab-name")].map(e=>e.textContent), selected:document.querySelector("[aria-selected=true] .tab-name")?.textContent, text:(document.querySelector(".editor-slot:not([hidden]) .ProseMirror")||{}).innerText, dialog:document.querySelector(".dialog")?.innerText})` })).result.value);

await send("Runtime.enable");
await sleep(3500);
console.log("1) after argv launch:", JSON.stringify(await state()));

// second instance: should forward to the first window and exit
const second = spawn(exe, [b, c], { env, stdio: "ignore" });
await sleep(3500);
console.log("2) after second instance:", JSON.stringify(await state()));
const count = execSync('tasklist /FI "IMAGENAME eq mddesktop.exe" /NH').toString().split("\n").filter((l) => l.includes("mddesktop.exe")).length;
console.log("3) mddesktop.exe processes:", count, "second exited:", second.exitCode !== null);

ws.close();
spawn("taskkill", ["/F", "/T", "/PID", String(first.pid)], { stdio: "ignore" });
await sleep(500);
process.exit(0);
