// mdwysiwyg calls onChange for any document transaction, including ones that are not edits
// (e.g. a click that only moves the cursor can re-serialize the Markdown canonically). The
// "modified" marker must only appear when the USER edits, so we watch for the interactions that
// can change content and let a change through only shortly after one of them.

/** A change reported within this window after a user interaction counts as an edit. */
export const EDIT_WINDOW_MS = 1500;

const EDIT_KEYS = new Set(["Backspace", "Delete", "Enter", "Tab"]);
// Ctrl/Cmd combinations that change the document (undo/redo, cut, paste, bold, italic, underline...)
const EDIT_CHORDS = new Set(["z", "y", "x", "v", "b", "i", "u", "k", "e", "d", "h", "l", "m", "j"]);

export interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/** True for a keydown that can change the document (typing, deleting, formatting chords). */
export function isEditKey(e: KeyLike): boolean {
  if (e.altKey && !e.ctrlKey && !e.metaKey) return e.key.length === 1; // AltGr compositions
  if (e.ctrlKey || e.metaKey) return EDIT_CHORDS.has(e.key.toLowerCase());
  return EDIT_KEYS.has(e.key) || e.key.length === 1;
}

/**
 * True for a click that can change content: toolbar buttons, popovers, task checkboxes, table menus.
 * A plain click inside the text only moves the cursor.
 */
export function isEditClick(target: Element | null): boolean {
  if (!target) return false;
  if (target.closest("input[type=checkbox]")) return true; // task list item toggle
  if (target.closest(".ProseMirror, textarea")) return false; // cursor placement / selection
  return true; // toolbar, link popover, table menu, pickers
}

export interface EditTracker {
  mark(): void;
  /** Whether a change arriving now should count as a user edit. */
  isEdit(now?: number): boolean;
}

export function createEditTracker(window = EDIT_WINDOW_MS): EditTracker {
  let last = Number.NEGATIVE_INFINITY;
  return {
    mark: () => {
      last = Date.now();
    },
    isEdit: (now = Date.now()) => now - last <= window,
  };
}
