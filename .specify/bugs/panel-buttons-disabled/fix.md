# Bug Fix: Botones principales con aspecto de deshabilitados

- **Slug**: panel-buttons-disabled
- **Fixed**: 2026-11-15
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Los botones principales (Exportar…, Aplicar, Guardar de los diálogos…) se pintaban con el "acento" derivado de `--mdw-button-active-bg`, que en los estilos claros es un gris de botón presionado (Default: `#c8c8c8`) con texto blanco: parecían deshabilitados aunque funcionaban. Ahora el acento es `--mdw-accent` del estilo (Default `#3d6fd8`) y el texto se elige por contraste. Los botones realmente deshabilitados tienen su propio aspecto (opacidad 0,45, cursor "no permitido") y "Guardar"/"Eliminar" de Temas explican por qué están deshabilitados.

Durante la verificación visual apareció un segundo defecto: la vista previa PDF del panel de exportación no mostraba las páginas (la CSP no admite imágenes `blob:`). Se usan URLs `data:`, ya permitidas.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/features/settings/applyStyle.ts` | modified | `chromeOf`: acento = `--mdw-accent`; nuevo `accentFg` por contraste; variable `--accent-fg` |
| `src/app/theme.css` | modified | botón principal con `var(--accent-fg)` y negrita; `button:disabled` con aspecto propio |
| `src/features/themes/ThemesPanel.tsx` | modified | `title` explicativo en Guardar y Eliminar |
| `src/features/export/ExportPanel.tsx` | modified | páginas de vista previa como `data:` (no `blob:`), claves estables |
| `tests/unit/accent.spec.ts` | added | acento = `--mdw-accent` y texto legible (≥ 3:1) en los 7 estilos |
| `tests/e2e/ui/themes-zoom.spec.ts` | added test | botón principal azul (no gris) y opacidad 1 cuando está habilitado |

## Deviations from Assessment

- La evaluación suponía que el botón estaba deshabilitado por la vista previa; la persona aclaró que el botón funcionaba pero **se veía** gris. La causa real es el color de acento. No se cambió cuándo se habilita "Exportar…" (se habilita al terminar la vista previa, en < 1,5 s con documentos chicos).
- Alcance ampliado (registrado): vista previa PDF sin imágenes por la CSP (`blob:`), encontrado al verificar en la app real.

## Local Verification

- `npx vitest run` → 19 archivos, 150 pruebas OK.
- `npx playwright test` → todas OK (incluye la prueba nueva del acento).
- App real (WebView2): captura del panel de exportación con estilo Default: "Exportar…" azul con texto blanco; la página de vista previa se ve.
