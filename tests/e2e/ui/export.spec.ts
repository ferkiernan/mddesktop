import { expect, test, type Page } from "@playwright/test";
import { baseResponses, calls, diskDoc, gotoApp, installTauri, menu, PREFS } from "./support";

const DOC = `# Informe

Texto con **negrita** y un [enlace](https://example.com).

- [x] hecho
- [ ] pendiente

| a | b |
|---|---|
| 1 | 2 |

\`\`\`ts
const x = 1;
\`\`\`

\`\`\`mermaid
graph TD
  A[Inicio] --> B[Fin]
\`\`\`
`;

async function setup(page: Page, format: string, style = "default") {
  await installTauri(page, baseResponses({
    settings_load: { ...PREFS, editorStyle: style },
    pick_open_files: ["C:\\docs\\informe.md"],
    read_document: diskDoc("C:\\docs\\informe.md", DOC),
    pick_export_path: `C:\\out\\informe.${format}`,
    write_export: { bytes: 1 },
  }));
  await gotoApp(page);
  await menu(page, "file.open");
  await page.locator(".editor-slot:not([hidden]) .ProseMirror").waitFor();
}

/** Spec 005: File > Export opens the export panel first; the preview is built and "Exportar…" continues. */
async function exportVia(page: Page, id: string) {
  await menu(page, id);
  const panel = page.getByRole("dialog", { name: /^Exportar:/ });
  await expect(panel).toBeVisible();
  const go = panel.getByRole("button", { name: "Exportar…" });
  await expect(go).toBeEnabled({ timeout: 30_000 });
  await go.click();
}

const written = async (page: Page) => {
  await expect.poll(async () => (await calls(page, "write_export")).length, { timeout: 30_000 }).toBe(1);
  const [req] = (await calls(page, "write_export")) as { path: string; dataBase64: string }[];
  return { path: req.path, bytes: Buffer.from(req.dataBase64, "base64") };
};

test("Archivo > Exportar > HTML writes a self-contained A4 page with the active style", async ({ page }) => {
  await setup(page, "html", "winamp");
  await exportVia(page, "export.html");
  const { path, bytes } = await written(page);
  const html = bytes.toString("utf8");
  expect(path).toBe("C:\\out\\informe.html");
  expect(html).toContain("width:210mm");
  expect(html).toContain("Informe");
  expect(html).toContain("data:image/svg+xml;base64"); // Mermaid embedded as an image
  expect(html).toMatch(/checked="checked"/);
  expect(html).not.toMatch(/(?:src|href)="(?:https?:\/\/(?!example\.com)|file:|asset:)/);
  // the Winamp style's background colour reaches the page
  expect(html).toContain("rgb(35, 35, 35)");
});

test("PDF has A4 pages that contain the rendered document", async ({ page }) => {
  await setup(page, "pdf");
  await exportVia(page, "export.pdf");
  const { bytes } = await written(page);
  const s = bytes.toString("latin1");
  expect(s.startsWith("%PDF-1.4")).toBe(true);
  expect(s).toContain("/MediaBox [0 0 595.28 841.89]");
  expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(s).toContain("/DCTDecode");
});

test("Word is a native document: real headings, table and text (spec 006)", async ({ page }) => {
  await setup(page, "docx");
  await exportVia(page, "export.docx");
  const docx = (await written(page)).bytes;
  expect(docx.subarray(0, 4).toString("hex")).toBe("504b0304");
  expect(docx.toString("latin1")).toContain("word/document.xml");
  expect(docx.toString("latin1")).toContain('w:w="11906" w:h="16838"');
  const xml = docx.toString("utf8");
  expect(xml).toContain('<w:pStyle w:val="Heading1"/>');
  expect(xml).toContain("<w:tblHeader/>");
  expect(xml).toContain(">Informe<");
  expect(xml).not.toContain("word/media/page1.jpeg"); // no page images any more
});

test("cancelling the save dialog writes nothing and shows no error", async ({ page }) => {
  await setup(page, "pdf");
  await page.evaluate(() => {
    (window as unknown as { __responses: Record<string, unknown> }).__responses.pick_export_path = null;
  });
  await exportVia(page, "export.pdf");
  await page.waitForTimeout(800);
  expect(await calls(page, "write_export")).toHaveLength(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a failing write shows the reason", async ({ page }) => {
  await setup(page, "pdf");
  await page.evaluate(() => {
    (window as unknown as { __responses: Record<string, unknown> }).__responses.write_export = {
      __reject: { code: "PERMISSION_DENIED", message: "acceso denegado" },
    };
  });
  await exportVia(page, "export.pdf");
  const dialog = page.getByRole("dialog", { name: "No se pudo exportar" });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toContainText("acceso denegado");
});

test("export panel: 'Como en pantalla' is preselected, another style does not touch the editor, Cancelar writes nothing (spec 005)", async ({ page }) => {
  await setup(page, "html", "dark");
  await menu(page, "export.html");
  const panel = page.getByRole("dialog", { name: /^Exportar:/ });
  await expect(panel.getByRole("radio", { name: "Como en pantalla" })).toBeChecked();
  await panel.getByRole("radio", { name: "Default" }).check();
  await expect(panel.getByRole("button", { name: "Exportar…" })).toBeEnabled({ timeout: 30_000 });
  expect(await page.evaluate(() => document.documentElement.dataset.editorStyle)).toBe("dark");
  await panel.getByRole("button", { name: "Cancelar" }).click();
  await expect(panel).toHaveCount(0);
  expect(await calls(page, "pick_export_path")).toHaveLength(0);
  expect(await calls(page, "write_export")).toHaveLength(0);
});

test("exporting with another style uses it and remembers it (spec 005)", async ({ page }) => {
  await setup(page, "html", "dark");
  await menu(page, "export.html");
  const panel = page.getByRole("dialog", { name: /^Exportar:/ });
  await panel.getByRole("radio", { name: "Default" }).check();
  const go = panel.getByRole("button", { name: "Exportar…" });
  await expect(go).toBeEnabled({ timeout: 30_000 });
  await go.click();
  const html = (await written(page)).bytes.toString("utf8");
  expect(html).toContain("rgb(255, 255, 255)"); // Default background, not Dark's
  expect(html).not.toContain("rgb(11, 18, 32)");
  expect((await calls(page, "settings_save")).some((c) => (c as { patch?: { exportStyle?: string } }).patch?.exportStyle === "default")).toBe(true);
});
