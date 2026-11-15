# Implementation Plan: Color de fondo de la barra de pestañas

**Branch**: `010-tab-bar-color` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

## Summary

Nuevo color base opcional `tabsBg` en los estilos propios (modo básico; también en el avanzado como `--mdd-tabs-bg`). `deriveVars` lo emite solo si está definido; `chromeOf` calcula `tabsBg` (propio o, si falta, el degradado de la barra de herramientas como hoy) y `tabsFg` por contraste (`accentText`); `applyEditorStyle` publica `--tabs-bg`/`--tabs-fg`, que usa solo la barra de pestañas (la barra de estado sigue con `--bar-bg`). Rust admite la clave base `tabsBg` (y `--mdd-*` ya era válido).

## Technical Context

TypeScript/React + Rust (validación). Sin dependencias. Pruebas al final de la codificación.

## Constitution Check

PASS en todos los principios (valor validado como los demás colores; sin cambios de almacenamiento).

## Structure

```text
src/features/themes/derive.ts        # BaseColors.tabsBg, --mdd-tabs-bg, grupo avanzado
src/features/themes/ThemesPanel.tsx  # campo básico opcional con valor de partida y Restablecer; vista previa
src/features/settings/applyStyle.ts  # chrome.tabsBg/tabsFg, --tabs-bg/--tabs-fg
src/app/theme.css                    # barra de pestañas y pestañas inactivas
src-tauri/src/services/custom_styles.rs  # clave base tabsBg
```
