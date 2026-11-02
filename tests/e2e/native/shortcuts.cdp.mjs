// Run: node tests/e2e/native/shortcuts.cdp.mjs <path-to-built-exe>   (debug build, WebView2 CDP)
// Real key events (CDP Input.dispatchKeyEvent) against the real window: US6 shortcuts.
import { spawn, execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2];
const exeName = exe.split(/[\\/]/).pop();
rmSync(join(process.env.APPDATA, "com.ferkiernan.mddesktop"), { recursive: true, force: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9350;
const child = spawn(exe, [], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: "ignore" });
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
const evalJs = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const CTRL = 2, SHIFT = 8;
async function chord(key, code, vk, modifiers) {
  const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...base });
  await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  await sleep(700);
}
const tabs = () => evalJs(`JSON.stringify({names:[...document.querySelectorAll("[role=tab] .tab-name")].map(e=>e.textContent), selected:document.querySelector("[aria-selected=true] .tab-name")?.textContent})`);

await sleep(3000);
const results = [];
await chord("n", "KeyN", 78, CTRL); await chord("n", "KeyN", 78, CTRL); await chord("n", "KeyN", 78, CTRL);
results.push(["Ctrl+N x3", await tabs()]);
await chord("Tab", "Tab", 9, CTRL);
results.push(["Ctrl+Tab (wraps to first)", await tabs()]);
await chord("Tab", "Tab", 9, CTRL | SHIFT);
results.push(["Ctrl+Shift+Tab (back to last)", await tabs()]);
await chord("w", "KeyW", 87, CTRL);
results.push(["Ctrl+W closes active", await tabs()]);
for (const [name, v] of results) console.log(name + ":", v);

const t = results.map(([, v]) => JSON.parse(v));
const ok =
  t[0].names.length === 3 && t[0].selected === "Sin título 3" &&
  t[1].selected === "Sin título 1" && t[2].selected === "Sin título 3" && t[3].names.length === 2;
console.log(ok ? "PASS" : "FAIL");
ws.close();
try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {}
process.exit(ok ? 0 : 1);
