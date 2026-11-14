# Data Model: 005

- **Preferences.exportStyle**: `"screen"` | id de estilo (`[a-z0-9-]{1,32}`); default `"screen"`.
- **ExportPreview** (memoria): `{ generation, styleId, format, pages: string[] (blob:) | html, bytes, warnings }`; se descarta (y se revocan los `blob:`) al cerrar el panel o recalcular.
- **Block** (paginate): `{ top, bottom, keepWithNext? }` (también renglones y filas).
- **TableInfo**: `{ top, bottom, headerBottom, headerHtml }`.
- **PageSlice**: `{ index, top, height, header?: { html, height } }`.
