# `mdwysiwyg` limitations and how the app handles them

Based on `mdwysiwyg` **0.8.0** (spec 003, 2026-11-14). Earlier notes for 0.2.x are in
[research.md](../specs/001-markdown-desktop-editor/research.md) R1.

| Limitation | Effect | Handling |
|---|---|---|
| Uncontrolled: `initialContent` is read only on mount | Cannot push new content into a mounted editor by props | Reload remounts the editor (`revision` bump) and keeps `reloadSnapshot` for Ctrl+Z (`reloadUndo.ts`); `setMarkdown` exists since 0.3.0 but the remount path is kept because it is covered by the native recovery/reload tests |
| No cursor/selection/scroll/undo API | State would be lost on tab switch | Pool of up to 3 mounted editors hidden with `display:none`; evicted tabs keep content, lose undo/cursor (U4) |
| Version history lives in memory per editor | Versions are lost when a tab is closed or an editor is evicted from the pool | Documented in README; on by default (spec 003) |
| History bar labels are in English ("Confirm", "Cancel (back to last version)") | Mixed languages in a Spanish UI | Requested upstream (U7) |
| Mermaid always uses its default (light) theme | Dark diagram backgrounds hide strokes/labels | Every style keeps `--mdw-mermaid-bg` light (contrast test); theme option requested upstream (U8) |
| Built-in content zoom (`allowContentZoom`) steps 10 % and does not report the level | Cannot persist it or use 5 % steps | Off; the app drives `--mdw-content-zoom` itself (spec 007) |
| Canonical re-serialization after WYSIWYG edits | Bullet/emphasis style may change (`*` → `-`); semantics preserved | Opening and toggling views never rewrites the file; the app saves only what the editor reports |
| Mermaid/Tiptap weight | ~20 MB RAM per mounted editor | Lazy-loaded chunk, pool cap; measured in [performance.md](performance.md) |
| Duplicate `link` extension warning | Console noise on every mount | Fixed in 0.8.2 (U5); none logged with 0.9.0 |
