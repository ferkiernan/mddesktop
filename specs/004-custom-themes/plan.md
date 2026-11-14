# Implementation Plan: Estilos propios y panel "Temas"

**Branch**: `004-custom-themes` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Summary

Configuración → **Temas…** abre un panel modal grande (aclaración 2026-11-14): lista de estilos (incluidos de solo lectura + propios), editor de colores (modo **Básico**: fondo, texto, acento, bordes, barra y tipografía, del que se derivan todas las variables; modo **Avanzado**: todas las variables agrupadas, con selector gráfico y valor escrito, marcando las personalizadas y con "Restablecer"), avisos de contraste (texto ≥ 4,5:1, código ≥ 3:1, fondo de diagramas vs. trazo de Mermaid) y una vista previa en vivo con el editor real y una barra de pestañas de ejemplo. También aloja "Ajuste tamaño de barra" (spec 007).

Los estilos propios se guardan en `styles.json` (Rust, escritura atómica, validación de nombres/valores; archivo dañado ⇒ se aparta y se usan los incluidos). Un catálogo en el frontend los registra en `applyStyle` (hoja de estilos con ámbito), en el panel de exportación y en el menú nativo (sección propia al final de "Estilo del editor", reconstruida al vuelo).

## Technical Context

TypeScript/React + Rust. Sin dependencias nuevas. Valores admitidos: colores, degradados, listas de fuentes y números (sin `;{}<>\`, ni `url(`), validados en Rust y en zod porque se inyectan en una hoja de estilos.

## Constitution Check

I PASS (panel y vista previa se cargan bajo demanda; sin segunda ventana) · II PASS (Rust guarda; comandos `styles_load`, `styles_save`, `set_custom_styles_menu`) · IV PASS (escritura atómica; borrar pide confirmación) · V PASS (validación de valores contra inyección CSS) · VI PASS (`features/themes/`) · IX PASS.

## Structure

```text
src-tauri/src/services/custom_styles.rs     # styles.json: carga, validación, guardado
src-tauri/src/commands/{session,app}.rs     # styles_load/save, set_custom_styles_menu
src/features/themes/derive.ts               # básico → variables; grupos avanzados; avisos de contraste
src/features/themes/catalog.ts              # catálogo, persistencia, registro y menú
src/features/themes/ThemesPanel.tsx         # panel modal
src/features/themes/{themesPanelStore,ThemesPanelHost}.ts(x)
src/features/settings/applyStyle.ts         # estilos incluidos + propios
```
