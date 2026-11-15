// Bug panel-buttons-disabled: primary buttons used a pressed-button grey as accent and looked disabled.
import { describe, expect, it } from "vitest";
import { accentText, chromeOf } from "../../src/features/settings/applyStyle";
import { EDITOR_STYLES } from "../../src/features/settings/editorStyles";
import { contrast, parseColor } from "../../src/features/export/native/color";

describe("primary button accent", () => {
  it("uses the style accent (not the pressed-button grey) with readable text in every style", () => {
    for (const s of EDITOR_STYLES) {
      const c = chromeOf(s);
      expect(c.accent, s.id).toBe(s.vars["--mdw-accent"]);
      expect(contrast(parseColor(c.accent)!, parseColor(c.accentFg)!), `${s.id} ${c.accent}/${c.accentFg}`).toBeGreaterThanOrEqual(3);
    }
    expect(chromeOf(EDITOR_STYLES[0]).accent).toBe("#3d6fd8"); // Default: blue, not #c8c8c8
  });

  it("picks dark text on light accents and white on dark ones", () => {
    expect(accentText("#cec940")).toBe("#000000");
    expect(accentText("#0069a7")).toBe("#ffffff");
  });
});
