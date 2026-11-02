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

function answer(value: string) {
  const { current, queue } = useDialogStore.getState();
  if (!current) return;
  current.resolve(value);
  const [next, ...rest] = queue;
  useDialogStore.setState({ current: next ?? null, queue: rest });
}

export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  if (!current) return null;
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title">{current.title}</h2>
        <p>{current.message}</p>
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
