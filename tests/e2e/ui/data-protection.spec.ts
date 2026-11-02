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
  await page.getByRole("button", { name: "Cerrar a.md" }).click();
  const dialog = page.getByRole("dialog", { name: "Cambios sin guardar" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("tab", { name: /a\.md/ })).toBeVisible(); // still open

  await page.getByRole("button", { name: "Cerrar a.md" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Descartar" }).click();
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("Escape on the close dialog cancels (safe default)", async ({ page }) => {
  await openDirty(page);
  await page.getByRole("button", { name: "Cerrar a.md" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /a\.md/ })).toBeVisible();
});

test("external change with local edits offers the 3 options; reload here is undoable with Ctrl+Z", async ({ page }) => {
  await openDirty(page);
  await setResponse(page, "read_document", diskDoc("C:\\docs\\a.md", "version del disco\n", "h9"));
  await emit(page, "fs://external-change", {
    path: "C:\\docs\\a.md", kind: "modified",
    fingerprint: { mtimeMs: 9, size: 9, hash: "h9" },
  });
  const dialog = page.getByRole("dialog", { name: /Conflicto/ });
  await expect(dialog).toBeVisible();
  for (const label of ["Pisar archivo", "Abrir versión del disco en otra pestaña", "Recargar aquí"]) {
    await expect(dialog.getByRole("button", { name: label })).toBeVisible();
  }

  await dialog.getByRole("button", { name: "Recargar aquí" }).click();
  await expect(editor(page)).toContainText("version del disco");

  await page.keyboard.press("Control+z"); // restores the pre-reload content
  await expect(editor(page)).toContainText("original MIO");
});

test("external change: the disk version can open in a new untitled tab, keeping the original", async ({ page }) => {
  await openDirty(page);
  await setResponse(page, "read_document", diskDoc("C:\\docs\\a.md", "version del disco\n", "h9"));
  await emit(page, "fs://external-change", {
    path: "C:\\docs\\a.md", kind: "modified", fingerprint: { mtimeMs: 9, size: 9, hash: "h9" },
  });
  await page.getByRole("dialog").getByRole("button", { name: "Abrir versión del disco en otra pestaña" }).click();
  await expect(page.getByRole("tab", { name: /a\.md \(disco\)/ })).toBeVisible();
  await expect(editor(page)).toContainText("version del disco");
  await page.getByRole("tab", { name: /^a\.md/ }).first().click();
  await expect(editor(page)).toContainText("original MIO"); // untouched
});
