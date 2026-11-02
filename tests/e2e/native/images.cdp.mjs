// Run: node tests/e2e/native/images.cdp.mjs <path-to-built-exe>   (debug build, WebView2 CDP)
// US7 display check: a document with a relative image renders it through the asset: protocol.
// Needs an mdwysiwyg build with resolveImageSrc (docs/mdwysiwyg-host-api.patch / mdwysiwyg >= 0.3).
import { spawn, execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2];
const exeName = exe.split(/[\\/]/).pop();
const dir = join(process.env.TEMP, "mdd-img-test", "mi carpeta");
rmSync(join(process.env.TEMP, "mdd-img-test"), { recursive: true, force: true });
mkdirSync(join(dir, "assets"), { recursive: true });
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
writeFileSync(join(dir, "assets", "mi foto.png"), png);
const doc = join(dir, "nota.md");
writeFileSync(doc, "# Con imagen\n\n![foto](assets/mi%20foto.png)\n");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9360;
const child = spawn(exe, [doc], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: "ignore" });
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
await sleep(4500);
const r = (await send("Runtime.evaluate", { returnByValue: true, expression:
  `JSON.stringify((()=>{const i=document.querySelector(".editor-slot:not([hidden]) .ProseMirror img");return i?{src:i.getAttribute("src"),loaded:i.complete&&i.naturalWidth>0}:null})())` })).result.value;
console.log("img:", r);
const info = JSON.parse(r ?? "null");
const ok = !!info && /^(https?:\/\/asset\.localhost|asset:)/.test(info.src) && info.loaded;
console.log(ok ? "PASS" : "FAIL");
ws.close();
try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {}
process.exit(ok ? 0 : 1);
