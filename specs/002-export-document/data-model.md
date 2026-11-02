# Data Model: Exportar documento

**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

## ExportFormat

`"html" | "pdf" | "docx" | "odt"` — extensión de archivo = formato. Etiquetas del menú: Página web (.html), PDF (.pdf), Word (.docx), OpenDocument (.odt).

## ExportJob (en memoria, no se persiste)

| Campo | Tipo | Regla |
|---|---|---|
| `format` | ExportFormat | elegido en el menú |
| `documentId` | string | documento activo al iniciar |
| `markdown` | string | contenido capturado al iniciar (incluye cambios sin guardar); no cambia durante la exportación |
| `styleId` | string | estilo de editor vigente al iniciar |
| `suggestedName` | string | nombre del documento sin extensión (o "Documento") |
| `destination` | string \| null | ruta devuelta por el diálogo; `null` si se cancela |
| `status` | `"preparing" \| "rendering" \| "writing" \| "done" \| "cancelled" \| "failed"` | ver transiciones |
| `page` / `pages` | number | progreso en los formatos paginados |
| `warnings` | string[] | p. ej. imágenes omitidas (FR-013) |

### Transiciones

```text
(menú) ─▶ [diálogo] ─cancelar─▶ cancelled (sin archivos, sin error)
              │ ruta
              ▼
          preparing ─▶ rendering (páginas) ─▶ writing ─▶ done (aviso con la ruta)
              │              │                  │
              └──────────────┴──────────────────┴─▶ failed (mensaje; nada parcial en disco)
```

## Snapshot

Resultado de la instantánea del visor: `{ html: string (fragmento con estilos en línea), pageBackground: string, contentWidthPx: number, blocks: { top: number; bottom: number }[], warnings: string[] }`. `blocks` son los límites verticales de los bloques de primer nivel (y filas de tabla) usados para paginar.

## PageSlice

`{ index: number; top: number; height: number }` en píxeles CSS del contenido; `height` ≤ área útil de página (1123 − 2×márgenes). Producidas por `paginate`.

## RenderedPage

`{ index: number; jpeg: Uint8Array; width: 1588; height: 2246 }` (A4 a escala 2×).

## Constantes A4

| Nombre | Valor |
|---|---|
| Ancho / alto de página | 210 × 297 mm = 794 × 1123 px CSS (96 dpi) = 595.28 × 841.89 pt |
| Margen | 15 mm ≈ 57 px |
| Área útil | 680 × 1009 px |
| Escala de rasterizado | 2× (1588 × 2246 px) |
| EMU (DOCX) | 7 560 000 × 10 692 000 |

## ExportPathRegistry (solo Rust, memoria)

Conjunto de rutas devueltas por el diálogo de exportación; `write_export` solo acepta rutas de este conjunto con extensión permitida. Se consume al escribir (una escritura por autorización).
