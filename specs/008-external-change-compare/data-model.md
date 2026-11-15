# Data Model: 008

EditorDocument suma:

| Campo | Tipo | Uso |
|---|---|---|
| compare | ReadResult o null | versión del disco propuesta mientras dura la comparación |
| ignoredHash | string o null | hash de la versión del disco ignorada o rechazada |

Transiciones: sin comparación → (Comparar) `compare` → (Aceptar) limpio o modificado, línea base = disco · (Rechazar) `externalState = modified` + `ignoredHash`. (Ignorar) `externalState = modified` + `ignoredHash`. (Abrir de nuevo) recarga con `reloadSnapshot` para Ctrl+Z.
