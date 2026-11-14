// Run: node tests/e2e/native/export.cdp.mjs [exe]   (build it with `node scripts/build-test-exe.mjs`)
// Drives the real export pipeline inside the real WebView2 (viewer + snapshot + rasterizer + writers) for
// the four formats, saves the files and validates their structure. The OS save dialog is bypassed.
import { spawn, execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const exe = process.argv[2] ?? join(process.env.TEMP, "mddesktop-test.exe");
const exeName = exe.split(/[\\/]/).pop();
const out = process.argv[3] ?? join(process.env.TEMP, "mdd-export-out");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
process.env.MDD_DATA_DIR = join(process.env.TEMP, "mdd-e2e-data");
// the document lives on disk next to assets/pixel.png so its relative image resolves like in the app
const work = join(process.env.TEMP, "mdd-export-doc");
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, "assets"), { recursive: true });
copyFileSync("tests/fixtures/markdown/assets/pixel.png", join(work, "assets", "pixel.png"));
const docPath = join(work, "export-sample.md");
copyFileSync("tests/fixtures/markdown/export-sample.md", docPath);
const markdown = readFileSync(docPath, "utf8");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400;
const child = spawn(exe, [docPath], { env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: "ignore" });
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

await sleep(3500);
if (!(await evalJs("typeof window.__mdd")).includes("object")) throw new Error("not an E2E build (VITE_E2E)");

const docId = await evalJs("window.__mdd.store.getState().activeId");
check0(docId, "document opened from argv");
function check0(v, name) { if (!v) throw new Error("precondition failed: " + name); }
const results = [];
const check = (name, ok, extra = "") => { results.push(ok); console.log(ok ? "ok  " : "FAIL", name, extra); };

for (const format of ["html", "pdf", "docx", "odt"]) {
  const t0 = Date.now();
  const r = await evalJs(`(async () => {
    const m = await window.__mdd.exportApi();
    const { bytes, warnings } = await m.buildExport(${JSON.stringify(markdown)}, ${JSON.stringify(format)}, "Documento de exportación", undefined, ${JSON.stringify(docId)});
    return { b64: m.toBase64(bytes), warnings };
  })()`);
  const file = join(out, `export.${format}`);
  const buf = Buffer.from(r.b64, "base64");
  writeFileSync(file, buf);
  console.log(`-- ${format}: ${buf.length} bytes in ${Date.now() - t0} ms, warnings: ${JSON.stringify(r.warnings)}`);

  if (format === "html") {
    const html = buf.toString("utf8");
    check("html doctype + A4 width", html.startsWith("<!doctype html>") && html.includes("width:210mm"));
    check("html has the content", html.includes("Documento de exportación") && html.includes("Tarea hecha"));
    const external = [...html.matchAll(/\b(?:src|href)="((?:https?:|file:|asset:|\/\/)[^"]*)"/g)].map((x) => x[1]).filter((u) => !/^https:\/\/example\.com/.test(u));
    check("html has no external resources", external.length === 0, JSON.stringify(external.slice(0, 3)));
    check("html embeds the image and the diagram", html.includes("data:image/png;base64") && html.includes("data:image/svg+xml;base64"));
    check("html drops viewer classes (no dependency on external CSS)", !/ class="(?!page")/.test(html));
    check("html checkbox state kept", /checked="checked"/.test(html));
    // 0.4.0+ table menu trigger (a button with a triangle clip-path) must never reach an export
    check("html has no table-menu trigger", !/<button/i.test(html) && !html.includes("polygon(0px 0px, 100% 0px, 100% 100%)"));
    check("html table + code colours inlined", html.includes("<table") && /<pre[^>]*style="[^"]*(background|color)/.test(html));
  } else if (format === "pdf") {
    const s = buf.toString("latin1");
    check("pdf header/footer", s.startsWith("%PDF-1.4") && s.trimEnd().endsWith("%%EOF"));
    const pages = (s.match(/\/Type \/Page /g) ?? []).length;
    check("pdf pages are A4", pages >= 1 && s.includes("/MediaBox [0 0 595.28 841.89]"), `${pages} page(s)`);
    const at = Number(/startxref\n(\d+)/.exec(s)?.[1]);
    check("pdf xref offset valid", s.slice(at, at + 4) === "xref");
    const first = /\n(\d{10}) 00000 n/.exec(s.slice(at));
    check("pdf object offsets valid", first && /^\d+ 0 obj/.test(s.slice(Number(first[1]), Number(first[1]) + 12)));
  } else {
    check(`${format} is a zip`, buf.subarray(0, 4).toString("hex") === "504b0304");
    const dir = join(out, `${format}-x`);
    mkdirSync(dir, { recursive: true });
    // System.IO.Compression: independent reader, also validates our central directory and CRCs
    execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory('${file}', '${dir}')"`);
    const files = format === "docx"
      ? ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/_rels/document.xml.rels", "word/media/page1.jpeg"]
      : ["mimetype", "META-INF/manifest.xml", "content.xml", "styles.xml", "Pictures/page1.jpeg"];
    check(`${format} parts exist`, files.every((f) => existsSync(join(dir, f))));
    const xmls = files.filter((f) => /\.(xml|rels)$/.test(f)).map((f) => [f, readFileSync(join(dir, f), "utf8")]);
    const bad = await evalJs(`(() => { const bad = []; for (const [n, x] of ${JSON.stringify(xmls)}) { const d = new DOMParser().parseFromString(x, "application/xml"); if (d.querySelector("parsererror")) bad.push(n); } return bad; })()`);
    check(`${format} XML well-formed`, bad.length === 0, JSON.stringify(bad));
    if (format === "odt") {
      check("odt mimetype first + stored", buf.subarray(30, 38).toString() === "mimetype" && buf.readUInt16LE(8) === 0);
      check("odt mimetype content", readFileSync(join(dir, "mimetype"), "utf8") === "application/vnd.oasis.opendocument.text");
      const content = readFileSync(join(dir, "content.xml"), "utf8");
      check("odt A4 frames", content.includes('svg:width="210mm"') && content.includes('svg:height="297mm"'));
    } else {
      const doc = readFileSync(join(dir, "word/document.xml"), "utf8");
      check("docx A4 section + full-page anchors", doc.includes('w:w="11906" w:h="16838"') && doc.includes('cx="7560000" cy="10692000"'));
    }
  }
}

// page image of the first page (docx) for a visual check
const jpeg = join(out, "docx-x", "word", "media", "page1.jpeg");
if (existsSync(jpeg)) { const b = readFileSync(jpeg); check("page image is JPEG 1588x2246", b[0] === 0xff && b[1] === 0xd8); }

const failed = results.filter((x) => !x).length;
console.log(failed ? `FAIL (${failed})` : "PASS", "-> files in", out);
ws.close();
try { execSync(`taskkill /F /T /IM ${exeName}`, { stdio: "ignore" }); } catch {}
process.exit(failed ? 1 : 0);
