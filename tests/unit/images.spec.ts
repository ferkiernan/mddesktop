import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const askMock = vi.hoisted(() => vi.fn());
vi.mock("../../src/ui/dialogs", () => ({ ask: askMock }));
vi.mock("../../src/ui/Toast", () => ({ toast: vi.fn() }));

import { useDocuments } from "../../src/features/documents/store";
import { registerEditor } from "../../src/features/editor/handles";
import { insertImage } from "../../src/features/images/insertImage";
import { absoluteImagePath, altFromFile, markdownImage, relativeFromDoc } from "../../src/features/images/paths";
import { installMockIpc } from "../helpers/mockIpc";

describe("image paths", () => {
  it("builds relative paths from the document folder", () => {
    expect(relativeFromDoc("C:\\docs\\n\\nota.md", "C:\\docs\\n\\assets\\a.png")).toBe("assets/a.png");
    expect(relativeFromDoc("C:\\docs\\n\\nota.md", "C:\\docs\\fotos\\a.png")).toBe("../fotos/a.png");
    expect(relativeFromDoc("c:\\Docs\\nota.md", "C:\\docs\\assets\\a.png")).toBe("assets/a.png");
    expect(relativeFromDoc("C:\\docs\\nota.md", "D:\\img\\a.png")).toBeNull();
  });

  it("escapes spaces and parentheses in the Markdown URL", () => {
    expect(markdownImage("assets/mi foto (1).png", "mi foto [1]")).toBe("![mi foto 1](assets/mi%20foto%20%281%29.png)");
    expect(altFromFile("C:\\x\\gato.final.png")).toBe("gato.final");
  });

  it("resolves relative refs to absolute paths and leaves URLs alone", () => {
    expect(absoluteImagePath("C:\\docs\\nota.md", "assets/mi%20foto.png")).toBe("C:\\docs\\assets\\mi foto.png");
    expect(absoluteImagePath("C:\\docs\\n\\nota.md", "../x.png")).toBe("C:\\docs\\x.png");
    expect(absoluteImagePath("C:\\docs\\nota.md", "https://e.com/a.png")).toBeNull();
    expect(absoluteImagePath("C:\\docs\\nota.md", "data:image/png;base64,AA")).toBeNull();
  });
});

describe("insert image flow (FR-025, FR-025a, FR-026)", () => {
  let ipc: ReturnType<typeof installMockIpc> | undefined;
  const insert = vi.fn();
  const fp = { mtimeMs: 1, size: 1, hash: "h" };

  beforeEach(() => {
    useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
    askMock.mockReset();
    insert.mockReset();
  });
  afterEach(() => ipc?.restore());

  function savedDoc() {
    const id = useDocuments.getState().addOpened({
      path: "C:\\docs\\nota.md", content: "x", encoding: "utf-8", bom: false, eol: "lf", fingerprint: fp,
    } as never);
    registerEditor(id, { insertMarkdown: insert });
    return id;
  }

  it("explains and does nothing when the editor cannot insert content", async () => {
    ipc = installMockIpc({});
    const id = useDocuments.getState().addOpened({
      path: "C:\\docs\\nota.md", content: "x", encoding: "utf-8", bom: false, eol: "lf", fingerprint: fp,
    } as never);
    registerEditor(id, {});
    askMock.mockResolvedValue("ok");
    await insertImage();
    expect(ipc.calls).toHaveLength(0); // nothing picked or copied
  });

  it("copies to assets and inserts a relative Markdown image", async () => {
    ipc = installMockIpc({
      pick_image: () => "D:\\fotos\\gato.png",
      import_image: () => ({ relativePath: "assets/gato.png", copied: true, existedBefore: false }),
    });
    savedDoc();
    askMock.mockResolvedValue("copy");
    await insertImage();
    expect(insert).toHaveBeenCalledWith("![gato](assets/gato.png)");
    expect(ipc.calls[1].args).toMatchObject({ documentPath: "C:\\docs\\nota.md", overwrite: false });
  });

  it("does not overwrite an existing asset without consent, and Cancelar inserts nothing", async () => {
    ipc = installMockIpc({
      pick_image: () => "D:\\fotos\\gato.png",
      import_image: () => ({ relativePath: "assets/gato.png", copied: false, existedBefore: true }),
    });
    savedDoc();
    askMock.mockResolvedValueOnce("copy").mockResolvedValueOnce("cancel");
    await insertImage();
    expect(insert).not.toHaveBeenCalled();
    expect(ipc.calls.filter((c) => c.cmd === "import_image")).toHaveLength(1);
  });

  it("overwrites only after the user asks for it", async () => {
    let n = 0;
    ipc = installMockIpc({
      pick_image: () => "D:\\fotos\\gato.png",
      import_image: () =>
        n++ === 0
          ? { relativePath: "assets/gato.png", copied: false, existedBefore: true }
          : { relativePath: "assets/gato.png", copied: true, existedBefore: true },
    });
    savedDoc();
    askMock.mockResolvedValueOnce("copy").mockResolvedValueOnce("overwrite");
    await insertImage();
    expect(ipc.calls.at(-1)?.args).toMatchObject({ overwrite: true });
    expect(insert).toHaveBeenCalledWith("![gato](assets/gato.png)");
  });

  it("'usar ruta original' links relatively without copying", async () => {
    ipc = installMockIpc({ pick_image: () => "C:\\docs\\fotos\\gato.png" });
    savedDoc();
    askMock.mockResolvedValue("link");
    await insertImage();
    expect(insert).toHaveBeenCalledWith("![gato](fotos/gato.png)");
    expect(ipc.calls.some((c) => c.cmd === "import_image")).toBe(false);
  });

  it("unsaved document: asks to save first and aborts if the user cancels", async () => {
    ipc = installMockIpc({});
    const id = useDocuments.getState().newDocument();
    registerEditor(id, { insertMarkdown: insert });
    askMock.mockResolvedValue("cancel");
    await insertImage();
    expect(ipc.calls).toHaveLength(0);
    expect(insert).not.toHaveBeenCalled();
  });
});
