// Spike S2: what the editor does to real Markdown. Opening, switching views and saving without
// editing must be byte-identical; editing re-serializes canonically (documented, not asserted).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { baseResponses, diskDoc, FP, installTauri, menu, calls } from "./support";

const dir = join(process.cwd(), "tests", "fixtures", "markdown");
const files = ["gfm-lf.md", "non-canonical.md", "mermaid.md"];

for (const name of files) {
  test(`unedited ${name}: open + toggle views + save leaves content untouched`, async ({ page }) => {
    const text = readFileSync(join(dir, name), "utf8");
    await installTauri(page, baseResponses({
      pick_open_files: [`C:\\f\\${name}`],
      read_document: diskDoc(`C:\\f\\${name}`, text),
      write_document: { fingerprint: FP },
    }));
    await page.goto("/");
    await menu(page, "file.open");
    await expect(page.locator(".editor-slot:not([hidden]) .ProseMirror")).toBeVisible();
    // switch to the Markdown view and back without editing
    const toggle = page.getByRole("button", { name: /markdown|código fuente|<\/>/i }).first();
    if (await toggle.count()) {
      await toggle.click();
      await toggle.click();
    }
    // force a save of the untouched document through the write path
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+s");
    await page.waitForTimeout(300);
    const writes = (await calls(page, "write_document")) as { request: { content: string } }[];
    // an unmodified document may skip the write or send the original content; never altered content
    for (const w of writes) expect(w.request.content).toBe(text);
  });
}

test("edited non-canonical Markdown is re-serialized (documented transformation)", async ({ page }) => {
  const text = readFileSync(join(dir, "non-canonical.md"), "utf8");
  await installTauri(page, baseResponses({
    pick_open_files: ["C:\\f\\nc.md"],
    read_document: diskDoc("C:\\f\\nc.md", text),
    write_document: { fingerprint: FP },
  }));
  await page.goto("/");
  await menu(page, "file.open");
  const ed = page.locator(".editor-slot:not([hidden]) .ProseMirror");
  await ed.click();
  await page.keyboard.type("!");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(300);
  const [w] = (await calls(page, "write_document")) as { request: { content: string } }[];
  console.log("S2 original  :", JSON.stringify(text));
  console.log("S2 serialized:", JSON.stringify(w.request.content));
  // semantic content survives
  expect(w.request.content).toContain("item no canonico");
  expect(w.request.content).toContain("otro");
  expect(w.request.content).toMatch(/fuerte/);
});
