import { expect, test } from "@playwright/test";
import { baseResponses, installTauri } from "./support";

const names = (page: import("@playwright/test").Page) => page.locator("[role=tab] .tab-name").allTextContents();

test.beforeEach(async ({ page }) => {
  await installTauri(page, baseResponses());
  await page.goto("/");
});

test("new tabs, switching, and at most 3 editors stay mounted", async ({ page }) => {
  for (let i = 0; i < 4; i++) await page.keyboard.press("Control+n");
  await expect(page.getByRole("tab")).toHaveCount(4);
  await expect(page.getByRole("tab", { selected: true })).toContainText("Sin título 4");
  await expect(page.locator(".editor-slot .ProseMirror")).toHaveCount(3); // pool cap
  await page.getByRole("tab", { name: /Sin título 1/ }).click(); // evicted tab remounts on demand
  await expect(page.locator(".editor-slot:not([hidden]) .ProseMirror")).toHaveCount(1);
  await expect(page.getByRole("tab", { selected: true })).toContainText("Sin título 1");
});

test("typing in one tab marks only that tab as modified", async ({ page }) => {
  await page.keyboard.press("Control+n");
  await page.keyboard.press("Control+n");
  await page.locator(".editor-slot:not([hidden]) .ProseMirror").click();
  await page.keyboard.type("cambio");
  await expect(page.getByRole("img", { name: "Cambios sin guardar" })).toHaveCount(1);
  await expect(page.getByRole("tab", { name: /Sin título 2/ }).getByRole("img")).toBeVisible();
});

test("tabs can be reordered by dragging with the pointer", async ({ page }) => {
  for (let i = 0; i < 3; i++) await page.keyboard.press("Control+n");
  const first = page.getByRole("tab", { name: /Sin título 1/ });
  const last = page.getByRole("tab", { name: /Sin título 3/ });
  const a = (await first.boundingBox())!;
  const c = (await last.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width - 2, c.y + c.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(await names(page)).toEqual(["Sin título 2", "Sin título 3", "Sin título 1"]);
});

test("close others / close all from the context menu (clean documents)", async ({ page }) => {
  for (let i = 0; i < 3; i++) await page.keyboard.press("Control+n");
  await page.getByRole("tab", { name: /Sin título 2/ }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Cerrar otras" }).click();
  expect(await names(page)).toEqual(["Sin título 2"]);
  await page.getByRole("tab").first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "Cerrar todas" }).click();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.getByText("Ningún documento abierto.")).toBeVisible();
});
