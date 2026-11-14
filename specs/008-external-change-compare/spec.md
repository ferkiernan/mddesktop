# Feature Specification: Comparar al detectar cambios externos

**Feature Branch**: `008-external-change-compare`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Cambiar el comportamiento cuando el archivo fue modificado desde afuera: primero preguntar si desea ABRIR de nuevo el archivo, COMPARAR (opción principal) o IGNORAR los cambios; si desea comparar, activar el modo comparación y cargar cada texto donde corresponde."

**Depende de**: `003-upgrade-mdwysiwyg` (el modo comparación del editor existe desde la versión 0.4.0; la aplicación usa hoy la 0.3.1). **Modifica**: `001-markdown-desktop-editor` FR-014 y su caso límite (las opciones ante un cambio externo).

## Contexto verificado (2026-11-14)

- Hoy, si el archivo cambia en disco y el documento **no** tiene cambios locales, se pregunta "¿Recargar el contenido?" con **Ignorar** / **Recargar** (recarga deshacible con Ctrl+Z).
- Si **sí** tiene cambios locales, se muestra el conflicto con **Cancelar** / **Pisar archivo** / **Abrir versión del disco en otra pestaña** / **Recargar aquí** (spec 001, FR-014).
- Si el archivo se elimina o se mueve, solo se avisa que "Guardar lo recreará".
- El editor ofrece, desde la versión 0.4.0, un modo comparación: contenido original (solo lectura) y contenido nuevo (editable) lado a lado, con las diferencias resaltadas y los botones "Rechazar cambio", "Aceptar cambio" y "Restaurar".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir qué hacer cuando el archivo cambió afuera (Priority: P1)

Cuando otro programa modifica un archivo abierto, la aplicación pregunta qué hacer con tres opciones: **Comparar** (opción principal), **Abrir de nuevo** y **Ignorar cambios**. La misma pregunta aparece haya o no cambios locales sin guardar.

**Why this priority**: Es el punto de entrada del cambio pedido y reemplaza las dos preguntas actuales por una sola, más clara.

**Independent Test**: Abrir un archivo, modificarlo con otro editor y comprobar el diálogo; repetir con cambios sin guardar en la aplicación.

**Acceptance Scenarios**:

1. **Given** un documento abierto, **When** el archivo cambia en disco, **Then** se muestra un diálogo con el nombre del archivo y las opciones "Comparar" (principal, preseleccionada con Enter), "Abrir de nuevo" e "Ignorar cambios".
2. **Given** el documento tiene cambios sin guardar, **When** aparece el diálogo, **Then** se indica que hay cambios locales sin guardar y se muestran las mismas tres opciones.
3. **Given** el diálogo, **When** se pulsa Escape o se cierra, **Then** equivale a "Ignorar cambios" (nunca se pierde contenido).
4. **Given** el diálogo, **When** se elige "Abrir de nuevo", **Then** el documento carga la versión del disco, queda sin cambios pendientes y Ctrl+Z restaura el contenido anterior (como hoy).
5. **Given** el diálogo, **When** se elige "Ignorar cambios", **Then** el documento conserva su contenido, queda marcado como distinto del disco y el próximo guardado avisa antes de reemplazar la versión del disco.
6. **Given** el archivo eliminado o movido (no modificado), **When** se detecta, **Then** se mantiene el aviso actual ("Guardar lo recreará"); no se ofrece comparar.

---

### User Story 2 - Comparar la versión de la aplicación con la del disco (Priority: P1)

Al elegir "Comparar", el documento entra en modo comparación: a un lado el contenido que tiene la aplicación (original, solo lectura) y al otro la versión del disco (nueva, editable), con las diferencias resaltadas. La persona decide: **Aceptar cambio** (quedarse con la versión del disco, con los retoques que haya hecho), **Rechazar cambio** (quedarse con la versión de la aplicación) o **Restaurar** (deshacer sus retoques en la versión del disco).

**Why this priority**: Es la opción principal pedida y la que evita perder trabajo de cualquiera de los dos lados.

**Independent Test**: Con cambios locales y un cambio externo distinto, elegir Comparar, verificar qué texto aparece en cada lado y los resaltados; aceptar y comprobar el contenido; repetir rechazando.

**Acceptance Scenarios**:

1. **Given** "Comparar" elegido, **When** se abre la comparación, **Then** el lado original (solo lectura) muestra el contenido actual de la aplicación (incluidos los cambios sin guardar) y el lado nuevo (editable) muestra la versión actual del disco, con las palabras y bloques distintos resaltados en ambos lados.
2. **Given** la comparación abierta, **When** se pulsa "Aceptar cambio", **Then** el documento queda con el contenido del lado nuevo; si es idéntico al del disco queda **sin** cambios pendientes, si se retocó queda **modificado**; y el modo comparación termina.
3. **Given** la comparación abierta, **When** se pulsa "Rechazar cambio", **Then** el documento conserva el contenido de la aplicación, queda modificado respecto del disco y el próximo guardado avisa antes de reemplazar la versión del disco.
4. **Given** el lado nuevo retocado, **When** se pulsa "Restaurar", **Then** vuelve a la versión del disco tal como se cargó.
5. **Given** la comparación, **When** se alterna entre vista renderizada y Markdown, **Then** la comparación y los resaltados se mantienen en ambas vistas.
6. **Given** la comparación terminada (aceptar o rechazar), **When** se usa Ctrl+Z, **Then** se puede deshacer la decisión y volver al contenido previo.

---

### User Story 3 - La comparación convive con el resto de la aplicación (Priority: P2)

Mientras un documento está en comparación, se puede cambiar de pestaña, trabajar en otros documentos y volver; guardar, cerrar o salir no pierden ninguna de las dos versiones.

**Why this priority**: Una comparación puede llevar tiempo; no debe bloquear la aplicación ni arriesgar datos.

**Independent Test**: Iniciar una comparación, cambiar a otra pestaña, editar otro documento, volver y decidir; intentar guardar, cerrar la pestaña y salir durante la comparación.

**Acceptance Scenarios**:

1. **Given** un documento en comparación, **When** se cambia de pestaña y se vuelve, **Then** la comparación sigue abierta con el mismo contenido y retoques.
2. **Given** un documento en comparación, **When** se pulsa Guardar, **Then** la aplicación pide primero decidir (Aceptar o Rechazar) antes de escribir en disco; no guarda una mezcla.
3. **Given** un documento en comparación, **When** se cierra la pestaña o la aplicación, **Then** se aplica el flujo normal de cierre sobre el contenido de la aplicación (el original), y la versión del disco no se toca.
4. **Given** la aplicación se cierra inesperadamente durante una comparación, **When** se vuelve a abrir, **Then** se recupera el contenido de la aplicación como modificado (como hoy) y, si el archivo sigue distinto del disco, se vuelve a ofrecer el diálogo de cambio externo.
5. **Given** un documento en comparación, **When** se exporta, **Then** se exporta el contenido de la aplicación (el original) y se avisa de que hay una comparación pendiente.
6. **Given** la pestaña de un documento en comparación, **When** se observa, **Then** muestra un indicador visible de "comparación pendiente".

---

### User Story 4 - Cambios repetidos y casos raros (Priority: P3)

Si el archivo vuelve a cambiar en disco durante la comparación, o se elimina, la aplicación lo informa y permite actualizar la comparación sin perder retoques por sorpresa.

**Why this priority**: Programas que guardan varias veces seguidas (sincronizadores, generadores) son habituales.

**Independent Test**: Iniciar la comparación, cambiar otra vez el archivo y comprobar el aviso y la actualización; eliminar el archivo durante la comparación.

**Acceptance Scenarios**:

1. **Given** una comparación abierta, **When** el archivo vuelve a cambiar en disco, **Then** se avisa en la comparación y se ofrece "Actualizar con la última versión del disco"; si la persona había retocado el lado nuevo, se pide confirmación antes de reemplazarlo.
2. **Given** varios cambios del archivo en poco tiempo, **When** se detectan, **Then** se muestra un único diálogo (no uno por cada cambio) con la versión más reciente.
3. **Given** una comparación abierta, **When** el archivo se elimina o se mueve, **Then** se avisa; "Aceptar cambio" sigue disponible con el contenido del lado nuevo y el documento queda modificado (Guardar recreará el archivo).
4. **Given** un archivo que cambió en disco pero cuyo contenido es idéntico al de la aplicación, **When** se detecta, **Then** no se muestra ningún diálogo.

---

### Edge Cases

- El cambio externo llega mientras otro diálogo está abierto (guardar como, conflicto de otro archivo): se encola y se muestra al cerrarse el anterior, uno por archivo.
- El cambio llega a un documento en una pestaña no activa: el diálogo se muestra al activar esa pestaña (o de inmediato si la aplicación lo hace hoy así; se mantiene el comportamiento actual de momento de aviso).
- Archivos grandes (por encima del umbral de aviso de tamaño): la comparación puede tardar; se muestra progreso y se puede cancelar volviendo al diálogo.
- Cambio de codificación o de finales de línea sin cambio de texto visible: se trata como idéntico si el texto es el mismo; si cambia solo el final de línea, se informa en el diálogo.
- Archivo de solo lectura tras el cambio: "Aceptar" funciona; guardar avisa como hoy.
- Un documento que ya está en comparación por otro motivo: no aplica (solo existe esta entrada a la comparación en esta función).
- Diferencias enormes (archivo reescrito por completo): la comparación se muestra igual; los resaltados pueden cubrir bloques enteros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al detectar que un archivo abierto cambió en disco (con contenido distinto del de la aplicación), el sistema MUST mostrar un único diálogo con tres opciones: "Comparar" (principal), "Abrir de nuevo" e "Ignorar cambios", indicando si hay cambios locales sin guardar. Este diálogo MUST reemplazar los dos diálogos actuales (sin cambios locales / conflicto).
- **FR-002**: Cerrar el diálogo o pulsar Escape MUST equivaler a "Ignorar cambios".
- **FR-003**: "Abrir de nuevo" MUST cargar la versión del disco en la misma pestaña, dejar el documento sin cambios pendientes y permitir restaurar el contenido anterior con Ctrl+Z.
- **FR-004**: "Ignorar cambios" MUST conservar el contenido de la aplicación, marcarlo como distinto del disco y hacer que el siguiente guardado avise antes de reemplazar la versión del disco (sin sobrescritura silenciosa).
- **FR-005**: "Comparar" MUST activar el modo comparación del editor en esa pestaña con el contenido de la aplicación (incluidos cambios sin guardar) como original de solo lectura y la versión del disco como contenido nuevo editable, con las diferencias resaltadas en ambas vistas.
- **FR-006**: "Aceptar cambio" MUST dejar el documento con el contenido del lado nuevo; el documento MUST quedar sin cambios pendientes si ese contenido es idéntico al del disco y modificado en caso contrario. "Rechazar cambio" MUST conservar el contenido de la aplicación con el mismo efecto que FR-004. "Restaurar" MUST devolver el lado nuevo a la versión del disco cargada.
- **FR-007**: Las decisiones de la comparación MUST poder deshacerse con Ctrl+Z.
- **FR-008**: Mientras un documento está en comparación MUST mostrarse un indicador en su pestaña; Guardar MUST pedir primero una decisión; cerrar o salir MUST aplicar el flujo normal de cierre sobre el contenido de la aplicación; exportar MUST usar el contenido de la aplicación y avisar.
- **FR-009**: Cambiar de pestaña MUST conservar la comparación en curso (contenidos y retoques) hasta que se decida.
- **FR-010**: Si el archivo vuelve a cambiar durante una comparación, el sistema MUST avisar y ofrecer actualizar el lado nuevo con la última versión, pidiendo confirmación si hay retoques; si se elimina o mueve, MUST avisar y mantener disponible "Aceptar cambio".
- **FR-011**: Varios cambios seguidos del mismo archivo MUST producir un único diálogo con la versión más reciente; un cambio sin diferencia de texto MUST NOT mostrar diálogo.
- **FR-012**: Tras un cierre inesperado durante una comparación, la recuperación MUST restaurar el contenido de la aplicación como modificado y volver a ofrecer el diálogo si el archivo sigue distinto del disco.
- **FR-013**: En ningún caso MUST perderse la versión de la aplicación ni la del disco sin una decisión explícita; ninguna opción MUST escribir en disco por sí sola.
- **FR-014**: El caso de archivo eliminado o movido sin comparación en curso MUST mantener el comportamiento actual.

### Key Entities

- **Cambio externo**: aviso de que el archivo en disco tiene un contenido distinto del conocido por la aplicación; lleva la versión del disco más reciente.
- **Comparación pendiente**: estado de un documento con el contenido de la aplicación (original), la versión del disco cargada (nueva) y los retoques hechos en ella, hasta que se acepta o rechaza.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de las pruebas de cambio externo (con y sin cambios locales) aparece el diálogo de tres opciones con "Comparar" como opción principal, y ningún diálogo cuando el contenido no cambió.
- **SC-002**: Tras "Comparar", ambos textos aparecen en el lado correcto (aplicación = original, disco = nuevo) y las diferencias resaltadas coinciden con las diferencias reales en el 100 % de los documentos de prueba.
- **SC-003**: En 0 de las pruebas (aceptar, rechazar, ignorar, abrir de nuevo, cerrar, salir, cierre inesperado) se pierde la versión de la aplicación o la del disco sin decisión explícita, y en 0 se escribe en disco sin guardar explícito.
- **SC-004**: La comparación de un documento de 100 KB se muestra en menos de 2 segundos tras elegir "Comparar".
- **SC-005**: Diez cambios del mismo archivo en menos de 2 segundos producen exactamente un diálogo.
- **SC-006**: Una persona resuelve un cambio externo con cambios locales (comparar y aceptar o rechazar) en menos de 1 minuto sin documentación.

## Assumptions

- Esta función **reemplaza** las opciones de la spec 001 FR-014 ("Pisar archivo" y "Abrir versión del disco en otra pestaña" desaparecen): "pisar" equivale a "Ignorar cambios" + Guardar, y la comparación sustituye a abrir otra pestaña. Se enmendará 001 FR-014 y su caso límite al planificar.
- Lado de cada texto: original = aplicación (lo que la persona estaba viendo), nuevo = disco (la propuesta que llega de afuera). Es el uso natural del modo comparación del editor (original vs. propuesta).
- Orientación inicial: lado a lado (predeterminado del editor), con desplazamiento sincronizado.
- El momento en que se muestra el aviso (pestaña activa o no) se mantiene como hoy.
- El estado de comparación no se guarda entre sesiones; tras reabrir la aplicación se vuelve a ofrecer el diálogo si corresponde.
- Requiere la actualización del editor de la spec 003 (modo comparación disponible en la versión publicada que se adopte).
- Se mantienen los criterios del proyecto: trabajo local, pruebas unitarias, de interfaz y nativas (con un archivo modificado por otro proceso en la aplicación real) y no subir al remoto hasta que la persona lo indique.
