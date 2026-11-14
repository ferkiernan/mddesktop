# Implementation Plan: Exportación a Word con contenido editable

**Branch**: `006-native-docx-export` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Summary

Word (`.docx`) y OpenDocument (`.odt`) dejan de ser imágenes de página. El visor oculto (el mismo de 002/005, con el estilo elegido) se recorre y se convierte en un **documento estructurado** (encabezados, párrafos con formato, listas, tareas, citas, código con colores, tablas, imágenes, separadores, enlaces) con los colores y tipografías calculados por el navegador. Dos escritores sin dependencias generan OOXML y ODF a partir de ese modelo, empaquetados con el ZIP propio de 002. Los diagramas Mermaid se rasterizan a PNG; las imágenes se incrustan con sus bytes originales (o PNG si el formato no es admitido por Word).

## Technical Context

**Language/Version**: TypeScript 5.9 (frontend). Sin cambios en Rust.
**Primary Dependencies**: ninguna nueva (ZIP propio, `DOMParser`/canvas del WebView).
**Testing**: Vitest (modelo → XML: encabezados, listas, tablas con `tblHeader`/`cantSplit`, hipervínculos, imágenes, escape XML; ODT equivalente), nativa `export.cdp.mjs` (estructura del paquete, XML bien formado, texto extraído = texto del documento). Ejecución al final de la codificación.
**Constraints**: A4, márgenes 15 mm; contraste ≥ 4,5:1 (se corrige el texto si hace falta); fuentes comunes con sustituto; PDF/HTML sin cambios.

## Constitution Check

I PASS (sin dependencias; carga bajo demanda) · II PASS · III PASS (no toca el `.md`) · IV PASS (sin parciales) · V PASS (XML escapado; sin contenido activo) · VI PASS (`features/export/native/`) · VII PASS · VIII PASS · IX PASS.

## Project Structure

```text
src/features/export/native/
├── model.ts   # DOM del visor → documento estructurado (+ tema, imágenes, avisos)
├── docx.ts    # documento estructurado → .docx (document, styles, numbering, settings, rels, media)
├── odt.ts     # documento estructurado → .odt (content, styles, manifest, Pictures)
├── color.ts   # colores, contraste y fuentes comunes
└── build.ts   # entrada usada por exportDocument.ts
```
