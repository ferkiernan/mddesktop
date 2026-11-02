# MD Desktop

Lightweight, fully local Markdown editor for Windows (Tauri 2 + React + TypeScript + [`mdwysiwyg`](https://github.com/ferkiernan/mdwysiwyg)).
Developed spec-first with [GitHub Spec Kit](https://github.com/github/spec-kit): see [`specs/001-markdown-desktop-editor/`](specs/001-markdown-desktop-editor/) and the [constitution](.specify/memory/constitution.md).

## Features

- WYSIWYG editing of `.md`/`.markdown` files, tabs, drag-to-reorder
- Safe saving: atomic writes, encoding/EOL/BOM preserved, no silent overwrites, 3-way conflict handling for external changes
- Unsaved-changes protection and crash recovery (~4 s)
- Opens files from Explorer, drag and drop and the command line (single instance)
- Light/dark theme, UI zoom, status bar toggle
- Works offline; no telemetry

## Shortcuts

`Ctrl+N` new · `Ctrl+O` open · `Ctrl+S` save · `Ctrl+Shift+S` save as · `Ctrl+W` close tab · `Ctrl+Tab` / `Ctrl+Shift+Tab` next/previous tab · `Ctrl+Z` / `Ctrl+Y` undo/redo (editor). `Cmd` on macOS.

## Development

Prerequisites: Node 22+, Rust (stable, MSVC), Visual Studio Build Tools (C++), WebView2. See [quickstart](specs/001-markdown-desktop-editor/quickstart.md).

```bash
npm install
npm run tauri dev      # run the app
npm test               # Vitest
npm run lint
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build    # NSIS installer
```

Native end-to-end checks drive the real WebView2 over CDP (debug build):

```bash
node tests/e2e/native/os-integration.cdp.mjs <exe>
node tests/e2e/native/recovery.cdp.mjs <exe>
node tests/e2e/native/shortcuts.cdp.mjs <exe>
```

## Docs

[spikes](docs/spikes.md) · [security review](docs/security-review.md) · [editor limitations](docs/mdwysiwyg-limitations.md) · [upstream requests](docs/upstream-requests.md)
