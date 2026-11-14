import { expect, test, type Page } from "@playwright/test";
import { baseResponses, diskDoc, emit, installTauri, menu, setResponse , gotoApp } from "./support";

const editor = (page: Page) => page.locator(".editor-slot:not([hidden]) .ProseMirror");

async function openDirty(page: Page) {
  await installTauri(page, baseResponses({
    pick_open_files: ["C:\\docs\\a.md"],
    read_document: diskDoc("C:\\docs\\a.md", "original\n"),
  }));
  await gotoApp(page);
  await menu(page, "file.open");
  await editor(page).click();
  await page.keyboard.type(" MIO");
  await expect(page.getByRole("img", { name: "Cambios sin guardar" })).toBeVisible();
}

test("closing a modified tab asks Guardar / Descartar / Cancelar", async ({ page }) => {
  await openDirty(page);
  await page.getByRole("tab", { name: /a\.md/ }).click({ button: "middle" });
  const dialog = page.getByRole("dialog", { name: "Cambios sin guardar" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("tab", { name: /a\.md/ })).toBeVisible(); // still open

  await page.getByRole("tab", { name: /a\.md/ }).click({ button: "middle" });
  await page.getByRole("dialog").getByRole("button", { name: "Descartar" }).click();
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("Escape on the close dialog cancels (safe default)", async ({ page }) => {
  await openDirty(page);
  await page.getByRole("tab", { name: /a\.md/ }).click({ button: "middle" });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /a\.md/ })).toBeVisible();
});

test("external change offers Ignorar cambios / Abrir de nuevo / Comparar; Abrir de nuevo is undoable with Ctrl+Z (spec 008)", async ({ page }) => {
  await openDirty(page);
  await setResponse(page, "read_document", diskDoc("C:\\docs\\a.md", "version del disco\n", "h9"));
  await emit(page, "fs://external-change", { path: "C:\\docs\\a.md", kind: "modified", fingerprint: { mtimeMs: 9, size: 9, hash: "h9" } });
  const dialog = page.getByRole("dialog", { name: /modificado fuera/ });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("cambios sin guardar");
  for (const label of ["Ignorar cambios", "Abrir de nuevo", "Comparar"]) await expect(dialog.getByRole("button", { name: label })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Comparar" })).toBeFocused(); // primary option

  await dialog.getByRole("button", { name: "Abrir de nuevo" }).click();
  await expect(editor(page)).toContainText("version del disco");
  await page.keyboard.press("Control+z"); // restores the previous content
  await expect(editor(page)).toContainText("original MIO");
});

test("Comparar shows both versions; accepting the disk version leaves the document clean (spec 008)", async ({ page }) => {
  await openDirty(page);
  await setResponse(page, "read_document", diskDoc("C:\\docs\\a.md", "version del disco\n", "h9"));
  await emit(page, "fs://external-change", { path: "C:\\docs\\a.md", kind: "modified", fingerprint: { mtimeMs: 9, size: 9, hash: "h9" } });
  await page.getByRole("dialog").getByRole("button", { name: "Comparar" }).click();
  await expect(page.getByRole("img", { name: "Comparación pendiente" })).toBeVisible();
  const slot = page.locator(".editor-slot:not([hidden])");
  await expect(slot).toContainText("original MIO"); // app version (original pane)
  await expect(slot).toContainText("version del disco"); // disk version (new pane)

  // saving while comparing asks to decide first
  await page.keyboard.press("Control+s");
  await expect(page.getByRole("dialog", { name: "Comparación pendiente" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Aceptar" }).click();

  await slot.getByRole("button", { name: /Aceptar cambio/ }).click();
  await expect(page.getByRole("img", { name: "Comparación pendiente" })).toHaveCount(0);
  await expect(editor(page)).toContainText("version del disco");
  await expect(page.getByRole("img", { name: "Cambios sin guardar" })).toHaveCount(0);
});

test("Ignorar cambios keeps the local version and is not asked again for the same disk version (spec 008)", async ({ page }) => {
  await openDirty(page);
  await setResponse(page, "read_document", diskDoc("C:\\docs\\a.md", "version del disco\n", "h9"));
  const change = () => emit(page, "fs://external-change", { path: "C:\\docs\\a.md", kind: "modified", fingerprint: { mtimeMs: 9, size: 9, hash: "h9" } });
  await change();
  await page.getByRole("dialog").getByRole("button", { name: "Ignorar cambios" }).click();
  await expect(editor(page)).toContainText("original MIO");
  await change();
  await page.waitForTimeout(300);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});