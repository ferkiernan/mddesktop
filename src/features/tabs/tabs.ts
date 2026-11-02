import { useDocuments } from "../documents/store";

/** Next/previous tab id, wrapping around. */
export function neighborTab(order: string[], activeId: string | null, delta: 1 | -1): string | null {
  if (order.length === 0) return null;
  const i = activeId ? order.indexOf(activeId) : -1;
  if (i < 0) return order[0];
  return order[(i + delta + order.length) % order.length];
}

export function activateNext(delta: 1 | -1 = 1) {
  const { order, activeId, setActive } = useDocuments.getState();
  const id = neighborTab(order, activeId, delta);
  if (id) setActive(id);
}

/** Ids closed by "close others" for the given tab. */
export function otherIds(order: string[], keepId: string): string[] {
  return order.filter((id) => id !== keepId);
}
