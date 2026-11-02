import type { EditorDocument } from "../documents/types";

export interface TabProps {
  doc: EditorDocument;
  active: boolean;
  dropBefore: boolean;
  dragging: boolean;
  register(el: HTMLElement | null): void;
  handlers: {
    onPointerDown(e: React.PointerEvent): void;
    onPointerMove(e: React.PointerEvent): void;
    onPointerUp(e: React.PointerEvent): void;
  };
  onActivate(): void;
  onClose(): void;
  onContextMenu(e: React.MouseEvent): void;
}

export function Tab({ doc, active, dropBefore, dragging, register, handlers, onActivate, onClose, onContextMenu }: TabProps) {
  const cls = ["tab", dropBefore && "drop-before", dragging && "dragging"].filter(Boolean).join(" ");
  return (
    <div
      ref={register}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      className={cls}
      title={doc.filePath ?? doc.fileName}
      onClick={onActivate}
      onAuxClick={(e) => e.button === 1 && onClose()}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onActivate()}
      {...handlers}
    >
      <span className="tab-name">{doc.fileName}</span>
      {doc.isDirty && (
        <span className="tab-dirty" role="img" aria-label="Cambios sin guardar">
          ●
        </span>
      )}
      <button
        className="tab-close"
        aria-label={`Cerrar ${doc.fileName}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </div>
  );
}
