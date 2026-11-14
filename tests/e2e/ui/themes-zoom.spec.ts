// Spec 004 (Temas panel, custom styles) and spec 007 (content zoom, bar size) in the UI.
import { expect, test, type Page } from "@playwright/test";
import { baseResponses, calls, diskDoc, gotoApp, installTauri, menu, PREFS } from "./support";

const DOC = "# Zoom\n\nTexto de prueba.\n";
const editor = (page: Page) => page.locator(".editor-slot:not([hidden]) .ProseMirror");

async function open(page: Page, prefs: Record<string, unknown> = {}) {
  await installTauri(
    page,
    baseResponses({
      settings_load: { ...PREFS, ...prefs },
      // the real command echoes the merged preferences; rejecting keeps the optimistic values in this stub
      settings_save: { __reject: { code: "IO", message: "offline" } },
      pick_open_files: ["C:\\docs\\z.md"],
      read_document: diskDoc("C:\\docs\\z.md", DOC),
      styles_load: { styles: [], recovered: false },
      styles_save: { __echoArg: "styles" },
      set_custom_styles_menu: null,
      set_style_menu: null,
      set_view_menu: null,
    }),
  );
  await gotoApp(page);
  await menu(page, "file.open");
  await editor(page).waitFor();
}

test("Temas: duplicate a built-in style, change its background with live preview, save and apply (spec 004)", async ({ page }) => {
  await open(page);
  await menu(page, "settings.themes");
  const panel = page.getByRole("dialog", { name: "Temas" });
  await expect(panel).toBeVisible();
  await panel.getByRole("option", { name: /Winamp/ }).getByRole("button").click();
  await expect(panel).toContainText("es un estilo incluido");
  await panel.getByRole("button", { name: "Duplicar" }).click();
  await expect(panel.getByRole("textbox", { name: "Nombre" })).toHaveValue("Copia de Winamp");

  const bg = panel.getByRole("textbox", { name: "Fondo: valor" });
  await bg.fill("#123456");
  await bg.press("Enter");
  await expect
    .poll(() => panel.locator(".themes-preview-editor").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--mdw-content-bg")))
    .toBe("#123456");
  // the real editor is untouched until the style is applied
  expect(await page.evaluate(() => document.documentElement.dataset.editorStyle)).toBe("default");

  await panel.getByRole("button", { name: "Guardar" }).click();
  await expect.poll(async () => (await calls(page, "styles_save")).length).toBe(1);
  const saved = ((await calls(page, "styles_save"))[0] as { styles: { id: string; label: string }[] }).styles;
  expect(saved[0].label).toBe("Copia de Winamp");
  const menuCall = (await calls(page, "set_custom_styles_menu")).at(-1) as { items: [string, string][] };
  expect(menuCall.items).toEqual([[saved[0].id, "Copia de Winamp"]]);

  await panel.getByRole("button", { name: "Aplicar" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.editorStyle)).toBe(saved[0].id);
  const contentBg = await page.locator(".editor-slot:not([hidden]) .mdd-editor").evaluate((el) => getComputedStyle(el).getPropertyValue("--mdw-content-bg").trim());
  expect(contentBg).toBe("#123456");
});

test("Temas: closing with unsaved changes asks Guardar / Descartar / Cancelar (spec 004 US4)", async ({ page }) => {
  await open(page);
  await menu(page, "settings.themes");
  const panel = page.getByRole("dialog", { name: "Temas" });
  await panel.getByRole("button", { name: "Duplicar" }).click();
  await panel.getByRole("button", { name: "Cerrar" }).click();
  const ask = page.getByRole("dialog", { name: "Cambios sin guardar" });
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: "Descartar" }).click();
  await expect(panel).toHaveCount(0);
  expect(await calls(page, "styles_save")).toHaveLength(0);
});

test("View zoom changes only the content in 5 % steps; the tab bar keeps its size (spec 007)", async ({ page }) => {
  await open(page);
  const tabs = page.locator(".app-tabs");
  const barBefore = (await tabs.boundingBox())!.height;
  const fontBefore = await editor(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  await menu(page, "view.zoomIn");
  await menu(page, "view.zoomIn");
  await expect(page.locator(".status-zoom")).toContainText("110 %");
  const fontAfter = await editor(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontAfter).toBeGreaterThan(fontBefore);
  expect((await tabs.boundingBox())!.height).toBe(barBefore);
  await menu(page, "view.zoomReset");
  await expect(page.locator(".status-zoom")).toHaveCount(0);
});

test("Ctrl + wheel over the content zooms it; over the tab bar it does nothing (spec 007)", async ({ page }) => {
  await open(page);
  const box = (await editor(page).boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, -100);
  await expect(page.locator(".status-zoom")).toContainText("110 %");
  const bar = (await page.locator(".app-tabs").boundingBox())!;
  await page.mouse.move(bar.x + 200, bar.y + 5);
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await page.waitForTimeout(200);
  await expect(page.locator(".status-zoom")).toContainText("110 %");
});

test("the bar size from Temas scales the tab bar, not the content (spec 007 US3)", async ({ page }) => {
  await open(page, { barScale: 1.5 });
  const h = (await page.locator(".app-tabs").boundingBox())!.height;
  expect(Math.round(h)).toBe(Math.round(25 * 1.5));
  const toolbarScale = await page.locator(".editor-slot:not([hidden]) .mdd-editor").evaluate((el) => getComputedStyle(el).getPropertyValue("--mdw-toolbar-scale").trim());
  expect(toolbarScale).toBe("1.5");
  const zoom = await page.locator(".editor-slot:not([hidden]) .mdd-editor").evaluate((el) => getComputedStyle(el).getPropertyValue("--mdw-content-zoom").trim());
  expect(zoom).toBe("1");
});
