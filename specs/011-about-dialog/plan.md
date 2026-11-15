# Implementation Plan: Menú Ayuda → Acerca de

**Branch**: `011-about-dialog` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

## Summary

Menú nativo "Ayuda" al final con `help.about` ("Acerca de MD Desktop…"). El frontend muestra un diálogo modal (`src/features/about/AboutDialog.tsx`) con el logo (ícono de 256 px generado desde `logo_principal.png`, empaquetado), "MD Desktop", versión y fecha de compilación (`__APP_VERSION__` desde `package.json` y `__BUILD_DATE__`, inyectados por Vite en cada build), autor, enlace al repositorio, crédito a mdwysiwyg (MIT, @ferkiernan) y "Para más información". Los enlaces llaman al comando Rust `open_about_link(which)`, que solo acepta `project`/`library`/`author` y abre la URL fija en el navegador predeterminado (`explorer.exe <url>` en Windows, sin shell).

## Technical Context

TypeScript/React + Rust. Sin dependencias nuevas (no se añade el plugin opener: un comando con lista cerrada basta). Pruebas al final.

## Constitution Check

| Principio | Evaluación |
|---|---|
| V Security | PASS: lista cerrada de 3 URLs; ningún argumento del frontend llega al sistema; sin shell |
| VIII Offline | PASS: el diálogo es local; solo un clic explícito abre el navegador |
| IX Simplicity | PASS: sin dependencia nueva |

## Structure

```text
src-tauri/src/services/menu.rs        # menú Ayuda
src-tauri/src/commands/app.rs         # about_link, open_about_link (+ prueba)
src-tauri/src/platform/{mod,windows}.rs  # open_url
src/features/about/{AboutDialog.tsx,aboutStore.ts}
vite.config.ts, src/vite-env.d.ts     # __APP_VERSION__, __BUILD_DATE__
src/services/{contracts,ipc}.ts, src/app/{menuBridge.ts,App.tsx,theme.css}
```
