# Contract: Local Storage Formats

Ubicación: directorio de datos de la aplicación del usuario (resuelto por Tauri). Todo se escribe desde Rust con escritura atómica (temp + rename). Lectura tolerante: ante JSON inválido o `version` desconocida, el archivo se renombra a `*.corrupt-<timestamp>` y se usan valores por defecto (no se bloquea el arranque).

```text
<appData>/
├── settings.json
├── session.json
└── recovery/
    ├── <documentId>.md      # contenido no guardado (UTF-8, LF)
    └── <documentId>.json    # metadatos
```

## settings.json

```json
{ "version": 1, "theme": "dark", "uiZoom": 1.0, "statusBarVisible": true,
  "lastDirectory": "C:\\Users\\...\\docs", "editorPoolSize": 3, "largeFileWarnBytes": 5242880 }
```

## session.json

```json
{ "version": 1, "savedAt": 1793580000000, "activeDocumentId": "…uuid…",
  "tabs": [ { "documentId": "…", "filePath": "C:\\docs\\a.md",
              "fingerprint": { "mtimeMs": 1793570000000, "size": 1234, "hash": "…" },
              "hasRecovery": true } ] }
```

## recovery/<documentId>.json

```json
{ "version": 1, "documentId": "…", "filePath": "C:\\docs\\a.md" ,
  "baseFingerprint": { "mtimeMs": 1793570000000, "size": 1234, "hash": "…" },
  "eol": "crlf", "encoding": "utf-8", "bom": false, "writtenAt": 1793580000000 }
```

## Reglas

- `session.json` se actualiza al abrir/cerrar/reordenar/activar pestañas (con debounce corto), no por temporizador periódico.
- `recovery/*` se escribe ~4 s tras el último cambio y al cambiar de pestaña; se borra al guardar, descartar o cerrar sin guardar.
- Un `recovery` huérfano (sin entrada en sesión) se ofrece igualmente para recuperar al arrancar.
- Ningún archivo guarda contenido que no sea del usuario; no hay telemetría (Principio VIII).
- Las rutas de `session.json` se reautorizan solo al cargarlo desde Rust; el frontend no puede añadir rutas autorizadas.
