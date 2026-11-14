# Bug Verification: Diagramas Mermaid invisibles al exportar con estilos oscuros

- **Slug**: pdf-mermaid-missing
- **Tested**: 2026-11-14
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

El caso reproducido (estilos oscuros + diagrama sin relleno) ya no ocurre: en Dark, Winamp, Terminal y Anthropic los diagramas de flujo y de secuencia salen legibles en las páginas exportadas (build con mdwysiwyg 0.8.0). Queda `partial` porque el reporte original ("no renderiza") no se confirmó con la persona: puede tener otra causa.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproducción tras el arreglo | exportación DOCX (mismas páginas que PDF/ODT) de flujo + secuencia con dark, winamp, terminal, anthropic sobre el exe de prueba | pass | líneas, flechas y textos ("Hola", "Chau") legibles; Terminal revisado a ojo esta vez |
| Prueba añadida | `npx vitest run tests/unit/editor-styles.spec.ts` | pass | 11/11 (incluye contraste fondo Mermaid ≥ 4,5:1) |
| Regresión | suites completas de la spec 003 (127 Vitest, 36 Rust, 42 Playwright, 7 nativas) | pass | ejecutadas al cerrar la 003 |
| Lint / tipos | `npx tsc --noEmit`, `npm run lint` | pass | idem |

## Residual Risks

- El síntoma reportado puede ser otro (estilo claro con diagrama ausente, binario instalado anterior, diagrama con error de sintaxis que cae a código).
- Los estilos propios (spec 004) deberán respetar el mismo contraste (requisito ya incluido en 004 FR-009).

## Recommendation

Mantener abierto hasta que la persona confirme que el PDF ya muestra sus diagramas con la app instalada actual; si no, reabrir con su documento y `/speckit-bug-assess`.
