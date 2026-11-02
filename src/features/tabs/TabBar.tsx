import { useState } from "react";
import { useDocuments } from "../documents/store";
import { Tab } from "./Tab";
import { TabContextMenu } from "./TabContextMenu";
import { usePointerReorder } from "./usePointerReorder";
import { otherIds } from "./tabs";

export interface TabBarProps {
  onNew(): void;
  /** Closing goes through the close flow so unsaved changes are protected. */
  onClose(ids: string[]): void;
}

export function TabBar({ onNew, onClose }: TabBarProps) {
  const docs = useDocuments((s) => s.docs);
  const order = useDocuments((s) => s.order);
  const activeId = useDocuments((s) => s.activeId);
  const setActive = useDocuments((s) => s.setActive);
  const move = useDocuments((s) => s.move);
  const { state, register, handlers } = usePointerReorder(order, move);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  return (
    <div
      className="app-tabs"
      role="tablist"
      aria-label="Documentos abiertos"
      aria-orientation="horizontal"
      title="Clic central en un espacio vacío: documento nuevo"
      // middle button: autoscroll off; on EMPTY bar space it opens a new temporary (unsaved) document
      onMouseDown={(e) => e.button === 1 && e.preventDefault()}
      onAuxClick={(e) => {
        if (e.button === 1 && e.target === e.currentTarget) {
          e.preventDefault();
          onNew();
        }
      }}
      onKeyDown={(e) => {
        // roving tabindex: arrows/Home/End move between tabs, Delete closes the active one
        if (!order.length) return;
        const i = activeId ? order.indexOf(activeId) : 0;
        let next: number | null = null;
        if (e.key === "ArrowRight") next = (i + 1) % order.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + order.length) % order.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = order.length - 1;
        else if (e.key === "Delete" && activeId) {
          e.preventDefault();
          onClose([activeId]);
          return;
        }
        if (next !== null) {
          e.preventDefault();
          setActive(order[next]);
          queueMicrotask(() => document.querySelector<HTMLElement>("[role=tab][aria-selected=true]")?.focus());
        }
      }}
    >
      {order.map((id, i) => (
        <Tab
          key={id}
          doc={docs[id]}
          active={id === activeId}
          dragging={state.dragId === id}
          dropBefore={state.dragId !== null && state.dragId !== id && state.overIndex === i}
          register={(el) => register(id, el)}
          handlers={{
            onPointerDown: (e) => handlers.onPointerDown(id, e),
            onPointerMove: handlers.onPointerMove,
            onPointerUp: handlers.onPointerUp,
          }}
          onActivate={() => setActive(id)}
          onClose={() => onClose([id])}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ id, x: e.clientX, y: e.clientY });
          }}
        />
      ))}
      {menu && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onCloseTab={() => onClose([menu.id])}
          onCloseOthers={() => onClose(otherIds(order, menu.id))}
          onCloseAll={() => onClose(order.slice())}
        />
      )}
    </div>
  );
}
