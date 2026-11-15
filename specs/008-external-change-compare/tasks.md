---
description: "Tareas: comparar al detectar cambios externos"
---

# Tasks: Comparar al detectar cambios externos

**Tests**: se escriben con el código y se ejecutan al terminar toda la codificación.

- [X] T001 Estado `compare`/`ignoredHash` y acciones del store en `src/features/documents/types.ts` y `src/features/documents/store.ts`
- [X] T002 [US1] Diálogo único (Ignorar cambios / Abrir de nuevo / Comparar) y sincronización silenciosa si el contenido coincide en `src/features/documents/conflictActions.ts`
- [X] T003 [US2] Modo comparación en `src/features/editor/EditorAdapter.tsx` (original = aplicación, nuevo = disco; aceptar/rechazar; Ctrl+Z)
- [X] T004 [US3] Guardar con comparación pendiente, confirmación al reemplazar una versión ignorada/rechazada (`src/features/documents/actions.ts`), indicador en pestaña (`src/features/tabs/Tab.tsx`), aviso al exportar
- [X] T005 [US4] Re-cambio durante la comparación (actualizar con confirmación si hay retoques), eliminación, no repetir para una versión ignorada (`conflictActions.ts`, `externalChanges.ts`)
- [X] T006 Enmienda de 001 FR-014 registrada en `specs/001-markdown-desktop-editor/spec.md` (Assumptions)
- [X] T007 [P] Vitest: store (aceptar limpio/modificado, rechazar, ignorar, sincronizar) y diálogo (opciones, Escape = ignorar, sin diálogo si es igual) en `tests/unit/conflict.spec.ts`
- [X] T008 [P] Playwright: cambio externo → Comparar → aceptar / rechazar, guardar con comparación pendiente, indicador en pestaña, en `tests/e2e/ui/data-protection.spec.ts`

## Hallazgo del análisis (2026-11-15)

- [X] T009 [US3] FR-012: al restaurar tras un cierre inesperado un archivo que cambió en disco, se conserva la huella anterior (guardar detecta el conflicto, no pisa en silencio) y se ofrece el diálogo de cambio externo sin bloquear el arranque, en `src/features/session/restore.ts`
- [X] T010 [P] Prueba: recuperación con archivo cambiado en disco ⇒ diálogo ofrecido; "Ignorar cambios" + Guardar pide confirmación, en `tests/unit/recovery-session.spec.ts`
