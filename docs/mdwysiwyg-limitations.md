# `mdwysiwyg` limitations and how the app handles them

Based on `mdwysiwyg` 0.2.1 (see [research.md](../specs/001-markdown-desktop-editor/research.md) R1).

| Limitation | Effect | Handling |
|---|---|---|
| Uncontrolled: `initialContent` is read only on mount | Cannot push new content into a mounted editor | The app remounts the editor (`revision` bump) after a reload |
| No cursor/selection/scroll/undo API | State would be lost on tab switch | Pool of up to 3 mounted editors, hidden with `display:none`; older tabs keep **content** but lose undo history/cursor when evicted |
| No `setMarkdown`/`insertMarkdown` | Ctrl+Z after reload; image insertion | `reloadSnapshot` fallback; images deferred (U1–U3 in [upstream-requests.md](upstream-requests.md)) |
| Canonical re-serialization after WYSIWYG edits | Bullet/emphasis style may change (`*` → `-`); semantics preserved | Opening and toggling views never rewrites the file; the Markdown view shows raw text; the app saves only what the editor reports |
| Mermaid/Tiptap weight | ~20 MB RAM per mounted editor (spike S1) | Lazy-loaded chunk, pool cap |
| Duplicate `link` extension warning | Console noise | Reported upstream (U5) |
