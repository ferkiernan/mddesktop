# Implementation Plan: Opción para desactivar el corrector ortográfico

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-11-15

## Resumen técnico

- Preferencia nueva `spellcheckDisabled` (booleano, `false` por defecto; archivos viejos sin el campo → `false`):
  `src-tauri/src/services/app_data.rs` (`#[serde(default)]`), `src/services/contracts.ts`, `DEFAULT_PREFS` en `src/features/settings/store.ts`.
- Menú: casilla `settings.toggleSpellcheck` "Desactivar corrector ortográfico" en "Configuración", debajo de "Historial de versiones"
  (`src-tauri/src/services/menu.rs`). `set_view_menu` recibe un tercer valor para sincronizar su marca (`commands/app.rs`, `state.rs`, `ipc.ts`).
- `toggleSpellcheck()` en `appearance.ts`; `menuBridge.ts` lo despacha.
- Editor: `EditorAdapter` pone `spellcheck="false"` en su contenedor cuando la opción está marcada (el atributo se hereda al área editable;
  el editor no fija `spellcheck` propio). Sin marcar no pone el atributo → comportamiento actual. Sin remontar el editor.
- Pruebas: Rust (valor por defecto, archivo viejo, guardado), UI Playwright (atributo según la preferencia), nativa (menú → preferencia → atributo).
