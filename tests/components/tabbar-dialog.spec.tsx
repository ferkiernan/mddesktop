import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDocuments } from "../../src/features/documents/store";
import { TabBar } from "../../src/features/tabs/TabBar";
import { DialogHost, _resetDialogsForTests, ask } from "../../src/ui/dialogs";

function seed() {
  const s = useDocuments.getState();
  const a = s.newDocument();
  const b = s.newDocument();
  const c = s.newDocument();
  useDocuments.getState().setContent(b, "cambios");
  useDocuments.getState().setActive(a);
  return [a, b, c];
}

beforeEach(() => {
  useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 });
  _resetDialogsForTests();
});
afterEach(cleanup);

describe("TabBar", () => {
  it("shows name, dirty indicator, close button and the active tab", () => {
    seed();
    render(<TabBar onNew={vi.fn()} onClose={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Sin título 1×", "Sin título 2●×", "Sin título 3×"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("img", { name: "Cambios sin guardar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar Sin título 2" })).toBeInTheDocument();
  });

  it("activates on click, creates a new tab and closes through onClose", () => {
    const [, b] = seed();
    const onNew = vi.fn();
    const onClose = vi.fn();
    render(<TabBar onNew={onNew} onClose={onClose} />);
    fireEvent.click(screen.getAllByRole("tab")[1]);
    expect(useDocuments.getState().activeId).toBe(b);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    expect(onNew).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar Sin título 2" }));
    expect(onClose).toHaveBeenCalledWith([b]);
  });

  it("closes others / all from the context menu", () => {
    const [a, b, c] = seed();
    const onClose = vi.fn();
    render(<TabBar onNew={vi.fn()} onClose={onClose} />);
    fireEvent.contextMenu(screen.getAllByRole("tab")[1]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Cerrar otras" }));
    expect(onClose).toHaveBeenLastCalledWith([a, c]);
    fireEvent.contextMenu(screen.getAllByRole("tab")[1]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Cerrar todas" }));
    expect(onClose).toHaveBeenLastCalledWith([a, b, c]);
  });

  it("supports keyboard navigation (arrows wrap, Home/End, Delete closes)", () => {
    const [a, b, c] = seed();
    const onClose = vi.fn();
    render(<TabBar onNew={vi.fn()} onClose={onClose} />);
    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "ArrowLeft" });
    expect(useDocuments.getState().activeId).toBe(c);
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(useDocuments.getState().activeId).toBe(a);
    fireEvent.keyDown(list, { key: "End" });
    expect(useDocuments.getState().activeId).toBe(c);
    fireEvent.keyDown(list, { key: "Home" });
    fireEvent.keyDown(list, { key: "Delete" });
    expect(onClose).toHaveBeenCalledWith([a]);
    void b;
  });
});

describe("DialogHost (accessible modal)", () => {
  const buttons = [
    { label: "Cancelar", value: "cancel" },
    { label: "Guardar", value: "save", primary: true },
  ];

  it("is a labelled modal dialog and resolves with the clicked button", async () => {
    render(<DialogHost />);
    let p!: Promise<string>;
    act(() => {
      p = ask({ title: "Cambios sin guardar", message: "¿Guardar?", buttons });
    });
    const dialog = await screen.findByRole("dialog", { name: "Cambios sin guardar" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Guardar" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await expect(p).resolves.toBe("save");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape picks the first (safe) button", async () => {
    render(<DialogHost />);
    let p!: Promise<string>;
    act(() => {
      p = ask({ title: "T", message: "m", buttons });
    });
    await screen.findByRole("dialog");
    fireEvent.keyDown(window, { key: "Escape" });
    await expect(p).resolves.toBe("cancel");
  });

  it("traps Tab inside the dialog", async () => {
    render(<DialogHost />);
    act(() => void ask({ title: "T", message: "m", buttons }));
    await screen.findByRole("dialog");
    const save = screen.getByRole("button", { name: "Guardar" });
    const cancel = screen.getByRole("button", { name: "Cancelar" });
    save.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(save).toHaveFocus();
  });

  it("queues a second dialog until the first is answered", async () => {
    render(<DialogHost />);
    let p1!: Promise<string>;
    let p2!: Promise<string>;
    act(() => {
      p1 = ask({ title: "Uno", message: "m", buttons });
      p2 = ask({ title: "Dos", message: "m", buttons });
    });
    expect(await screen.findByRole("dialog", { name: "Uno" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await p1;
    expect(await screen.findByRole("dialog", { name: "Dos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await expect(p2).resolves.toBe("save");
  });
});
