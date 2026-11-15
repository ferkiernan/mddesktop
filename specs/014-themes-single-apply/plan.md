# Implementation Plan: Un solo botón "Aplicar" en "Temas"

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-11-15

## Resumen técnico

- `src/features/themes/ThemesPanel.tsx`:
  - Quitar el botón "Guardar" del pie.
  - "Aplicar": `title` "Guarda los cambios y aplica el estilo" (o "Este estilo ya está aplicado" cuando está deshabilitado). Sigue usando `apply()` = `save()` si hay cambios + `setEditorStyle()`; si `save()` falla no aplica.
  - `confirmLeave`: título "Cambios sin aplicar", botones Cancelar / Descartar / Aplicar (valor `apply` → `save()` + `setEditorStyle(selected)` antes de continuar).
- Pruebas UI de `themes-zoom.spec.ts` que pulsaban "Guardar" pasan a usar solo "Aplicar"; la del aviso al cerrar usa el nuevo título. Por pedido de la persona, no se ejecutan en esta entrega.
