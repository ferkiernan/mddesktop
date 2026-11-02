import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/ui/dialogs", () => ({ ask: vi.fn() }));
vi.mock("../../src/ui/Toast", () => ({ toast: vi.fn() }));

import { useDocuments } from "../../src/features/documents/store";
import { activateNext, neighborTab, otherIds } from "../../src/features/tabs/tabs";
import { touchPool } from "../../src/features/editor/pool";

function openThree() {
  const s = useDocuments.getState();
  return [s.newDocument(), s.newDocument(), s.newDocument()];
}

beforeEach(() => useDocuments.setState({ docs: {}, order: [], activeId: null, untitledCounter: 0 }));

describe("tab order", () => {
  it("moves a tab and clamps the index", () => {
    const [a, b, c] = openThree();
    useDocuments.getState().move(a, 2);
    expect(useDocuments.getState().order).toEqual([b, c, a]);
    useDocuments.getState().move(a, -5);
    expect(useDocuments.getState().order).toEqual([a, b, c]);
  });

  it("wraps next/previous", () => {
    const [a, b, c] = openThree();
    expect(neighborTab([a, b, c], c, 1)).toBe(a);
    expect(neighborTab([a, b, c], a, -1)).toBe(c);
    useDocuments.getState().setActive(a);
    activateNext(1);
    expect(useDocuments.getState().activeId).toBe(b);
  });

  it("computes the ids closed by 'close others'", () => {
    expect(otherIds(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("activates the neighbor when the active tab is closed", () => {
    const [a, b, c] = openThree();
    useDocuments.getState().setActive(b);
    useDocuments.getState().close(b);
    expect(useDocuments.getState().activeId).toBe(c);
    useDocuments.getState().close(c);
    expect(useDocuments.getState().activeId).toBe(a);
  });
});

describe("editor pool (LRU)", () => {
  const all = ["a", "b", "c", "d", "e"];
  it("keeps the active document first and evicts the least recently used", () => {
    let pool: string[] = [];
    for (const id of ["a", "b", "c", "d"]) pool = touchPool(pool, id, 3, all);
    expect(pool).toEqual(["d", "c", "b"]);
  });
  it("re-activating moves it to the front without growing", () => {
    expect(touchPool(["c", "b", "a"], "a", 3, all)).toEqual(["a", "c", "b"]);
  });
  it("drops closed documents", () => {
    expect(touchPool(["c", "b", "a"], "c", 3, ["c", "a"])).toEqual(["c", "a"]);
  });
});
