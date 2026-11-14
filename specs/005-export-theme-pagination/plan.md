# Implementation Plan: Estilo y paginación fiable al exportar

**Branch**: `005-export-theme-pagination` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Summary

Archivo → Exportar abre primero un **panel de exportación** (lista de estilos + vista previa) y solo después el diálogo de guardado. La vista previa construye los bytes finales una sola vez con el estilo elegido y "Exportar" escribe **esos mismos bytes** (vista previa = archivo, FR-004). El estilo de exportación se aplica al visor oculto con variables en su contenedor (sin la clase del estilo activo). La paginación del PDF gana: ajuste de elementos anchos/altos (reducción proporcional; código con salto de línea), cortes entre renglones con control de líneas sueltas y repetición del encabezado de tabla en las páginas de continuación.

## Technical Context

**Language/Version**: TypeScript 5.9 + React 18.3; Rust estable (una preferencia nueva)
**Primary Dependencies**: ninguna nueva
**Storage**: `settings.json` → `exportStyle` (id de estilo o `"screen"`)
**Testing**: Vitest (paginate con renglones/tablas, opciones de estilo), Playwright (flujo del panel), nativa `export.cdp.mjs` (sin cortes, encabezado repetido, estilo elegido). Se ejecutan al terminar toda la codificación (preferencia de la persona).
**Target Platform**: Windows 10/11 (WebView2)
**Performance Goals**: vista previa de 10 páginas < 5 s; se cede el hilo entre páginas
**Constraints**: offline; el estilo del editor no cambia; Word/ODT: vista previa continua aproximada (la spec 006 los vuelve nativos)

## Constitution Check

| Principio | Evaluación |
|---|---|
| I. Lightweight | PASS: sin dependencias; páginas de vista previa como `blob:` liberadas al cerrar |
| II. Native | PASS: Rust sigue escribiendo; preferencia nueva validada en Rust |
| III. Markdown First | PASS: el documento no se toca |
| IV. Data Integrity | PASS: sin archivos parciales; cancelar no escribe |
| V. Security | PASS: `exportStyle` saneado (patrón de id) |
| VI. Modularity | PASS: panel en `features/export/ExportPanel.tsx`; paginación pura en `paginate.ts` |
| VII. Testing | PASS: pruebas nuevas y existentes al final |
| VIII. Offline | PASS |
| IX. Simplicity | PASS: un único render para vista previa y archivo |

## Project Structure

```text
src/features/export/
├── ExportPanel.tsx      # nuevo: panel modal (estilos, vista previa, Exportar/Cancelar)
├── exportStyles.ts      # nuevo: opciones ("Como en pantalla" + estilos)
├── exportDocument.ts    # flujo: panel → bytes → diálogo nativo → escribir
├── viewer.ts            # variables de estilo explícitas y zoom 1
├── fit.ts               # nuevo: ajuste de anchos/altos y avisos de reducción
├── paginate.ts          # renglones, líneas sueltas, filas, encabezado repetido
└── rasterize.ts         # dibuja el encabezado repetido
src-tauri/src/services/app_data.rs   # exportStyle
src/services/contracts.ts, src/features/settings/store.ts
src/app/App.tsx, src/app/theme.css   # host del panel y estilos
```

## Complexity Tracking

Sin violaciones.
