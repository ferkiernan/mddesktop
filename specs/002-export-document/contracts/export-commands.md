# Contract: Export IPC commands

Se suman a [001 ipc-commands](../../001-markdown-desktop-editor/contracts/ipc-commands.md); se invocan solo desde `src/services/ipc.ts`. Errores: `AppError` de 001 (`INVALID_ARGUMENT`, `NOT_AUTHORIZED`, `DISK_FULL`, `PERMISSION_DENIED`, `IO`).

| Comando | Entrada | Salida | Reglas |
|---|---|---|---|
| `pick_export_path` | `{ format: "html"\|"pdf"\|"docx"\|"odt", suggestedName: string, directory?: string }` | `string \| null` | Diálogo nativo de guardado con filtro del formato y nombre sugerido + extensión; `null` si se cancela. La ruta devuelta (con la extensión forzada) se registra como ruta de exportación autorizada. La confirmación de sobrescritura la hace el diálogo |
| `write_export` | `{ path: string, dataBase64: string }` | `{ bytes: number }` | `path` debe estar autorizada por `pick_export_path` y tener extensión `html\|pdf\|docx\|odt`; si no → `NOT_AUTHORIZED`/`INVALID_ARGUMENT`. Decodifica base64 (inválido → `INVALID_ARGUMENT`), tamaño máximo 256 MiB, escritura atómica (temp en el mismo directorio + rename). La autorización se consume al escribir |

## Eventos

Ninguno nuevo. La acción de menú viaja por `menu://action` con ids `export.html`, `export.pdf`, `export.docx`, `export.odt`.

## Seguridad

- El frontend no puede escribir en rutas no elegidas por el usuario.
- Las extensiones permitidas son solo de salida; nunca `.md`, `.exe`, scripts, etc.
- Sin acceso de lectura nuevo: la exportación no lee archivos por estos comandos (las imágenes se leen por el protocolo `asset:` ya limitado a la carpeta del documento).
