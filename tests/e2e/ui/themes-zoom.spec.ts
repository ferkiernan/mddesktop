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

test("built-in styles are listed in bold without the word 'incluido'; custom ones in normal weight (spec 009)", async ({ page }) => {
  await open(page);
  await menu(page, "settings.themes");
  const panel = page.getByRole("dialog", { name: "Temas" });
  const winamp = panel.getByRole("option", { name: /Winamp/ });
  await expect(winamp).toContainText("Winamp");
  expect(await winamp.locator(".theme-builtin").evaluate((el) => getComputedStyle(el).fontWeight)).toBe("700");
  // visually there is no "incluido" text, but assistive technology still gets it
  const visible = await winamp.evaluate((el) => { const c = el.cloneNode(true) as HTMLElement; c.querySelectorAll(".sr-only").forEach((x) => x.remove()); return c.textContent ?? ""; });
  expect(visible).not.toMatch(/incluido/);
  expect(await winamp.locator(".sr-only").evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  await expect(winamp).toHaveAccessibleName(/estilo incluido/);
  await panel.getByRole("button", { name: "Duplicar" }).click();
  const copy = panel.getByRole("option", { name: /Copia de/ });
  expect(await copy.locator("span").first().evaluate((el) => getComputedStyle(el).fontWeight)).toBe("400");
});

test("primary buttons use the style accent, not a disabled-looking grey (bug panel-buttons-disabled)", async ({ page }) => {
  await open(page);
  await menu(page, "settings.themes");
  const panel = page.getByRole("dialog", { name: "Temas" });
  await panel.getByRole("option", { name: /Winamp/ }).getByRole("button").click();
  const apply = panel.getByRole("button", { name: "Aplicar" });
  await expect(apply).toBeEnabled();
  const bg = await apply.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(61, 111, 216)"); // Default style accent #3d6fd8 (was #c8c8c8)
  expect(await apply.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("Temas: the tab bar background can be chosen; the status bar keeps its colour (spec 010)", async ({ page }) => {
  await open(page);
  const statusBefore = await page.locator(".app-status").evaluate((el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor);
  await menu(page, "settings.themes");
  const panel = page.getByRole("dialog", { name: "Temas" });
  await panel.getByRole("button", { name: "Duplicar" }).click();
  const field = panel.getByRole("textbox", { name: "Fondo de la barra de pestañas: valor" });
  await field.fill("#8b0000");
  await field.press("Enter");
  await expect.poll(() => panel.locator(".themes-preview-tabs").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(139, 0, 0)");
  await panel.getByRole("button", { name: "Guardar" }).click();
  await panel.getByRole("button", { name: "Aplicar" }).click();
  await expect.poll(() => page.locator(".app-tabs").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(139, 0, 0)");
  // the status bar keeps the toolbar look (the duplicate may re-derive it slightly), never the tab colour
  const statusAfter = await page.locator(".app-status").evaluate((el) => getComputedStyle(el).backgroundImage + getComputedStyle(el).backgroundColor);
  expect(statusAfter).toMatch(/^linear-gradient/);
  expect(statusAfter).not.toContain("139, 0, 0");
  expect(statusBefore).toMatch(/^linear-gradient/);
});

test("Temas: compact colour fields, icon reset on the same row, tab bar field always has a picker (spec 012)", async ({ page }) => {
  await open(page);
  await menu(page, "settings.themes");
  const panel = page.getByRole("dialog", { name: "Temas" });
  await panel.getByRole("button", { name: "Duplicar" }).click();
  // US3: the bar in a format the picker cannot take directly still gives the tab field a picker
  const bar = panel.getByRole("textbox", { name: "Barra de herramientas: valor" });
  await bar.fill("hsl(0, 0%, 80%)");
  await bar.press("Enter");
  const tabsPicker = panel.getByLabel("Fondo de la barra de pestañas: selector de color");
  await expect(tabsPicker).toBeVisible();
  expect(await tabsPicker.inputValue()).toBe("#cccccc");
  await expect(panel.getByRole("textbox", { name: "Fondo de la barra de pestañas: valor" })).toHaveAttribute("placeholder", "automático");
  // US1/US2: advanced mode, change "Fondo suave"
  await panel.getByRole("tab", { name: "Avanzado" }).click();
  const value = panel.getByRole("textbox", { name: "Fondo suave: valor" });
  const before = await value.inputValue();
  await value.fill("#ff0000");
  await value.press("Enter");
  const reset = panel.getByRole("button", { name: "Restablecer Fondo suave" });
  await expect(reset).toBeVisible();
  await expect(reset).toHaveAttribute("title", "Restablecer");
  await expect(reset).toHaveText("");
  const [r, v] = [(await reset.boundingBox())!, (await value.boundingBox())!];
  expect(Math.abs(r.y + r.height / 2 - (v.y + v.height / 2))).toBeLessThan(4); // same row
  expect(r.x).toBeGreaterThan(v.x + v.width);
  expect(v.width).toBeGreaterThanOrEqual(70);
  expect(v.width).toBeLessThanOrEqual(95); // about half of the former 150 px
  await reset.press("Enter");
  await expect(value).toHaveValue(before);
  await expect(panel.getByRole("button", { name: "Restablecer Fondo suave" })).toHaveCount(0);
});
