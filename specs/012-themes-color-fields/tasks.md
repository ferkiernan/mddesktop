---
description: "Tareas: campos de color compactos en Temas"
---

# Tasks: Campos de color compactos en "Temas"

- [X] T001 [US1] Botón de restablecer con icono, `title` "Restablecer", `aria-label` "Restablecer {campo}", mismo renglón y hueco reservado, en `src/features/themes/ThemesPanel.tsx` y `src/app/theme.css`
- [X] T002 [US2] Cuadro de valor a ~la mitad del ancho (150 → 80 px) en `src/app/theme.css`
- [X] T003 [US3] Selector de color siempre visible: resolver cualquier color CSS (nombres, `hsl()`, degradados → primer color) en `pickerValue`, en `src/features/themes/ThemesPanel.tsx`
- [X] T004 Playwright: campo modificado en un renglón con el botón a la derecha; ayuda y nombre accesible; restablecer funciona; ancho del cuadro; "Fondo de la barra de pestañas" con selector aun con barra en formato no hex, en `tests/e2e/ui/themes-zoom.spec.ts`
