---
description: "Tareas: menú Ayuda → Acerca de"
---

# Tasks: Menú Ayuda → Acerca de

**Tests**: se escriben y ejecutan al terminar la codificación (indicación de la persona).

- [X] T001 [US1] Menú "Ayuda" con "Acerca de MD Desktop…" en `src-tauri/src/services/menu.rs`; acción `help.about` en `src/services/contracts.ts` y `src/app/menuBridge.ts`
- [X] T002 [US1] Versión y fecha de compilación inyectadas en el build (`vite.config.ts`, `src/vite-env.d.ts`)
- [X] T003 [US1] Diálogo `src/features/about/AboutDialog.tsx` (logo, versión, fecha, autor, enlaces, crédito mdwysiwyg MIT @ferkiernan, Cerrar/Escape, foco) y host en `src/app/App.tsx`; estilos en `src/app/theme.css`
- [X] T004 [US1] Comando `open_about_link` con lista cerrada y `platform::open_url` (`src-tauri/src/commands/app.rs`, `src-tauri/src/platform/`), IPC en `src/services/ipc.ts`; prueba Rust de la lista cerrada
- [X] T005 [P] Playwright: el menú abre el diálogo con versión, fecha, autor y textos; cada enlace llama a `open_about_link` con su id; Escape cierra, en `tests/e2e/ui/about.spec.ts`
- [X] T006 Nativa: el menú "Ayuda" existe y el diálogo muestra la versión del ejecutable (`tests/e2e/native/about.cdp.mjs`)
