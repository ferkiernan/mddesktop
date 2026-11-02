import { afterEach, describe, expect, it } from "vitest";
import { documents } from "../../src/services/ipc";
import { AppError } from "../../src/services/errors";
import { installMockIpc } from "../helpers/mockIpc";

const fp = { mtimeMs: 1, size: 2, hash: "ab" };
let ipc: ReturnType<typeof installMockIpc>;
afterEach(() => ipc?.restore());

describe("ipc service layer", () => {
  it("returns validated data", async () => {
    ipc = installMockIpc({
      read_document: () => ({
        path: "C:\\a.md",
        content: "x",
        encoding: "utf-8",
        bom: false,
        eol: "lf",
        fingerprint: fp,
      }),
    });
    const r = await documents.read("C:\\a.md");
    expect(r.content).toBe("x");
    expect(ipc.calls[0].args).toEqual({ path: "C:\\a.md", acceptLarge: false });
  });

  it("maps Rust errors to AppError", async () => {
    ipc = installMockIpc({
      read_document: () => Promise.reject({ code: "TOO_LARGE", message: "big", details: { size: 9 } }),
    });
    const err = await documents.read("C:\\a.md").catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.is("TOO_LARGE")).toBe(true);
    expect(err.details).toEqual({ size: 9 });
  });

  it("rejects malformed responses", async () => {
    ipc = installMockIpc({ read_document: () => ({ nope: true }) });
    await expect(documents.read("C:\\a.md")).rejects.toMatchObject({ code: "IO" });
  });

  it("validates outgoing write requests", async () => {
    ipc = installMockIpc({ write_document: () => ({ fingerprint: fp }) });
    const bad = { path: "a", content: "", eol: "cr" } as never;
    expect(() => documents.write(bad)).toThrow();
  });
});
