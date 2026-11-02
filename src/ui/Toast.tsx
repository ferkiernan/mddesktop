import { create } from "zustand";

const useToast = create<{ message: string | null }>(() => ({ message: null }));
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string, ms = 2200) {
  useToast.setState({ message });
  clearTimeout(timer);
  timer = setTimeout(() => useToast.setState({ message: null }), ms);
}

export function ToastHost() {
  const message = useToast((s) => s.message);
  return message ? (
    <div className="toast" role="status">
      {message}
    </div>
  ) : null;
}
