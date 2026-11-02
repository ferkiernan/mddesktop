import { expect, test } from "@playwright/test";
import { EDITOR_STYLES } from "../../../src/features/settings/editorStyles";
import { baseResponses, diskDoc, installTauri, menu, PREFS , gotoApp } from "./support";

const SAMPLE = "# Estilos\n\nTexto con **negrita**, *cursiva* y un [enlace](https://example.com).\n\n- uno\n- dos\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```\n";

for (const style of EDITOR_STYLES) {
  test(`style "${style.label}" is applied to the editor and the app chrome`, async ({ page }) => {
    await installTauri(page, baseResponses({
      settings_load: { ...PREFS, editorStyle: style.id },
      pick_open_files: ["C:\\docs\\estilo.md"],
      read_document: diskDoc("C:\\docs\\estilo.md", SAMPLE),
      set_style_menu: null,
    }));
    await gotoApp(page);
    await menu(page, "file.open");
    const editor = page.locator(".editor-slot:not([hidden]) .mdd-editor");
    await expect(editor).toBeVisible();

    // the preset's variables reach the editor root through the scoped stylesheet
    const fg = await editor.evaluate((el) => getComputedStyle(el).getPropertyValue("--mdw-toolbar-fg").trim());
    expect(fg).toBe(style.vars["--mdw-toolbar-fg"]);
    expect(await page.evaluate(() => document.documentElement.dataset.editorStyle)).toBe(style.id);

    // the tab bar follows the preset (gradient bar + its foreground)
    const bar = await page.locator(".app-tabs").evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bar).toContain("linear-gradient");
    await page.screenshot({ path: `test-results/styles/${style.id}.png` });
  });
}

test("the active style survives switching tabs and each style applies instantly", async ({ page }) => {
  await installTauri(page, baseResponses({ set_style_menu: null, settings_save: { __reject: { code: "IO", message: "offline" } } })); // optimistic state is kept
  await gotoApp(page);
  await menu(page, "style.winamp");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.editorStyle)).toBe("winamp");
  await menu(page, "style.anthropic");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.editorStyle)).toBe("anthropic");
  await menu(page, "style.does-not-exist"); // unknown ids fall back to default
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.editorStyle)).toBe("default");
});
