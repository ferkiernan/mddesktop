# Bug Fix: "Aplicar" del panel Temas parecía siempre deshabilitado

- **Slug**: themes-apply-disabled
- **Fixed**: 2026-11-15
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Mismo origen que `panel-buttons-disabled`: "Aplicar" (botón principal) se pintaba con un gris de botón presionado y texto blanco, así que se veía deshabilitado aunque estuviera habilitado. Corregido con el acento real del estilo (ver `../panel-buttons-disabled/fix.md`).

## Deviations from Assessment

- La evaluación proponía dejar "Aplicar" siempre habilitado. Tras la aclaración de la persona ("funciona igual pero se ve grisado"), la causa es visual; se mantiene la regla actual (gris solo cuando el estilo elegido ya es el activo y sin cambios), ahora con un aspecto de deshabilitado distinto y reconocible.

## Tests Added or Updated

- `tests/e2e/ui/themes-zoom.spec.ts` › "primary buttons use the style accent…" — "Aplicar" habilitado tiene el color de acento y opacidad 1.

## Local Verification

- `npx playwright test tests/e2e/ui/themes-zoom.spec.ts` → 7 OK.
