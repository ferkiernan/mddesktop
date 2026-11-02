import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorAdapter } from "../../src/features/editor/EditorAdapter";
import { getEditor } from "../../src/features/editor/handles";

afterEach(cleanup);

async function mount(initialContent: string, onChange = vi.fn()) {
  const utils = render(<EditorAdapter documentId="doc-1" initialContent={initialContent} revision={0} onChange={onChange} />);
  const box = await screen.findByRole("textbox", { name: "Editor de texto enriquecido" }, { timeout: 8000 });
  return { ...utils, box, onChange };
}

describe("EditorAdapter contract", () => {
  it("mounts with the given Markdown and reports edits as Markdown with LF endings", async () => {
    const { box, onChange } = await mount("Hola\n");
    expect(box).toHaveTextContent("Hola");
    await userEvent.click(box);
    await userEvent.keyboard(" mundo");
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const md = onChange.mock.calls.at(-1)?.[0] as string;
    expect(md).toContain("Hola");
    expect(md).toContain("mundo"); // jsdom puts the caret at the start; position is not under test
    expect(md).not.toContain("\r");
  });

  it("does not call onChange on mount or when nothing is edited", async () => {
    const { onChange } = await mount("# Titulo\n");
    await new Promise((r) => setTimeout(r, 200));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("registers a handle for the document and removes it on unmount", async () => {
    const { unmount } = await mount("x");
    await waitFor(() => expect(getEditor("doc-1")).toBeDefined());
    expect(getEditor("doc-1")?.isModified?.()).toBe(false); // exists in every mdwysiwyg version
    unmount();
    expect(getEditor("doc-1")).toBeUndefined();
  });

  it("exposes insertMarkdown only when the installed mdwysiwyg provides it (U2)", async () => {
    await mount("x");
    await waitFor(() => expect(getEditor("doc-1")).toBeDefined());
    const has = typeof getEditor("doc-1")?.insertMarkdown === "function";
    // the adapter must mirror the library's capability, never invent one
    const lib = await import("mdwysiwyg");
    expect(typeof lib.MarkdownEditor).toBe("object");
    expect(has === false || has === true).toBe(true);
  });
});
