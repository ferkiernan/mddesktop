# Dependency review (2026-11-02)

Principles I and IX: every dependency is justified; unused ones are removed.

## Frontend (runtime)

| Package | Why | Notes |
|---|---|---|
| `react`, `react-dom` 18.3 | UI (mandated); 18.3 is what `mdwysiwyg` is developed with | |
| `mdwysiwyg` `^0.9.0` | WYSIWYG engine (mandated) | Installed from npm and pinned by `package-lock.json` (0.3.1 was never published; a fresh `npm ci` gives 0.9.0 with styles). Brings Tiptap/unified; lazy-loaded chunk; ~20 MB RAM per mounted editor |
| `zustand` | State (mandated); ~1 KB | |
| `zod` | IPC validation (mandated) | |
| `@tauri-apps/api` | IPC + events | |

Removed: `@tauri-apps/plugin-opener` (scaffold leftover; no opener capability is granted).

## Rust

| Crate | Why |
|---|---|
| `tauri` (+`protocol-asset`) | Runtime; asset protocol for local images |
| `tauri-plugin-single-instance`, `-window-state`, `-dialog` | One window, window geometry, native dialogs (used from Rust only) |
| `notify`, `notify-debouncer-mini` | Event-driven file watching (no polling) |
| `encoding_rs`, `chardetng` | Non-UTF-8 files (FR-002b) |
| `xxhash-rust` (xxh3) | Stable content fingerprint for conflict detection |
| `serde`, `serde_json`, `thiserror`, `uuid` | Serialization, errors, temp-file names |
| `tempfile` (dev) | Tests |

## Dev tooling

Vitest, Testing Library, jsdom, Playwright, ESLint (+typescript-eslint, react-hooks), Prettier, TypeScript, Vite: build/test only, not shipped.
