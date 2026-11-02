import { expect, test } from "@playwright/test";
import { baseResponses, calls, diskDoc, FP, installTauri, menu } from "./support";

const editor = (page: import("@playwright/test").Page) => page.locator(".editor-slot:not([hidden]) .ProseMirror");

test("open -> edit -> save writes the edited Markdown and clears the dirty marker", async ({ page }) => {
  await installTauri(page, baseResponses({
    pick_open_files: ["C:\\docs\\a.md"],
    read_document: diskDoc("C:\\docs\\a.md", "# Titulo\n\nTexto original\n"),
    write_document: { fingerprint: { ...FP, hash: "h2" } },
  }));
  await page.goto("/");

  await menu(page, "file.open");
  await expect(page.getByRole("tab", { name: /a\.md/ })).toBeVisible();
  await expect(editor(page)).toContainText("Texto original");
  await expect(page.getByRole("tab", { name: /a\.md/ }).getByRole("img", { name: "Cambios sin guardar" })).toHaveCount(0);

  await editor(page).click();
  await page.keyboard.type(" EDITADO");
  await expect(page.getByRole("img", { name: "Cambios sin guardar" })).toBeVisible();

  await page.keyboard.press("Control+s");
  await expect(page.getByRole("status").filter({ hasText: "Guardado" }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Cambios sin guardar" })).toHaveCount(0);

  const [req] = (await calls(page, "write_document")) as { request: { path: string; content: string; expectedFingerprint: unknown } }[];
  expect(req.request.path).toBe("C:\\docs\\a.md");
  expect(req.request.content).toContain("EDITADO");
  expect(req.request.expectedFingerprint).toEqual(FP);
});

test("Save As on a new document names the tab after the chosen file", async ({ page }) => {
  await installTauri(page, baseResponses({
    pick_save_path: "C:\\docs\\nota.md",
    write_document: { fingerprint: FP },
  }));
  await page.goto("/");
  await page.keyboard.press("Control+n");
  await expect(page.getByRole("tab", { name: /Sin título 1/ })).toBeVisible();
  await editor(page).click();
  await page.keyboard.type("hola");
  await page.keyboard.press("Control+s"); // no path yet -> Save As
  await expect(page.getByRole("tab", { name: /nota\.md/ })).toBeVisible();
  const [req] = (await calls(page, "write_document")) as { request: { overwriteExternal: boolean } }[];
  expect(req.request.overwriteExternal).toBe(true); // the native dialog already confirmed overwrite
});

test("opening the same file twice keeps a single tab", async ({ page }) => {
  await installTauri(page, baseResponses({
    pick_open_files: ["C:\\docs\\a.md"],
    read_document: diskDoc("C:\\docs\\a.md", "x\n"),
  }));
  await page.goto("/");
  await menu(page, "file.open");
  await menu(page, "file.open");
  await expect(page.getByRole("tab")).toHaveCount(1);
  expect(await calls(page, "read_document")).toHaveLength(1);
});
