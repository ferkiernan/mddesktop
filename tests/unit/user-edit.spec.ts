import { beforeEach, describe, expect, it } from "vitest";
import { createEditTracker, isEditClick, isEditKey, EDIT_WINDOW_MS } from "../../src/features/editor/userEdit";
import { useDocuments } from "../../src/features/documents/store";

const key = (k: string, o: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
  key: k, ctrlKey: false, metaKey: false, altKey: false, ...o,
});

describe("which interactions count as edits", () => {
  it("typing, deleting and formatting chords are edits; navigation and copy are not", () => {
    for (const k of ["a", "Z", " ", "Backspace", "Delete", "Enter", "Tab"]) expect(isEditKey(key(k)), k).toBe(true);
    for (const k of ["z", "y", "x", "v", "b", "i"]) expect(isEditKey(key(k, { ctrlKey: true })), `ctrl+${k}`).toBe(true);
    for (const k of ["ArrowLeft", "ArrowDown", "Home", "End", "Shift", "Control", "Escape", "PageDown"]) {
      expect(isEditKey(key(k)), k).toBe(false);
    }
    for (const k of ["c", "a", "f"]) expect(isEditKey(key(k, { ctrlKey: true })), `ctrl+${k}`).toBe(false);
  });

  it("a click on the text only places the cursor; toolbar, popovers and task checkboxes are edits", () => {
    document.body.innerHTML = `
      <div class="ProseMirror"><p id="p">texto</p><ul><li><input id="cb" type="checkbox"></li></ul></div>
      <div class="toolbar"><button id="bold">B</button></div><textarea id="src"></textarea>`;
    const el = (id: string) => document.getElementById(id);
    expect(isEditClick(el("p"))).toBe(false);
    expect(isEditClick(el("src"))).toBe(false);
    expect(isEditClick(el("cb"))).toBe(true);
    expect(isEditClick(el("bold"))).toBe(true);
  });

  it("a change counts as an edit only shortly after an interaction", () => {
    const t = createEditTracker(100);
    expect(t.isEdit()).toBe(false);
    t.mark();
    expect(t.isEdit()).toBe(true);
    expect(t.isEdit(Date.now() + 101)).toBe(false);
    expect(EDIT_WINDOW_MS).toBeGreaterThan(500);
  });
});

describe("canonical baseline keeps untouched documents clean", () => {
  beforeEach(() => useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 }));
  const open = () =>
    useDocuments.getState().addOpened({
      path: "C:\\a.md", content: "| a |\n|---|\n", encoding: "utf-8", bom: false, eol: "lf",
      fingerprint: { mtimeMs: 1, size: 1, hash: "h" },
    } as never);

  it("re-serialization without an edit does not make the document modified, and undoing back to it is clean", () => {
    const id = open();
    useDocuments.getState().noteCanonical(id, "| a |\n| - |\n"); // what the editor emitted on a plain click
    expect(useDocuments.getState().docs[id].isDirty).toBe(false);
    useDocuments.getState().setContent(id, "| a |\n| - |\n\nmas"); // a real edit
    expect(useDocuments.getState().docs[id].isDirty).toBe(true);
    useDocuments.getState().setContent(id, "| a |\n| - |\n"); // user undid it: back to the canonical form
    expect(useDocuments.getState().docs[id].isDirty).toBe(false);
  });

  it("is forgotten on save and never applied to an already modified document", () => {
    const id = open();
    useDocuments.getState().setContent(id, "cambiado");
    useDocuments.getState().noteCanonical(id, "otra cosa");
    expect(useDocuments.getState().docs[id].canonical).toBeNull();
    useDocuments.getState().markSaved(id, { content: "cambiado", fingerprint: { mtimeMs: 2, size: 2, hash: "h2" } });
    expect(useDocuments.getState().docs[id].canonical).toBeNull();
  });
});
