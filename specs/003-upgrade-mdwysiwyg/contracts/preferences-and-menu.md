# Contract: preferencias y menú (003)

## IPC

- `settings_save({ patch })` — sin cambios de firma; `patch` admite `editorToolbarVisible: boolean` y `editorHistory: boolean`. Respuesta: `Preferences` saneadas.
- `set_view_menu({ toolbar: boolean, history: boolean })` — **nuevo**. Sincroniza el estado de los dos `CheckMenuItem`. Sin efecto en disco. Validación: dos booleanos.

## Menú nativo

| Menú | Id | Texto | Tipo |
|---|---|---|---|
| Ver | `view.toggleToolbar` | Mostrar barra de herramientas | check (default marcado) |
| Configuración | `settings.toggleHistory` | Historial de versiones | check (default marcado) |

`MenuAction` (zod, `src/services/contracts.ts`) añade ambos ids. `menuBridge` los traduce a `toggleEditorToolbar()` / `toggleEditorHistory()` (`appearance.ts`), que guardan la preferencia; el store aplica las props a todos los editores y llama `set_view_menu`.

## Props del editor (adaptador)

| Prop | Origen | Notas |
|---|---|---|
| `showToolbar` | `prefs.editorToolbarVisible` | alternar no remonta (garantía del editor) |
| `historyUndo` | `prefs.editorHistory` | se cierra solo si la barra se oculta |
| `resolveImageSrc` | `makeImageResolver(documentId)` | ahora tipada |
| `mode`, `autoHideBar`, `autoHeight`, `allowContentZoom` | — | no se pasan (apagadas) |

El visor de exportación no recibe `showToolbar`/`historyUndo` (usa `onlyView`).
