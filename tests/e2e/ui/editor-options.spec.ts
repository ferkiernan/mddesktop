// mdwysiwyg 0.4.0+ behaviours inside the app (spec 003: US3 popover theming, US4 table menu trigger).
import { expect, test, type Page } from "@playwright/test";
import { baseResponses, calls, diskDoc, gotoApp, installTauri, menu, PREFS } from "./support";

const TABLE = "# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n";
const dot = (page: Page) => page.getByRole("img", { name: "Cambios sin guardar" });
const editor = (page: Page) => page.locator(".editor-slot:not([hidden]) .ProseMirror");

async function open(page: Page, text: string, prefs: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  await installTauri(
    page,
    baseResponses({
      settings_load: { ...PREFS, ...prefs },
      pick_open_files: ["C:\\a.md"],
      read_document: diskDoc("C:\\a.md", text),
      write_document: { fingerprint: { mtimeMs: 2, size: 3, hash: "h2" } },
      set_style_menu: null,
      set_view_menu: null,
      ...extra,
    }),
  );
  await gotoApp(page);
  await menu(page, "file.open");
  await editor(page).waitFor();
}

async function openTableMenu(page: Page) {
  const cell = editor(page).locator("td").first();
  await cell.click();
  await cell.hover();
  const trigger = page.locator(".editor-slot:not([hidden]) [class*=tableMenuTrigger]").first();
  await trigger.waitFor({ state: "visible" });
  await trigger.click();
  const opened = page.getByRole("menu").last();
  await expect(opened).toBeVisible();
  return opened;
}

test("table menu from the corner triangle: closing without a choice leaves the document unmodified", async ({ page }) => {
  await open(page, TABLE);
  await openTableMenu(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await expect(dot(page)).toHaveCount(0);
});

test("global shortcuts keep working while the table menu is open", async ({ page }) => {
  await open(page, TABLE);
  await editor(page).locator("td").first().click();
  await page.keyboard.type("x"); // a real edit, so Ctrl+S has something to save
  await expect(dot(page)).toBeVisible();
  await openTableMenu(page);
  await page.keyboard.press("Control+s");
  await expect.poll(async () => (await calls(page, "write_document")).length).toBeGreaterThan(0);
});

test("the editor's floating menus follow the active style (popover background)", async ({ page }) => {
  await open(page, TABLE, { editorStyle: "dark" });
  const opened = await openTableMenu(page);
  const bg = await opened.evaluate((el) => {
    // the menu or its nearest painted ancestor inside the portal
    for (let n: Element | null = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
    }
    return "";
  });
  expect(bg).toBe("rgb(30, 41, 59)"); // Dark --mdw-popover-bg #1e293b
});

const toolbar = (page: Page) => page.locator(".editor-slot:not([hidden]) .MarkdownEditor_toolbar");

test("Ver > Mostrar barra de herramientas hides/shows the toolbar 10 times keeping content, caret and the dot", async ({ page }) => {
  // the mocked settings_save rejects so the optimistic value is kept (the real command echoes the patch)
  await open(page, "# Titulo\n\nTexto\n", {}, { settings_save: { __reject: { code: "IO", message: "offline" } } });
  await editor(page).locator("p").click();
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await expect(dot(page)).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await menu(page, "view.toggleToolbar");
    await expect(toolbar(page)).toHaveCount(i % 2 === 0 ? 0 : 1);
  }
  await expect(toolbar(page)).toHaveCount(1);
  await expect(dot(page)).toBeVisible();
  await expect(editor(page)).toContainText("Textox");
  await page.keyboard.type("y"); // caret is still at the end of the paragraph
  await expect(editor(page)).toContainText("Textoxy");
  expect((await calls(page, "settings_save")).at(-1)).toMatchObject({ patch: { editorToolbarVisible: true } });
});

test("version history is on by default: browsing and cancelling leaves the document unmodified", async ({ page }) => {
  await open(page, "# Titulo\n\nTexto\n");
  await editor(page).locator("p").click();
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await page.waitForTimeout(3500); // the editor stores a version after 3 s without changes
  await page.keyboard.press("Control+s");
  await expect(dot(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Historial de versiones" }).click();
  await expect(page.getByRole("navigation", { name: "Historial de versiones" })).toBeVisible();
  await page.getByRole("button", { name: /Cancel/ }).click();
  await page.waitForTimeout(400);
  await expect(dot(page)).toHaveCount(0);
});

test("confirming an older version is an edit: the document becomes modified", async ({ page }) => {
  await open(page, "# Titulo\n\nTexto\n");
  await editor(page).locator("p").click();
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await page.waitForTimeout(3500);
  await page.keyboard.press("Control+s");
  await expect(dot(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Historial de versiones" }).click();
  const list = page.getByRole("navigation", { name: "Historial de versiones" });
  await list.getByRole("button").last().click(); // oldest version (list is newest first)
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(dot(page)).toBeVisible();
  await expect(editor(page)).not.toContainText("Textox");
});

test("with version history turned off there is no history button", async ({ page }) => {
  await open(page, "# T\n", { editorHistory: false });
  await expect(page.getByRole("button", { name: "Historial de versiones" })).toHaveCount(0);
});

// spec 015: Configuración > Desactivar corrector ortográfico
const spellcheck = (page: Page) => editor(page).evaluate((el) => (el as HTMLElement).spellcheck);

test("spell checking is on by default and the Configuración check turns it off and on without touching the content", async ({ page }) => {
  await open(page, "# Titulo\n\nTexto\n", {}, { settings_save: { __reject: { code: "IO", message: "offline" } } });
  expect(await spellcheck(page)).toBe(true);
  await editor(page).locator("p").click();
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await menu(page, "settings.toggleSpellcheck");
  await expect.poll(() => spellcheck(page)).toBe(false);
  expect((await calls(page, "settings_save")).at(-1)).toMatchObject({ patch: { spellcheckDisabled: true } });
  expect((await calls(page, "set_view_menu")).at(-1)).toMatchObject({ spellcheckDisabled: true });
  await menu(page, "settings.toggleSpellcheck");
  await expect.poll(() => spellcheck(page)).toBe(true);
  await expect(editor(page)).toContainText("Textox");
  await expect(dot(page)).toBeVisible();
});

test("a saved 'spell checking off' preference applies when the app starts", async ({ page }) => {
  await open(page, "# T\n", { spellcheckDisabled: true });
  expect(await spellcheck(page)).toBe(false);
});
