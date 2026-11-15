# Bug Verification: botones principales se ven grisados

- **Slug**: themes-apply-disabled
- **Tested**: 2026-11-15
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

En la app real (exe de prueba, WebView2) los botones principales usan el color de acento de cada estilo con texto legible y opacidad 1; solo un botón realmente deshabilitado se ve atenuado (opacidad 0,45). Sin regresiones en las suites.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproducción en la app real | script CDP: por cada uno de los 7 estilos incluidos abre Exportar → PDF y Temas, lee color/opacidad de "Exportar…" y "Aplicar" | pass | "Exportar…" habilitado y con acento en los 7 estilos (p. ej. Default rgb(61,111,216)/blanco, Winamp rgb(206,201,64)/negro) |
| "Aplicar" habilitado (Temas) | `npx playwright test tests/e2e/ui/themes-zoom.spec.ts` | pass | botón azul y opacidad 1 al elegir otro estilo; en la app real se midió solo el estado inicial (deshabilitado, opacidad 0,45, mismo acento) |
| Tests nuevos | `npx vitest run tests/unit/accent.spec.ts` | pass | acento = `--mdw-accent`, texto ≥ 3:1 en los 7 estilos |
| Regresión | `npm test` (151), `playwright --project=ui` (55), `cargo test` (43), suites nativas (styles, export, export-long, recovery, editor-options, images, shortcuts, os-integration, about) | pass | — |
| Lint / tipos | `npm run lint`, `tsc --noEmit` | pass | — |

## Residual Risks

- Estilos propios con acento muy claro: el texto se elige por contraste (negro/blanco), pero el botón puede confundirse con el fondo del diálogo.
- "Exportar…" sigue deshabilitado mientras se genera la vista previa (por diseño); con documentos muy largos o diagramas puede tardar segundos.

## Recommendation

Cerrar el bug — verificado en la app real y en las suites.
