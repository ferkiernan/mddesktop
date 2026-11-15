# Contract: zoom y menú

- `settings_save({ patch: { contentZoom } | { barScale } })`: Rust sanea al rango y al paso de 5 %.
- Menú Ver: `view.zoomIn` "Acercar contenido (Ctrl++)", `view.zoomOut` "Alejar contenido (Ctrl+-)", `view.zoomReset` "Tamaño normal del contenido (Ctrl+0)".
- Atajos: Ctrl++ / Ctrl+= / Ctrl+Shift++ / teclado numérico, Ctrl+-, Ctrl+0; Ctrl + rueda sobre el contenido.
