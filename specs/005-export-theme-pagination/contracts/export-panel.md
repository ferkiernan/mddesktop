# Contract: panel de exportación

- `openExportPanel({ format, markdown, title, documentId }): Promise<{ bytes, warnings } | null>`; `null` = cancelado.
- IPC: `settings_save({ patch: { exportStyle } })`; sin comandos nuevos.
- `withViewer(markdown, fn, documentId?, styleVars?)`: con `styleVars` usa la clase `mdd-export-editor` y declara las variables en el contenedor; siempre `--mdw-content-zoom: 1`.
- `buildExport(markdown, format, title, onProgress?, documentId?, styleVars?)`: devuelve `{ bytes, warnings, pages?, html? }` (`pages` = JPEG por página para PDF/DOCX/ODT; `html` para la vista continua).
