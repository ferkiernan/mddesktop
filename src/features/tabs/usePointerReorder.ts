// Tab reordering with Pointer Events (no DnD library; HTML5 DnD may be disabled by the
// native file-drop handler on Windows - spike S6, plan R12).
import { useCallback, useRef, useState } from "react";

const THRESHOLD_PX = 5;

export interface ReorderState {
  dragId: string | null;
  /** Index the dragged tab would take if released now. */
  overIndex: number | null;
}

export function usePointerReorder(order: string[], onMove: (id: string, toIndex: number) => void) {
  const [state, setState] = useState<ReorderState>({ dragId: null, overIndex: null });
  const tabEls = useRef(new Map<string, HTMLElement>());
  const start = useRef<{ id: string; x: number; active: boolean } | null>(null);

  const register = useCallback((id: string, el: HTMLElement | null) => {
    if (el) tabEls.current.set(id, el);
    else tabEls.current.delete(id);
  }, []);

  const indexAt = useCallback(
    (clientX: number) => {
      let idx = order.length - 1;
      for (let i = 0; i < order.length; i++) {
        const r = tabEls.current.get(order[i])?.getBoundingClientRect();
        if (r && clientX < r.left + r.width / 2) {
          idx = i;
          break;
        }
      }
      return idx;
    },
    [order],
  );

  const onPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    start.current = { id, x: e.clientX, active: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (!s.active && Math.abs(e.clientX - s.x) < THRESHOLD_PX) return;
      s.active = true;
      setState({ dragId: s.id, overIndex: indexAt(e.clientX) });
    },
    [indexAt],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (s?.active) onMove(s.id, indexAt(e.clientX));
      setState({ dragId: null, overIndex: null });
    },
    [indexAt, onMove],
  );

  return { state, register, handlers: { onPointerDown, onPointerMove, onPointerUp } };
}
