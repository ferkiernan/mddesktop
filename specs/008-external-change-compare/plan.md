# Implementation Plan: Comparar al detectar cambios externos

**Branch**: `008-external-change-compare` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Summary

`resolveExternalChange` lee primero la versión del disco: si coincide con el contenido de la aplicación, sincroniza en silencio; si no, muestra un único diálogo **Ignorar cambios / Abrir de nuevo / Comparar** (principal). "Comparar" guarda la versión del disco en el documento (`compare`) y el adaptador del editor activa el modo comparación de mdwysiwyg (≥ 0.4): original = contenido de la aplicación (lo que el editor tiene), nuevo = disco (`compareContent`). `onCompareDecision` resuelve: aceptar ⇒ contenido nuevo, línea base = disco (limpio si son iguales), Ctrl+Z vía `reloadSnapshot`; rechazar ⇒ se conserva la versión de la aplicación y el siguiente guardado pide confirmación antes de reemplazar el disco. Guardar durante una comparación pide decidir; exportar avisa; la pestaña muestra "⇄".

## Technical Context

TypeScript/React; sin cambios en Rust. mdwysiwyg 0.8.0 (`mode`, `compareContent`, `compareOrientation`, `compareSyncScroll`, `onCompareDecision`). Pruebas al final de toda la codificación.

## Constitution Check

IV Data Integrity: ninguna opción escribe en disco; la versión del disco nunca se pisa sin confirmación (`confirmReplaceDiskVersion`). IX: se usa el modo comparación del editor, no se reimplementa. Resto PASS.

## Structure

```text
src/features/documents/types.ts          # compare, ignoredHash
src/features/documents/store.ts          # startCompare, restartCompare, acceptCompare, rejectCompare, ignoreDiskVersion, syncWithDisk
src/features/documents/conflictActions.ts# diálogo único, re-cambio durante la comparación, confirmación al reemplazar
src/features/documents/actions.ts        # guardar: comparación pendiente / versión ignorada
src/features/documents/externalChanges.ts# no repetir el diálogo para una versión ignorada
src/features/editor/EditorAdapter.tsx    # props de comparación
src/features/tabs/Tab.tsx                # indicador "Comparación pendiente"
src/features/export/exportDocument.ts    # aviso al exportar
```

Limitación aceptada: si el editor de esa pestaña se descarta del pool de 3, al volver la comparación se reanuda desde la versión del disco (se pierden los retoques no decididos).
