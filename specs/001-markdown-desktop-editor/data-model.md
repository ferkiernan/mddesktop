# Data Model: Markdown Desktop Editor

**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Tipos expresados en TypeScript como contrato; los equivalentes Rust usan los mismos nombres (serde, `camelCase`). Toda entrada IPC se valida con Zod (frontend) y en Rust.

## FileFingerprint

Estado del archivo en disco en el último contacto (lectura o escritura propia).

| Campo | Tipo | Regla |
|---|---|---|
| `mtimeMs` | number | ms epoch |
| `size` | number | bytes |
| `hash` | string | xxh3-128 hex de los bytes leídos/escritos |

## EditorDocument (extiende el modelo del spec)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | UUID v4 generado en el frontend; único |
| `filePath` | string \| null | `null` hasta guardar; ruta canónica sin duplicados entre documentos (FR-003) |
| `fileName` | string | derivado de `filePath`; "Sin título N" si es nuevo |
| `content` | string | Markdown actual con `\n` (fuente de verdad) |
| `savedContent` | string | contenido en la última lectura/escritura |
| `isDirty` | boolean | derivado: `content !== savedContent` (no se almacena de forma independiente) |
| `lastModified` | number? | `fingerprint.mtimeMs` |
| `fingerprint` | FileFingerprint \| null | `null` si es nuevo |
| `encoding` | string | `"utf-8"` por defecto; otra si se detectó (FR-002b) |
| `bom` | boolean | se reaplica al guardar |
| `eol` | `"lf" \| "crlf"` | se reaplica al guardar (FR-013) |
| `externalState` | `"none" \| "modified" \| "removed"` | alimentado por eventos de Rust |
| `reloadSnapshot` | string \| null | solo fallback de FR-014a (R3); se descarta en la primera edición posterior |

### Transiciones de estado

```text
        new/open                edit                   save OK
(none) ─────────▶ CLEAN ─────────────▶ DIRTY ───────────────▶ CLEAN
                    │                    │
                    │ ext. change        │ ext. change
                    ▼                    ▼
              (aviso + recarga)      CONFLICT ──▶ [1 pisar]  ─▶ save forzado ─▶ CLEAN
                                                 [2 nueva pestaña] ─▶ nuevo doc sin ruta (original queda DIRTY)
                                                 [3 recargar aquí] ─▶ CLEAN (+ reloadSnapshot)
        ext. removed ─▶ externalState=removed ─▶ Guardar/Guardar como recrea el archivo
```

Reglas:
- Un `filePath` solo puede estar en un documento abierto (FR-003); Guardar como sobre una ruta abierta en otra pestaña exige resolver el conflicto (cerrar la otra o elegir otra ruta).
- `isDirty` se recalcula en cada `onChange`; si el usuario deshace hasta igualar `savedContent`, vuelve a limpio.
- Guardar sin cambios no escribe (FR-013).

## Tab

| Campo | Tipo | Regla |
|---|---|---|
| `documentId` | string | 1:1 con documento |
| `order` | number | posición; se reordena por arrastre |

`TabState` global: `tabs: Tab[]`, `activeDocumentId: string | null`, `editorPool: string[]` (LRU de documentos con editor montado, R2).

## Session (`session.json`, escrito por Rust)

| Campo | Tipo | Regla |
|---|---|---|
| `version` | 1 | para migraciones |
| `tabs` | `{ documentId, filePath \| null, fingerprint \| null, hasRecovery }[]` | en orden |
| `activeDocumentId` | string \| null | FR "recordar última pestaña activa" |
| `savedAt` | number | ms epoch |

Los contenidos no guardados **no** van en `session.json`: viven en `recovery/`.

## RecoveryEntry (`recovery/<docId>.md` + `<docId>.json`)

| Campo | Tipo | Regla |
|---|---|---|
| `documentId` | string | |
| `filePath` | string \| null | |
| `baseFingerprint` | FileFingerprint \| null | huella del disco cuando se empezó a editar; permite detectar que el archivo cambió durante la ausencia |
| `eol`, `encoding`, `bom` | — | para restaurar el guardado fiel |
| `writtenAt` | number | |

Se elimina al guardar, descartar o cerrar sin guardar. Al restaurar, si `baseFingerprint` ≠ huella actual del disco se marca `externalState="modified"` (no se sobrescribe sin aviso).

## Preferences (`settings.json`)

| Campo | Tipo | Valor por defecto / validación |
|---|---|---|
| `theme` | `"light" \| "dark"` | sigue el SO en el primer arranque |
| `uiZoom` | number | 1.0; rango 0.7–2.0 |
| `statusBarVisible` | boolean | true |
| `lastDirectory` | string \| null | |
| `editorPoolSize` | number | 3; rango 1–8 |
| `largeFileWarnBytes` | number | 5 242 880 (a confirmar con S1; FR-002a) |

Tamaño y posición de ventana los guarda `window-state`.

## AuthorizedPaths (solo en Rust, en memoria)

Conjunto de rutas canónicas autorizadas. Se agrega únicamente desde orígenes confiables en Rust: diálogo nativo, argumentos de línea de comandos / segunda instancia, evento de arrastre del SO, y rutas del `session.json` propio. El frontend nunca puede añadir rutas. Los directorios de `assets` se autorizan a partir de la ruta de un documento ya autorizado.

## ImageAsset

| Campo | Tipo | Regla |
|---|---|---|
| `sourcePath` | string | elegido en diálogo |
| `targetRelativePath` | string | `assets/<nombre>` relativo al documento, con `/` |
| `copied` | boolean | |
| `existedBefore` | boolean | si existía un archivo homónimo → requiere confirmación (FR-026) |

## AppError (contrato de errores IPC)

`{ code, message, details? }` con `code` ∈ `NOT_AUTHORIZED`, `NOT_FOUND`, `PERMISSION_DENIED`, `INVALID_ARGUMENT`, `NOT_MARKDOWN`, `TOO_LARGE`, `ENCODING_UNDETECTABLE`, `ENCODING_CONVERSION_REQUIRED`, `EXTERNAL_CONFLICT`, `DISK_FULL`, `IO`. Ver [contracts/ipc-commands.md](contracts/ipc-commands.md).
