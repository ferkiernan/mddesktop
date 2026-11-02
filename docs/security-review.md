# Security review (2026-11-01)

Scope: Principle V (Security by Design) and FR-027.

| Control | Status | Evidence |
|---|---|---|
| Minimal Tauri capabilities | OK | `src-tauri/capabilities/default.json` grants only `core:default`; no `fs`, `shell`, `opener` or `http` permissions |
| No filesystem access from the frontend | OK | `tauri-plugin-fs` is not a dependency; all I/O is Rust commands in `src-tauri/src/commands/` |
| Dialog plugin used from Rust only | OK | `dialog_service.rs`; no `dialog:*` permission is granted to the webview |
| Path authorization | OK | `AuthorizedPaths` (`services/authz.rs`): paths enter only from the native dialog, argv/second instance, OS drop and our own `session.json`. Frontend paths are canonicalized and must be in the set; `..`, relative paths and non-`.md/.markdown` are rejected (unit tests) |
| IPC argument validation | OK | Zod on the frontend (`services/contracts.ts`), typed `serde` structs + explicit checks in Rust; document ids restricted to `[A-Za-z0-9-]{1,64}` before becoming file names (`app_data.rs`, test) |
| No arbitrary command execution | OK | No process-spawning code in `src-tauri`; no `shell` plugin |
| Atomic, non-destructive writes | OK | temp file + rename; conflict check before write; failure leaves the original intact (test) |
| CSP | OK | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: http://asset.localhost; connect-src ipc: http://ipc.localhost` — `mdwysiwyg` mounts under it with no violations (CDP check) |
| Embedded HTML in Markdown | OK | `mdwysiwyg` sanitizes by default (`sanitizeEmbeddedHtml` left at `true`) |
| Network / telemetry | OK | No network code; connect-src limited to IPC |
| Single instance | OK | `tauri-plugin-single-instance` registered first; forwarded paths are filtered and authorized in Rust |

Known caveats:

- `style-src 'unsafe-inline'` is required by the editor's inline styles.
- Debug builds expose WebView2 remote debugging only when `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` is set by the launching user; release builds ignore nothing special, so do not ship that variable.
- The image feature (US7) will need an `asset:` protocol scope limited to each document's directory.
