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

## Status (2026-11-14, mdwysiwyg 0.8.0)

| ID | State |
|---|---|
| U1 `setMarkdown` | **Shipped** in 0.3.0 (typed in the app since spec 003) |
| U2 `insertMarkdown` | **Shipped** in 0.3.0; used by Insertar > Imagen… |
| U3 `resolveImageSrc` | **Shipped** in 0.3.0; relative images resolve through `asset:` |
| U4 view state API | Open: https://github.com/ferkiernan/mdwysiwyg/issues/3; the pool of 3 editors remains |
| U5 duplicate `link` warning | Open: https://github.com/ferkiernan/mdwysiwyg/issues/4 (still logged by 0.8.0) |
| U6 unstyled package | **Fixed** (fix tagged 0.3.1, never published; first published with it: 0.4.0; `verify:dist` guards it) |
| U7 history bar in Spanish | https://github.com/ferkiernan/mdwysiwyg/issues/5: "Confirm" / "Cancel (back to last version)" and the arrows' labels should be localizable or Spanish like the rest of the UI |
| U8 Mermaid theme option | https://github.com/ferkiernan/mdwysiwyg/issues/6: a prop or variable to pick Mermaid's theme (e.g. `dark`) so dark styles can draw dark diagrams; today the app keeps diagram backgrounds light (bug `pdf-mermaid-missing`) |
