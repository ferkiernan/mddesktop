---
description: "Tareas: casilla para desactivar el corrector ortográfico"
---

# Tasks: Opción para desactivar el corrector ortográfico

- [X] T001 [US1] Preferencia `spellcheckDisabled` (por defecto `false`) en `src-tauri/src/services/app_data.rs` con prueba Rust (defecto, archivo viejo, guardado)
- [X] T002 [US1] Casilla `settings.toggleSpellcheck` en `src-tauri/src/services/menu.rs`; `set_view_menu` sincroniza su marca (`commands/app.rs`, `state.rs`)
- [X] T003 [US1] Contrato y valor por defecto en `src/services/contracts.ts`, `src/features/settings/store.ts`; `setViewMenu` en `src/services/ipc.ts`
- [X] T004 [US1] `toggleSpellcheck()` en `src/features/settings/appearance.ts` y caso en `src/app/menuBridge.ts`
- [X] T005 [US1] `spellcheck="false"` en el contenedor del editor según la preferencia, en `src/features/editor/EditorAdapter.tsx`
- [X] T006 Prueba UI en `tests/e2e/ui/` (atributo según la preferencia, sin remontar) y nativa en `tests/e2e/native/editor-options.cdp.mjs`
