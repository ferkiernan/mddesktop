# Upstream requests for `ferkiernan/mdwysiwyg`

MD Desktop depends on `mdwysiwyg` (MIT, same author). These requests close gaps found in
[research.md](../specs/001-markdown-desktop-editor/research.md) R1. The app works without them using the
fallbacks below, and switches automatically when the handle exposes the new methods
(`src/features/editor/`).

| ID | Request | Needed for | Fallback today |
|---|---|---|---|
| U1 | `handle.setMarkdown(md)`: replace content as an **undoable** transaction (Ctrl+Z restores); does not change `isModified()` baseline | FR-014a — Ctrl+Z after reloading a changed file | Editor remounts with the disk content; the app keeps `reloadSnapshot` and restores it on the first Ctrl+Z (`reloadUndo.ts`) |
| U2 | `handle.insertMarkdown(md)`: insert at the cursor (or an `onRequestImage` prop) | FR-025 — insert a local image | US7 deferred |
| U3 | `resolveImageSrc(src) => string` prop | Show images with relative paths | US7 deferred |
| U4 | `getViewState()/setViewState()` (cursor, selection, scroll) | FR-006 without keeping editors mounted | Pool of 3 mounted editors (`pool.ts`, ~20 MB each) |
| U5 | Bug: Tiptap warns `Duplicate extension names found: ['link']` on every mount | Console noise / possible misbehaviour | None needed |

Open an issue per item in the `mdwysiwyg` repository and link it here when created.
