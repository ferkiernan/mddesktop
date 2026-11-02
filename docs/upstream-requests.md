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

## Status (2026-11-02)

U1 (`setMarkdown`), U2 (`insertMarkdown`) and U3 (`resolveImageSrc`): PR https://github.com/ferkiernan/mdwysiwyg/pull/2 (open, not merged, not published). Same change as
[`mdwysiwyg-host-api.patch`](mdwysiwyg-host-api.patch) (against `ferkiernan/mdwysiwyg` master; all 153 tests pass,
4 new in `tests/MarkdownEditor/host-integration.test.tsx`). Nothing has been published to npm.

To apply: `git apply docs/mdwysiwyg-host-api.patch` in a checkout of `mdwysiwyg`, update its README/CHANGELOG, bump to
0.3.0, publish, then set `"mdwysiwyg": "^0.3.0"` here.

Verified end to end in the real app with the patched build installed via `npm install --no-save <tarball>`:
`node tests/e2e/native/images.cdp.mjs <exe>` renders `![foto](assets/mi%20foto.png)` through the `asset:` protocol
(folder name and file name with spaces). Until 0.3 is published the app keeps working without it: "Insertar imagen…"
explains that the editor cannot insert, and relative images are shown unresolved.

## U6 — Published package renders unstyled (bug, 0.2.1)

`tsup` bundles `*.module.css` as global CSS and exports an **empty class map**
(`var MarkdownEditor_default = {}` in `dist/index.js`), so `styles["root"]`, `styles["toolbar"]`… are `undefined` and no element
gets its class: the toolbar shows bare buttons without icons/gradient, tables and code blocks are unstyled. The demo site
looks fine only because it builds from source with Vite.

Fix (one line in `tsup.config.ts`: `loader: { ".css": "local-css" }`): [`mdwysiwyg-css-modules.patch`](mdwysiwyg-css-modules.patch),
committed on a local branch `fix/css-modules-class-map` of the clone (not pushed). **Needs a new release (0.2.2/0.3.0)**; until
then a fresh `npm install` of this app shows the unstyled editor. The app's style presets (Configuración > Estilo del editor)
were verified against a locally packed build with the fix.
