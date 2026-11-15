# Implementation Plan: Estilos incluidos en negrita

**Branch**: `009-builtin-styles-bold` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

## Summary

En la lista del panel Temas (`src/features/themes/ThemesPanel.tsx`) el nombre de los estilos incluidos se envuelve en `.theme-builtin` (negrita) y el texto "(estilo incluido)" pasa a un `span.sr-only` (solo tecnologías de asistencia). Se conserva " · activo". CSS en `src/app/theme.css`. Sin cambios de datos ni de Rust. Constitución: PASS (accesibilidad mantenida).
