# Research: comparar ante cambios externos

## R1 — Lados de la comparación
- **Decision**: original (solo lectura) = contenido de la aplicación; nuevo (editable) = versión del disco, con `mode="compare"` + `compareContent` de mdwysiwyg.
- **Rationale**: la versión del disco es la propuesta que llega de afuera; aceptarla la incorpora, rechazarla la descarta.

## R2 — Persistencia de la comparación
- **Decision**: estado en el documento (`compare`), no persistido; si el editor se descarta del pool, la comparación se reanuda desde la versión del disco (se pierden los retoques no decididos).

## R3 — Seguridad de los datos
- **Decision**: ninguna opción escribe en disco; tras ignorar o rechazar, guardar pide confirmación antes de reemplazar la versión del disco; guardar durante la comparación pide decidir primero.

## R4 — Repeticiones
- **Decision**: `ignoredHash` evita repetir el diálogo para la misma versión; contenido idéntico = sincronización silenciosa.
