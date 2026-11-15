# Bug Assessment: Botones principales grisados por defecto (Exportar y otros)

- **Slug**: panel-buttons-disabled
- **Created**: 2026-11-15
- **Source**: pasted text
- **Verdict**: likely valid, needs reproduction (con documento chico no reproduce; el diseño sí deja botones grisados sin explicación)
- **Severity**: medium (puede impedir exportar mientras se prepara la vista previa)

## Report (verbatim or summarized)

> el boton exportar por default esta siempre grisado. revisa si pasa tambien en otros botones.

## Symptom

En el panel de exportación, "Exportar…" aparece deshabilitado con el estilo por defecto ("Como en pantalla"). Esperado: poder exportar.

## Reproduction

App real (WebView2, exe de prueba con el código actual), documento chico (título, texto, tabla), estilo por defecto:

1. Archivo → Exportar → PDF: a 1,5 s "Exportar…" está **habilitado**, "Página 1 de 1".
2. Igual para HTML y Word (vista continua): **habilitado** a 1,5 s. Sin errores en consola.

No reproduce con ese documento. Por diseño, "Exportar…" está deshabilitado **hasta que termina la vista previa** (`disabled={!preview}`), que en PDF dibuja todas las páginas antes de mostrarse: con un documento largo, con imágenes o con diagramas (espera de Mermaid hasta 15 s) el botón puede quedar gris muchos segundos; y si la vista previa falla queda gris para siempre (solo se ve "Error: …" en la línea de estado).

[NEEDS CLARIFICATION: ¿cuánto mide el documento y qué contiene (imágenes, diagramas)? ¿Qué dice la línea de estado arriba a la derecha del panel mientras el botón está gris ("Página N de M…", "Preparando…", "Error: …")?]

## Otros botones con el mismo patrón (revisión pedida)

| Botón | Condición para estar gris | ¿Problema? |
|---|---|---|
| Exportar… (panel de exportación) | hasta que la vista previa termina; para siempre si falla | **Sí**: bloquea exportar mientras se prepara; sin salida si falla |
| Aplicar (Temas) | el estilo seleccionado es el activo y no hay cambios — estado inicial al abrir | **Sí**: ya evaluado en `themes-apply-disabled` |
| Guardar (Temas) | estilo incluido seleccionado o sin cambios | Esperable, pero sin explicación |
| Eliminar (Temas) | estilo incluido seleccionado | Esperable (los incluidos no se borran) |
| 100 % (tamaño de barra) | ya está en 100 % | Correcto |

El resto de botones de la app (diálogos, pestañas, menús nativos) no tiene deshabilitado condicional.

## Suspected Code Paths

- `src/features/export/ExportPanel.tsx:139` — `disabled={!preview}`.
- `src/features/export/ExportPanel.tsx` (efecto de vista previa) — la vista previa PDF espera a dibujar todas las páginas; un error deja `preview` en null.
- `src/features/export/viewer.ts` — espera de Mermaid hasta 15 s y de imágenes.
- `src/features/themes/ThemesPanel.tsx:385,388` — Guardar/Aplicar.

## Root Cause Hypothesis

El panel solo habilita "Exportar…" cuando la vista previa completa está lista, y no ofrece otra forma de avanzar ni explica la espera; en documentos medianos o grandes (o si la vista previa falla) el usuario lo ve "siempre gris". En Temas, "Aplicar"/"Guardar" se deshabilitan por estado sin indicarlo. Confianza: media.

## Proposed Remediation

**Preferred**:
- **Exportar…**: siempre habilitado. Si la vista previa aún no terminó, al pulsarlo el panel muestra "Exportando…" y espera al mismo proceso en curso (los bytes siguen siendo los de la vista previa, FR-004 de 005); si la vista previa falló, se reintenta y, si vuelve a fallar, se muestra el error en un diálogo (como antes de 005). La vista previa PDF muestra cada página en cuanto está lista (no al final).
- **Aplicar (Temas)**: siempre habilitado (ver `themes-apply-disabled`).
- **Guardar / Eliminar (Temas)**: se mantienen deshabilitados cuando no aplican, pero con `title` explicativo ("Los estilos incluidos no se modifican: usa Duplicar", "No hay cambios").

**Alternatives**:
- Mantener "Exportar…" deshabilitado pero con barra de progreso y texto "Preparando vista previa (página N de M)…" junto al botón: más simple, sigue obligando a esperar.

**Files likely to change**:
- `src/features/export/ExportPanel.tsx`, `src/features/export/exportDocument.ts`
- `src/features/themes/ThemesPanel.tsx`
- `tests/e2e/ui/export.spec.ts`, `tests/e2e/ui/themes-zoom.spec.ts`

**Tests to add or update**:
- "Exportar…" habilitado al abrir el panel; pulsarlo antes de que termine la vista previa exporta igualmente esos bytes.
- Vista previa que falla: "Exportar…" sigue disponible y el error se muestra.
- Temas: "Aplicar" habilitado al abrir; Guardar/Eliminar deshabilitados con `title`.

## Risks & Considerations

- Exportar antes de que termine la vista previa no debe lanzar un segundo proceso: se reutiliza el que está en curso.
- Mostrar páginas a medida que se dibujan cambia levemente la vista previa (aparece progresivamente).

## Open Questions

- [NEEDS CLARIFICATION: tamaño/contenido del documento y texto de la línea de estado del panel cuando el botón está gris.]
