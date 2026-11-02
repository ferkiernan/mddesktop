# Contract: Application Events (Rust → frontend)

Eventos Tauri emitidos por Rust; el frontend se suscribe solo desde `src/services/events.ts`. Los payloads se validan con Zod.

| Evento | Payload | Origen / cuándo |
|---|---|---|
| `app://open-files` | `{ paths: string[], source: "argv" \| "second-instance" \| "drop" \| "os" }` | Argumentos al arrancar, segunda instancia (`single-instance`), arrastre de archivos sobre la ventana. Rust ya filtró extensión y autorizó las rutas; los no-Markdown generan `app://rejected-files` |
| `app://rejected-files` | `{ paths: string[], reason: "NOT_MARKDOWN" }` | Archivos soltados/abiertos que no son Markdown |
| `fs://external-change` | `{ path: string, kind: "modified" \| "removed" \| "renamed", fingerprint?: FileFingerprint }` | `notify` (debounced ~300 ms) sobre archivos observados; también al recuperar el foco si la huella difiere |
| `app://close-requested` | `{}` | Intento de cerrar la ventana; Rust la mantiene abierta hasta `confirm_exit` |
| `menu://action` | `{ id: MenuActionId }` | Clic en menú nativo o acelerador |

`MenuActionId`: `file.new`, `file.open`, `file.save`, `file.saveAs`, `file.close`, `file.closeAll`, `file.exit`, `edit.undo`, `edit.redo`, `edit.cut`, `edit.copy`, `edit.paste`, `edit.selectAll`, `view.toggleTheme`, `view.zoomIn`, `view.zoomOut`, `view.zoomReset`, `view.toggleStatusBar`, `tab.next`, `tab.prev`.

## Reglas

- Sin polling: ningún evento proviene de temporizadores periódicos.
- `app://open-files` en estado "ya abierto" no crea pestañas duplicadas: el frontend activa la existente (FR-003).
- Los eventos de cambio externo se ignoran si la huella coincide con la última escritura propia (evita falsos conflictos tras guardar).
- Al recibir `app://close-requested` el frontend resuelve los documentos con cambios (Guardar/Descartar/Cancelar) y recién entonces llama `confirm_exit`; Cancelar no hace nada.
