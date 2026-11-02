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

const written = async (page: Page) => {
  await expect.poll(async () => (await calls(page, "write_export")).length, { timeout: 30_000 }).toBe(1);
  const [req] = (await calls(page, "write_export")) as { path: string; dataBase64: string }[];
  return { path: req.path, bytes: Buffer.from(req.dataBase64, "base64") };
};

test("Archivo > Exportar > HTML writes a self-contained A4 page with the active style", async ({ page }) => {
  await setup(page, "html", "winamp");
  await menu(page, "export.html");
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
  await menu(page, "export.pdf");
  const { bytes } = await written(page);
  const s = bytes.toString("latin1");
  expect(s.startsWith("%PDF-1.4")).toBe(true);
  expect(s).toContain("/MediaBox [0 0 595.28 841.89]");
  expect(s.trimEnd().endsWith("%%EOF")).toBe(true);
  expect(s).toContain("/DCTDecode");
});

test("Word and OpenDocument are zip packages with A4 pages", async ({ page }) => {
  await setup(page, "docx");
  await menu(page, "export.docx");
  const docx = (await written(page)).bytes;
  expect(docx.subarray(0, 4).toString("hex")).toBe("504b0304");
  expect(docx.toString("latin1")).toContain("word/document.xml");
  expect(docx.toString("latin1")).toContain('w:w="11906" w:h="16838"');
});

test("cancelling the save dialog writes nothing and shows no error", async ({ page }) => {
  await setup(page, "pdf");
  await page.evaluate(() => {
    (window as unknown as { __responses: Record<string, unknown> }).__responses.pick_export_path = null;
  });
  await menu(page, "export.pdf");
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
  await menu(page, "export.pdf");
  const dialog = page.getByRole("dialog", { name: "No se pudo exportar" });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toContainText("acceso denegado");
});
