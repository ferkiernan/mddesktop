# Contract: IPC Commands (frontend → Rust)

Todos los comandos son Tauri Commands. El frontend los invoca **solo** a través de `src/services/` (nunca desde componentes). Argumentos y respuestas se validan con Zod en el frontend y con tipos `serde` + validación explícita en Rust. Errores: `AppError` ([data-model.md](../data-model.md)).

Regla transversal: cualquier `path` recibido debe pertenecer a `AuthorizedPaths` (canonicalizado, sin `..`, extensión `.md`/`.markdown`); si no → `NOT_AUTHORIZED`. Ningún comando ejecuta procesos ni acepta rutas arbitrarias del frontend para autorizar.

## Documentos

| Comando | Entrada | Salida | Notas |
|---|---|---|---|
| `pick_open_files` | — | `string[]` (vacío si se cancela) | Diálogo nativo, filtro `.md`/`.markdown`, multi-selección; autoriza las rutas elegidas. Arranca en `lastDirectory` |
| `read_document` | `{ path, acceptLarge?: boolean }` | `{ path, content, encoding, bom, eol, fingerprint }` | `content` con `\n`. Si `size > largeFileWarnBytes` y no `acceptLarge` → `TOO_LARGE` con `details.size`. Codificación indetectable → `ENCODING_UNDETECTABLE` |
| `pick_save_path` | `{ suggestedName, directory? }` | `string \| null` | Diálogo nativo "Guardar como"; autoriza la ruta; confirmación de sobrescritura la hace el diálogo nativo |
| `write_document` | `{ path, content, eol, bom, encoding, convertToUtf8?: boolean, expectedFingerprint: FileFingerprint \| null, overwriteExternal?: boolean }` | `{ fingerprint }` | Ver reglas abajo |
| `stat_document` | `{ path }` | `{ exists, fingerprint? }` | Calcula hash solo si `mtime/size` difieren del último conocido en Rust |
| `watch_documents` | `{ paths: string[] }` | `void` | Reemplaza el conjunto observado; ver evento `fs://external-change` |

Reglas de `write_document`:
1. Si `expectedFingerprint` no es `null` y la huella actual difiere y no `overwriteExternal` → `EXTERNAL_CONFLICT` (nada se escribe). Con `overwriteExternal: true` se escribe (opción "Pisar", FR-014).
2. Si `encoding` ≠ `utf-8` y no `convertToUtf8` → `ENCODING_CONVERSION_REQUIRED` (nada se escribe).
3. Si los bytes resultantes son idénticos a los del disco → no escribe, devuelve la huella actual (FR-013).
4. Escritura: temp en el mismo directorio → `sync_all` → `rename` sobre el destino. Ante error el original queda intacto (SC-006). Aplica `eol` y `bom`.
5. El primer guardado de un documento nuevo usa `expectedFingerprint: null` y falla con `EXTERNAL_CONFLICT` si el destino ya existe sin que el diálogo nativo lo haya confirmado (flag `isNewFile`).

## Sesión, recuperación y preferencias

| Comando | Entrada | Salida |
|---|---|---|
| `session_load` | — | `Session \| null` (+ reautoriza rutas del propio `session.json`) |
| `session_save` | `Session` | `void` (atómico) |
| `recovery_write` | `{ documentId, filePath, content, baseFingerprint, eol, encoding, bom }` | `void` |
| `recovery_list` | — | `RecoveryEntry[]` con `content` |
| `recovery_delete` | `{ documentId }` | `void` |
| `settings_load` | — | `Preferences` (con valores por defecto si faltan/corrupto) |
| `settings_save` | `Partial<Preferences>` | `Preferences` (validada: rangos de [data-model.md](../data-model.md)) |

## Imágenes (US7, depende de U2/U3 en `mdwysiwyg`)

| Comando | Entrada | Salida |
|---|---|---|
| `pick_image` | — | `string \| null` (autoriza lectura de esa imagen) |
| `import_image` | `{ documentPath, sourcePath, overwrite?: boolean }` | `{ relativePath, copied, existedBefore }` — si existe homónimo y no `overwrite` → `copied:false, existedBefore:true` sin tocar nada |
| `resolve_image_url` | `{ documentPath, relativePath }` | `string` (URL `asset:` válida solo dentro del directorio del documento) |

## Aplicación

| Comando | Entrada | Salida | Notas |
|---|---|---|---|
| `confirm_exit` | — | `void` | El frontend lo invoca tras resolver los pendientes; cierra la app |
| `get_launch_files` | — | `string[]` | Archivos pasados por argumentos al arrancar (ya autorizados); se consume una vez |

## Versionado del contrato

El contrato vive en este documento y en `src/services/contracts.ts` (Zod) + `src-tauri/src/commands/` (serde). Todo cambio incompatible actualiza ambos lados y este archivo en el mismo PR; los tests de contrato (Rust y Vitest) comparten fixtures JSON en `tests/fixtures/ipc/`.
