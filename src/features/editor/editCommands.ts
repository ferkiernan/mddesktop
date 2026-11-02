// Edit menu actions routed to the active editor (spike S4: native Edit items would need
// predefined menu items whose Windows support is undocumented, so we drive the editor directly).
import { toast } from "../../ui/Toast";
import { isMac } from "../shortcuts/manager";

export type EditCommand = "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll";

function target(): HTMLElement | null {
  const slot = document.querySelector(".editor-slot:not([hidden])");
  return slot?.querySelector<HTMLElement>("textarea, .ProseMirror") ?? null;
}

function pressKey(el: HTMLElement, key: string, shift = false) {
  const mac = isMac();
  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code: `Key${key.toUpperCase()}`,
      ctrlKey: !mac,
      metaKey: mac,
      shiftKey: shift,
      bubbles: true,
      cancelable: true,
    }),
  );
}

export async function runEdit(cmd: EditCommand): Promise<void> {
  const el = target();
  if (!el) return;
  el.focus();
  const isText = el.tagName === "TEXTAREA";
  switch (cmd) {
    case "undo":
      return isText ? void document.execCommand("undo") : pressKey(el, "z"); // ProseMirror history keymap
    case "redo":
      return isText ? void document.execCommand("redo") : pressKey(el, "y");
    case "cut":
      return void document.execCommand("cut");
    case "copy":
      return void document.execCommand("copy");
    case "selectAll":
      return void document.execCommand("selectAll");
    case "paste":
      try {
        document.execCommand("insertText", false, await navigator.clipboard.readText());
      } catch {
        toast("No se pudo pegar desde el menú; usa Ctrl+V");
      }
  }
}
