# Bug Fix: Diagramas Mermaid invisibles al exportar con estilos oscuros

- **Slug**: pdf-mermaid-missing
- **Fixed**: 2026-11-14
- **Assessment**: ./assessment.md
- **Status**: applied (causa reproducida y corregida; el reporte original puede tener otra causa, ver Follow-ups)

## Summary

En los estilos oscuros ("Dark" y "Winamp") el fondo del diagrama Mermaid ahora es claro. Mermaid dibuja con su tema por defecto (trazos y textos oscuros); sobre fondo oscuro, los diagramas sin relleno (secuencia, etc.) quedaban casi invisibles en pantalla y en las exportaciones.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/features/settings/editorStyles.ts` | modified | `--mdw-mermaid-bg`: Dark `#1e293b` → `#e2e8f0`; Winamp `#2d275d` → `#e6e3f5`, con comentario del motivo |
| `tests/unit/editor-styles.spec.ts` | added test | contraste ≥ 4,5:1 entre `--mdw-mermaid-bg` y el color de trazo por defecto de Mermaid (`#333333`) en los 7 estilos |

## Diff Highlights (optional)

```diff
-      "--mdw-mermaid-bg": "#1e293b",
+      // light on purpose: Mermaid draws dark strokes/labels (default theme) that vanish on a dark card
+      "--mdw-mermaid-bg": "#e2e8f0",
```

## Tests Added or Updated

- `tests/unit/editor-styles.spec.ts` › "keeps the Mermaid background readable under Mermaid's default dark strokes (contrast >= 4.5:1)" — falló antes del arreglo (`dark (#1e293b)`: 1,16:1) y pasa después en los 7 estilos.

## Local Verification

- `npx vitest run tests/unit/editor-styles.spec.ts` → falla antes (1,16:1), pasa después (8/8).
- `npx tsc --noEmit` y `npm run lint` → sin errores.
- `npx vitest run` → 15 archivos, 122 pruebas pasan.
- Manual, app real (WebView2, exe de prueba reconstruido): exportación a DOCX (mismas páginas que PDF/ODT) de un diagrama de flujo y uno de secuencia con estilos Dark y Winamp. Antes: secuencia con líneas y textos casi invisibles. Después: fondo claro, líneas, flechas y textos ("Hola", "Chau") claramente legibles.
- Sin ejecutar esta vez: pruebas de interfaz Playwright y pruebas nativas completas (solo la exportación manual descrita).

## Deviations from Assessment

- La evaluación proponía además una prueba nativa con muestreo de píxeles sobre las páginas exportadas; no se añadió en este arreglo (la protección quedó en la prueba unitaria de contraste). El tema de Mermaid propio del editor (alternativa) no se tocó.
- `terminal` (`#93a59a`) pasa el umbral de contraste, pero no se inspeccionó visualmente ni por prueba nativa.

## Follow-ups

- **Confirmar con la persona que reportó** si era este caso (estilo oscuro + diagrama sin relleno). Si el diagrama falta por completo con un estilo claro, hay otra causa y hay que reproducir con su documento y con el binario instalado (el probado fue el de desarrollo).
- Prueba nativa con muestreo de píxeles en `tests/e2e/native/export.cdp.mjs` (hoy solo valida estructura de archivos, no contenido de las páginas).
- Solicitud al editor (`docs/upstream-requests.md`): opción de tema de Mermaid (p. ej. `mermaidTheme` o tema oscuro automático) para poder tener diagramas oscuros sobre fondo oscuro.
- Recorte lateral de diagramas anchos: se trata en la spec 005.
- Falta regenerar el instalador y actualizar la app instalada con este cambio.
