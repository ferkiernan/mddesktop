# Implementation Plan: Zoom del contenido y tamaño de las barras

**Branch**: `007-content-zoom-bar-size` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Summary

Se elimina el zoom de toda la ventana (`zoom` en `<html>`) y se reemplaza por **zoom del contenido** conducido por la app: preferencia `contentZoom` (50–300 %, pasos de 5 %), aplicada como `--mdw-content-zoom` solo a `.editor-slot .mdd-editor` (los editores visibles; mdwysiwyg 0.8.0 escala texto, imágenes, tablas, código y diagramas sin tocar su barra). Ctrl++/−/0 y el menú Ver ("Acercar/Alejar contenido", "Tamaño normal del contenido") lo cambian; Ctrl+rueda sobre el área de contenido también (acumulando ruedas finas; Ctrl+rueda nunca activa el zoom propio del WebView). El valor se ve en la barra de estado (o un aviso si está oculta). El zoom del editor (`allowContentZoom`, pasos de 10 %) queda apagado.

**Tamaño de barras**: preferencia `barScale` (75–200 %), un único control en el panel Temas que escala la barra de pestañas (`--mdd-bar-scale` en CSS) y la barra de herramientas del editor con sus menús (`--mdw-toolbar-scale`).

El visor de exportación está fuera de `.editor-slot` y fija `--mdw-content-zoom: 1` (spec 005): la exportación no se ve afectada. Migración: `uiZoom` guardado ⇒ `contentZoom` (Rust, una vez). Enmienda 001 FR-017.

## Constitution Check

Todo PASS; IX: se usa la variable pública de mdwysiwyg 0.8.0 (sin clases internas, principio III).

## Structure

```text
src/features/settings/zoom.ts       # pasos, límites, CSS, Ctrl+rueda, anclaje del scroll
src/features/settings/store.ts      # aplica zoom y escala en lugar de `zoom` global
src/features/settings/appearance.ts # zoomIn/zoomOut/zoomReset → contenido
src-tauri/src/services/app_data.rs  # contentZoom, barScale, migración desde uiZoom
src-tauri/src/services/menu.rs      # textos del menú Ver
src/ui/StatusBar.tsx, src/app/theme.css, src/app/App.tsx, src/features/shortcuts/manager.ts
src/features/themes/ThemesPanel.tsx # "Ajuste tamaño de barra"
```
