import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { baseResponses, diskDoc, gotoApp, installTauri, menu } from "./support";

const gfm = readFileSync(join(process.cwd(), "tests/fixtures/markdown/gfm-lf.md"), "utf8");
const dot = (page: Page) => page.getByRole("img", { name: "Cambios sin guardar" });
const editor = (page: Page) => page.locator(".editor-slot:not([hidden]) .ProseMirror");

async function open(page: Page, text = gfm) {
  await installTauri(page, baseResponses({ pick_open_files: ["C:\\a.md"], read_document: diskDoc("C:\\a.md", text) }));
  await gotoApp(page);
  await menu(page, "file.open");
  await editor(page).waitFor();
}

test("the red dot does not appear when only the cursor is placed or moved", async ({ page }) => {
  await open(page); // contains a table, a code block and a task list: the editor re-serializes them
  await editor(page).click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("End");
  await page.waitForTimeout(500);
  await expect(dot(page)).toHaveCount(0);
});

test("the red dot appears as soon as the content is edited", async ({ page }) => {
  await open(page, "# Titulo\n\nTexto\n");
  await editor(page).click();
  await page.keyboard.type("x");
  await expect(dot(page)).toBeVisible();
});

test("editing a document that the editor re-serializes still shows the dot", async ({ page }) => {
  await open(page);
  await editor(page).click();
  await page.keyboard.type("x");
  await expect(dot(page)).toBeVisible();
});

test("toggling a task checkbox counts as an edit", async ({ page }) => {
  await open(page);
  await editor(page).locator("input[type=checkbox]").last().click();
  await expect(dot(page)).toBeVisible();
});

test("a toolbar action (bold) counts as an edit", async ({ page }) => {
  await open(page, "Texto de prueba\n");
  await editor(page).click();
  await page.keyboard.press("Control+a");
  await page.getByRole("button", { name: /negrita/i }).first().click();
  await expect(dot(page)).toBeVisible();
});

test("tabs: 25 px bar, rounded top corners, no close button, middle click closes", async ({ page }) => {
  await open(page, "x\n");
  const bar = await page.locator(".app-tabs").boundingBox();
  expect(bar?.height).toBe(25);
  const tab = page.getByRole("tab", { name: /a\.md/ });
  const radius = await tab.evaluate((el) => {
    const c = getComputedStyle(el);
    return [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomLeftRadius, c.borderBottomRightRadius];
  });
  expect(radius[0]).not.toBe("0px");
  expect(radius[1]).not.toBe("0px");
  expect(radius[2]).toBe("0px");
  expect(radius[3]).toBe("0px");
  await expect(page.getByRole("button", { name: /^Cerrar/ })).toHaveCount(0);
  await tab.click({ button: "middle" });
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("no '+' button: middle click on empty bar space opens a new temporary tab", async ({ page }) => {
  await installTauri(page, baseResponses());
  await gotoApp(page);
  await expect(page.getByRole("button", { name: /Nuevo|^\+$/ })).toHaveCount(0);
  const bar = (await page.locator(".app-tabs").boundingBox())!;
  await page.mouse.click(bar.x + bar.width - 40, bar.y + bar.height / 2, { button: "middle" });
  await expect(page.getByRole("tab", { name: /Sin título 1/ })).toBeVisible();
  await page.mouse.click(bar.x + bar.width - 40, bar.y + bar.height / 2, { button: "middle" });
  await expect(page.getByRole("tab")).toHaveCount(2);
  // the new document is unsaved/temporary: it has no path and is not marked modified until edited
  await expect(page.getByRole("img", { name: "Cambios sin guardar" })).toHaveCount(0);
});
