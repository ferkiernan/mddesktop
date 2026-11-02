import { useEffect, useRef } from "react";
import { create } from "zustand";

export interface DialogButton {
  label: string;
  value: string;
  primary?: boolean;
}
interface DialogRequest {
  title: string;
  message: string;
  buttons: DialogButton[];
  resolve: (value: string) => void;
}
interface DialogStore {
  current: DialogRequest | null;
  queue: DialogRequest[];
}

const useDialogStore = create<DialogStore>(() => ({ current: null, queue: [] }));

/** Shows a modal and resolves with the clicked button's value. */
export function ask(opts: Omit<DialogRequest, "resolve">): Promise<string> {
  return new Promise((resolve) => {
    const req = { ...opts, resolve };
    useDialogStore.setState((s) => (s.current ? { queue: [...s.queue, req] } : { current: req }));
  });
}

export function _resetDialogsForTests() {
  useDialogStore.setState({ current: null, queue: [] });
}

function answer(value: string) {
  const { current, queue } = useDialogStore.getState();
  if (!current) return;
  current.resolve(value);
  const [next, ...rest] = queue;
  useDialogStore.setState({ current: next ?? null, queue: rest });
}

export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  const ref = useRef<HTMLDivElement>(null);

  // Modal behaviour: focus moves in, Tab is trapped, Escape picks the first (safe) button,
  // and focus returns to where it was when the dialog closes.
  useEffect(() => {
    if (!current) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        answer(current.buttons[0].value);
      } else if (e.key === "Tab" && ref.current) {
        const items = ref.current.querySelectorAll<HTMLElement>("button");
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [current]);

  if (!current) return null;
  return (
    <div className="dialog-backdrop">
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-msg">
        <h2 id="dialog-title">{current.title}</h2>
        <p id="dialog-msg">{current.message}</p>
        <div className="dialog-actions">
          {current.buttons.map((b) => (
            <button key={b.value} autoFocus={b.primary} className={b.primary ? "primary" : ""} onClick={() => answer(b.value)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
