// Spec 011: Ayuda > Acerca de MD Desktop.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { baseResponses, calls, gotoApp, installTauri, menu } from "./support";

const version = (JSON.parse(readFileSync("package.json", "utf8")) as { version: string }).version;

test("About shows logo, version, build date, author and links; links go through the allowlisted command", async ({ page }) => {
  await installTauri(page, baseResponses({ open_about_link: null }));
  await gotoApp(page);
  await menu(page, "help.about");
  const dialog = page.getByRole("dialog", { name: "MD Desktop" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: "Logo de MD Desktop" })).toBeVisible();
  await expect(dialog).toContainText(`Versión ${version}`);
  await expect(dialog).toContainText(/compilada el \d{2}\/\d{2}\/\d{4}/);
  await expect(dialog).toContainText("Autor: Fernando Manuel Kiernan");
  await expect(dialog).toContainText("Basado en la librería mdwysiwyg (Licencia MIT)");
  await expect(dialog).toContainText("Autor: @ferkiernan");
  await dialog.getByRole("link", { name: "github.com/ferkiernan/mddesktop" }).click();
  await dialog.getByRole("link", { name: "mdwysiwyg" }).click();
  await dialog.getByRole("link", { name: "https://github.com/ferkiernan" }).click();
  const ids = (await calls(page, "open_about_link")).map((c) => (c as { which: string }).which);
  expect(ids).toEqual(["project", "library", "author"]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
