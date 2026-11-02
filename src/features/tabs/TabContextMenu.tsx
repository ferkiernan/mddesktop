import { useEffect } from "react";

export interface TabContextMenuProps {
  x: number;
  y: number;
  onClose(): void;
  onCloseTab(): void;
  onCloseOthers(): void;
  onCloseAll(): void;
}

export function TabContextMenu({ x, y, onClose, onCloseTab, onCloseOthers, onCloseAll }: TabContextMenuProps) {
  useEffect(() => {
    const dismiss = () => onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const item = (label: string, fn: () => void) => (
    <button
      role="menuitem"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        fn();
        onClose();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="ctx-menu" role="menu" style={{ left: x, top: y }}>
      {item("Cerrar", onCloseTab)}
      {item("Cerrar otras", onCloseOthers)}
      {item("Cerrar todas", onCloseAll)}
    </div>
  );
}
