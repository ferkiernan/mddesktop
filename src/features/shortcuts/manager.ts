// Keyboard Shortcut Manager: the single owner of app-level key bindings (FR-018).
// Ctrl+Z/Y/X/C/V/A/B/I... are deliberately NOT bound here: the editor owns them.
import type { MenuActionId } from "../../services/contracts";

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** Maps a key event to an app action, or null. `mac` switches the modifier to Cmd. */
export function matchShortcut(e: KeyLike, mac = isMac()): MenuActionId | null {
  const mod = mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (!mod || e.altKey) return null;
  const k = e.key.toLowerCase();
  if (k === "tab") return e.shiftKey ? "tab.prev" : "tab.next";
  if (e.shiftKey) return k === "s" ? "file.saveAs" : null;
  switch (k) {
    case "n":
      return "file.new";
    case "o":
      return "file.open";
    case "s":
      return "file.save";
    case "w":
      return "file.close";
    case "+":
    case "=":
      return "view.zoomIn";
    case "-":
      return "view.zoomOut";
    case "0":
      return "view.zoomReset";
    default:
      return null;
  }
}

export const SHORTCUT_TABLE: { keys: string; action: MenuActionId }[] = [
  { keys: "Ctrl+N", action: "file.new" },
  { keys: "Ctrl+O", action: "file.open" },
  { keys: "Ctrl+S", action: "file.save" },
  { keys: "Ctrl+Shift+S", action: "file.saveAs" },
  { keys: "Ctrl+W", action: "file.close" },
  { keys: "Ctrl+Tab", action: "tab.next" },
  { keys: "Ctrl+Shift+Tab", action: "tab.prev" },
];

export function startShortcuts(run: (id: MenuActionId) => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    const action = matchShortcut(e);
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    run(action);
  };
  window.addEventListener("keydown", onKey, true);
  return () => window.removeEventListener("keydown", onKey, true);
}
