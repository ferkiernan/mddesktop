# Feature Specification: Actualizar el editor a su última versión

**Feature Branch**: `003-upgrade-mdwysiwyg`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Actualizar MD Desktop a la última versión publicada de mdwysiwyg (descargarla de npm) y evaluar si hace falta alguna adaptación para la versión de escritorio (cambios de API, estilos, host API insertMarkdown/setMarkdown/resolveImageSrc, exportación, recuperación, pruebas, instalador)." Ampliado el 2026-11-14: exponer "Mostrar barra" e "Historial de versiones" (historia 6).

## Contexto verificado (2026-11-14)

- La última versión publicada del editor es la **0.8.0** (npm, etiqueta `latest`, revisado 2026-11-14). La aplicación declara `^0.3.0` y el último instalador se construyó con una copia local de la 0.3.1, que nunca se publicó en npm (las versiones publicadas saltan de 0.3.0 a 0.4.0). Entre ambas hay cinco versiones menores (0.4 a 0.8).
- 0.7.0 añade `--mdw-content-padding` (margen interno del contenido). 0.8.0 añade el zoom del contenido (`allowContentZoom`, `--mdw-content-zoom`), tamaños base de texto por vista y `--mdw-toolbar-scale`; los usa la spec 007. La API pública sigue cambiando solo con adiciones.
- La API pública cambió **solo con adiciones**: `showToolbar`, `autoHeight`, `autoHideBar`, modo de comparación (`mode`, `compareOrientation`, `compareContent`, `onCompareDecision`, `compareSyncScroll`), historial de versiones (`historyUndo`). Las propiedades y métodos que usa la aplicación (`initialContent`, `onlyView`, `resizable`, `width`, `height`, `className`, `resolveImageSrc`, `insertMarkdown`, `setMarkdown`, `onChange`) no cambian de nombre ni de tipo.
- El **tematizado cambió de mecanismo**: el editor ya no declara las variables `--mdw-*`; las lee, y se pueden declarar en cualquier ancestro. En 0.5.0 se añadieron 20 variables nuevas (resaltado de código, citas, enlaces, bordes y sombras de controles, paneles flotantes, menús, selector de tablas) cuyos valores por defecto son los de un tema claro.
- Los 7 estilos de la aplicación definen 19 variables; las 20 nuevas de 0.5.0 no están cubiertas (las de 0.7.0/0.8.0 son de tamaño y espaciado, con valores por defecto adecuados).
- El paquete publicado crece (JS ≈ +50 %, CSS ≈ +65 % respecto de la 0.3.1) y no añade dependencias nuevas.
- Cambios de comportamiento visibles: triángulo en la esquina de cada celda de tabla que abre el menú de columna/fila (reemplaza el segundo clic sobre la celda); los menús, diálogos y paneles flotantes se tematizan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La aplicación usa la última versión publicada del editor y se instala igual en cualquier equipo (Priority: P1)

La persona que mantiene la aplicación obtiene el editor desde su fuente pública, fija esa versión en el proyecto y reconstruye la aplicación y el instalador, sin depender de copias locales ni de archivos fuera del repositorio.

**Why this priority**: Hoy una instalación limpia del proyecto trae una versión del editor sin estilos (0.3.0) o distinta de la que se probó. Sin esto no hay build reproducible.

**Independent Test**: En una copia limpia del repositorio, instalar dependencias, construir y comprobar que la versión del editor empaquetada es la declarada y que la aplicación arranca con la barra de herramientas con estilo.

**Acceptance Scenarios**:

1. **Given** una copia limpia del repositorio, **When** se instalan las dependencias y se construye, **Then** el editor empaquetado es la 0.8.0 (o la última publicada al momento de ejecutar) y coincide con la versión declarada y bloqueada en el proyecto.
2. **Given** la versión actualizada, **When** se abre la aplicación, **Then** la barra de herramientas y el contenido se muestran con el estilo del editor activo (sin botones desnudos ni contenido sin formato).
3. **Given** el instalador regenerado, **When** se instala sobre la versión anterior, **Then** la aplicación abre, conserva ajustes, sesión y documentos recuperables, y muestra la versión nueva del editor.

---

### User Story 2 - Nada de lo que ya funciona se rompe (Priority: P1)

La persona usuaria sigue haciendo exactamente lo mismo que antes: abrir, editar, guardar, recuperar tras cierre, insertar imágenes, cambiar de estilo, exportar y recargar desde disco con deshacer, con el mismo resultado.

**Why this priority**: Es una actualización de una pieza central; el riesgo principal es una regresión silenciosa en funciones ya entregadas (001 y 002).

**Independent Test**: Ejecutar el conjunto completo de pruebas existentes (unitarias, de interfaz y nativas sobre la aplicación real) sin modificar sus expectativas y comprobar que todas pasan; repasar a mano los flujos que las pruebas no cubren.

**Acceptance Scenarios**:

1. **Given** la versión actualizada, **When** se ejecutan las pruebas existentes sin cambiar sus expectativas de comportamiento, **Then** todas pasan.
2. **Given** un documento con encabezados, tablas, código, tareas, imágenes locales y Mermaid, **When** se abre, se edita y se guarda, **Then** el Markdown resultante es idéntico al que producía la versión anterior para las mismas ediciones.
3. **Given** un documento con cambios sin guardar, **When** se cierra la aplicación y se vuelve a abrir, **Then** se restaura como modificado sin diálogo y con el mismo contenido.
4. **Given** un documento abierto, **When** se exporta a HTML, PDF, Word y OpenDocument, **Then** el resultado es el mismo en aspecto y paginación que antes de la actualización (ancho A4, saltos entre bloques, fondo y colores del estilo).
5. **Given** un documento abierto y el archivo cambiado en disco, **When** se elige recargar, **Then** el contenido se actualiza y Ctrl+Z lo restaura, como antes.

---

### User Story 3 - Los siete estilos siguen viéndose completos, incluidos los oscuros (Priority: P2)

Al elegir cualquiera de los siete estilos en Configuración → Estilo del editor, todo el editor adopta ese aspecto: barra, contenido, bloques de código con su resaltado, citas, enlaces, menús, diálogos y paneles flotantes. En estilos oscuros no queda ninguna parte con colores de tema claro (por ejemplo, el menú de columna de una tabla con fondo blanco o el resaltado de código ilegible).

**Why this priority**: Las variables nuevas tienen valores claros por defecto; sin adaptación, los estilos oscuros quedarían a medias. Es la adaptación visible más probable.

**Independent Test**: Para cada estilo, abrir un documento con código, cita, enlace y tabla; abrir los menús y diálogos del editor y comprobar legibilidad y coherencia; comparar con capturas de referencia.

**Acceptance Scenarios**:

1. **Given** un estilo oscuro activo, **When** se muestra un bloque de código resaltado, una cita, un enlace (visitado y no visitado), **Then** los colores son legibles sobre el fondo del estilo.
2. **Given** un estilo oscuro activo, **When** se abren el menú de una celda de tabla, el selector de tamaño de tabla o el diálogo de enlace, **Then** su fondo, texto, bordes y resaltado de selección siguen el estilo y son legibles.
3. **Given** el estilo predeterminado (claro), **When** se compara con la versión anterior, **Then** el aspecto es el mismo salvo diferencias intencionadas del editor (p. ej. triángulo de tabla).
4. **Given** cualquier estilo, **When** se cambia de estilo con documentos abiertos, **Then** se aplica al instante a todos los editores abiertos, sin recargar.
5. **Given** cualquier estilo, **When** se exporta, **Then** el documento exportado conserva los colores de ese estilo, incluido el resaltado de código y los enlaces.

---

### User Story 4 - Comportamientos nuevos del editor funcionan bien dentro de la aplicación de escritorio (Priority: P2)

Los cambios de comportamiento del editor que la persona usuaria nota (menú de tabla desde el triángulo de la esquina de la celda, menús tematizados, tecla de menú contextual) funcionan en la aplicación y no interfieren con los atajos, la barra de pestañas, la exportación ni el marcador de modificado.

**Why this priority**: Son cambios que no pidió pero que va a encontrar; no deben producir efectos colaterales (puntos de "modificado" falsos, triángulos en el documento exportado, atajos que dejan de responder).

**Independent Test**: Hover y clic sobre el triángulo de una celda, abrir y cerrar el menú, usar Escape y el teclado, y verificar que el marcador de modificado no aparece sin edición, que los atajos globales siguen respondiendo y que la exportación no incluye el triángulo.

**Acceptance Scenarios**:

1. **Given** una tabla en el editor, **When** se pasa el cursor por una celda y se hace clic en el triángulo, **Then** se abre el menú de columna/fila y, al cerrarlo sin elegir nada, el documento no queda marcado como modificado.
2. **Given** el menú de tabla abierto, **When** se pulsa un atajo global de la aplicación (guardar, cerrar pestaña, abrir), **Then** el atajo se comporta igual que con el menú cerrado o el menú se cierra primero, sin perder datos.
3. **Given** un documento con tablas, **When** se exporta a cualquier formato, **Then** el triángulo del menú de tabla no aparece en el resultado.
4. **Given** la edición de un documento, **When** se pulsan Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, **Then** deshacer y rehacer actúan como antes mientras el historial de versiones está cerrado (aunque la opción esté activada).

---

### User Story 5 - Tamaño y rendimiento dentro de los presupuestos del proyecto (Priority: P3)

La actualización no empeora de forma apreciable el arranque, la apertura de documentos ni la memoria, y el instalador sigue siendo ligero.

**Why this priority**: El paquete crece; el proyecto tiene presupuestos medidos (memoria < 250 MB con un documento, apertura de 100 KB en ≈ 0,4 s, instalador pequeño). Hay que confirmar que se mantienen, no asumirlo.

**Independent Test**: Repetir las mediciones de `docs/performance.md` con la versión nueva y comparar con las anteriores.

**Acceptance Scenarios**:

1. **Given** la versión actualizada y un documento abierto, **When** se mide la memoria privada de todo el árbol de procesos de la ventana, **Then** es menor que 250 MB.
2. **Given** un documento de 100 KB, **When** se abre, **Then** el tiempo hasta poder editar no empeora más de un 20 % respecto de la medición anterior.
3. **Given** el instalador regenerado, **Then** su tamaño y el del ejecutable se registran junto con los anteriores y la diferencia queda documentada.

---

### User Story 6 - Elegir qué opciones del editor se activan: barra de herramientas e historial de versiones (Priority: P2)

La persona usuaria decide desde los menús si ve la barra de herramientas del editor y si el editor guarda un historial de versiones del documento que puede recorrer. Las dos preferencias se recuerdan entre sesiones.

**Why this priority**: Son las dos capacidades nuevas del editor que la persona propietaria quiere exponer; el resto (barra auto-ocultable, alto automático, comparación) queda fuera.

**Independent Test**: Alternar cada opción desde el menú con un documento abierto y cambios sin guardar; comprobar que contenido, cursor y deshacer se conservan, cerrar y reabrir la aplicación y comprobar que la opción se mantiene.

**Acceptance Scenarios**:

1. **Given** un documento abierto, **When** se desactiva "Mostrar barra de herramientas" (menú Ver), **Then** la barra desaparece de todos los editores abiertos al instante, sin perder contenido, posición del cursor ni historial de deshacer, y sin marcar el documento como modificado.
2. **Given** la barra oculta, **When** se cierra y se vuelve a abrir la aplicación, **Then** sigue oculta; al reactivar la opción reaparece sin reiniciar.
3. **Given** "Historial de versiones" activado (menú Configuración), **When** se edita un documento y se deja de escribir unos segundos, **Then** aparece en la barra el botón de historial y se puede recorrer, avanzar, retroceder, confirmar o cancelar una versión.
4. **Given** el historial abierto, **When** se confirma una versión distinta de la actual, **Then** el documento queda marcado como modificado con ese contenido; si se cancela, el contenido vuelve al que tenía al abrir el historial.
5. **Given** una instalación nueva o una actualización sin preferencia guardada, **When** se abre un documento, **Then** el historial de versiones está **activado** (predeterminado) y el botón de historial aparece en la barra; al desactivarlo desaparece el botón y no hay ningún otro cambio respecto de hoy.
6. **Given** la barra oculta y el historial activado, **When** se intenta abrir el historial, **Then** la aplicación lo informa o lo cierra sin aplicar nada (el botón vive en la barra), sin pérdida de datos.

---

### Edge Cases

- El historial de versiones se guarda en memoria por editor: al cerrar una pestaña o cuando la aplicación descarta un editor inactivo, esas versiones se pierden. Debe quedar documentado en la ayuda de la opción y no se promete persistencia entre sesiones.
- La última versión publicada pasa a ser otra distinta de la 0.8.0 al momento de implementar: se usa la última publicada y se vuelve a evaluar la lista de cambios entre 0.8.0 y esa versión.
- Un estilo cuya variable nueva no esté definida: debe mostrarse con un valor coherente con el estilo, nunca con un color que lo haga ilegible.
- Documentos que ya existen con tablas muy anchas, bloques de código largos o Mermaid: se abren y se exportan igual que antes.
- Instalación sin red al reconstruir: el bloqueo de dependencias garantiza la misma versión; si no hay copia en caché, el fallo es explícito, no una versión distinta.
- Un editor en segundo plano (las pestañas mantienen hasta 3 editores montados): un cambio de estilo o de modo no debe dejar editores con el aspecto anterior.
- El visor oculto que usa la exportación recibe también los menús y paneles que ahora se tematizan: no deben aparecer en el resultado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El proyecto MUST declarar y bloquear la última versión publicada del editor desde su fuente pública, y una instalación limpia MUST producir exactamente esa versión, sin copias locales ni instalaciones sin guardar.
- **FR-002**: La aplicación MUST seguir ofreciendo todas las funciones de las especificaciones 001 y 002 con el mismo resultado observable; ninguna prueba existente MAY cambiar su expectativa de comportamiento para pasar (solo se admiten ajustes por cambios intencionados y documentados del editor).
- **FR-003**: Los siete estilos del editor MUST cubrir las variables de tema nuevas que afecten a legibilidad (resaltado de código, citas, enlaces, paneles flotantes, menús, selector de tablas, bordes y sombras de controles, color de peligro), con valores coherentes con cada estilo. El fondo de los diagramas Mermaid MUST tener contraste ≥ 4,5:1 con el trazo por defecto de Mermaid en todos los estilos (lección del bug `pdf-mermaid-missing`).
- **FR-004**: En todo estilo, todo elemento del editor y sus paneles flotantes (menús, diálogos, selector de tablas, lista de enlaces) MUST ser legible y respetar el fondo y los colores del estilo activo; la comprobación MUST incluir el contraste del texto sobre su fondo.
- **FR-005**: El tematizado de los estilos MUST seguir aplicándose al instante a todos los editores abiertos y al visor de exportación, con la misma fuente única de definición de estilos para la interfaz y para el menú nativo.
- **FR-006**: Las exportaciones (HTML, PDF, Word, OpenDocument) MUST seguir cumpliendo la especificación 002 con la versión nueva, incluido el color del resaltado de código, enlaces y citas del estilo activo, sin elementos de interfaz del editor (triángulo de tabla, barras, paneles) en el resultado.
- **FR-007**: El marcador de "modificado", la recuperación tras cierre, la recarga desde disco con Ctrl+Z, la inserción de imágenes y la resolución de rutas relativas de imágenes MUST comportarse igual que antes.
- **FR-008**: El menú de tabla abierto desde la esquina de la celda MUST NOT marcar el documento como modificado por sí solo y MUST NOT impedir los atajos globales de la aplicación.
- **FR-009**: La aplicación MUST ofrecer exactamente dos preferencias nuevas del editor: "Mostrar barra de herramientas" (menú Ver; activada por defecto) e "Historial de versiones" (menú Configuración; **activada por defecto**, decisión de la persona propietaria 2026-11-14). Ambas MUST aplicarse al instante a todos los editores abiertos, recordarse entre sesiones y no marcar el documento como modificado al cambiarlas. El resto de funciones nuevas del editor (modo de comparación, ocultar barra automáticamente, alto automático) MUST permanecer desactivadas y sin ajuste en esta actualización.
- **FR-009a**: Con el historial de versiones activado, los atajos de deshacer/rehacer MUST seguir funcionando igual cuando el historial está cerrado, y MUST actuar sobre el historial solo mientras éste está abierto; un atajo global de la aplicación MUST NOT dejar el historial en un estado inconsistente (si cierra el documento, no se pierden datos: aplica el flujo normal de cierre).
- **FR-009b**: Ocultar la barra MUST NOT afectar a la exportación (siempre se exporta el contenido renderizado sin barra) ni a la inserción de imágenes desde el menú.
- **FR-010**: Las mediciones de memoria, apertura de documentos y tamaño de instalador MUST repetirse y registrarse en `docs/performance.md` junto con las anteriores; los presupuestos vigentes del proyecto MUST mantenerse o su cambio MUST quedar justificado.
- **FR-011**: La documentación del proyecto (README, `docs/dependencies.md`, `docs/mdwysiwyg-limitations.md`, `docs/upstream-requests.md`) MUST reflejar la versión nueva: limitaciones que ya no existen se retiran, las que persisten se mantienen y toda solicitud al editor pendiente se actualiza.
- **FR-012**: Si la evaluación detecta un defecto del editor que afecte a la aplicación y no tenga solución razonable en la aplicación, MUST registrarse como solicitud al editor (con reproducción mínima) en lugar de ocultarlo con un parche local frágil.
- **FR-013**: Una vez validada la actualización, MUST regenerarse el instalador y actualizarse la aplicación instalada en este equipo, informando al terminar.

### Key Entities

- **Versión del editor**: la que el proyecto declara, bloquea y empaqueta; debe coincidir entre manifiesto, bloqueo, ejecutable e instalador.
- **Estilo del editor**: conjunto de valores de tema (colores, tipografías, fondos) identificado por nombre; ahora incluye valores para los elementos nuevos del editor además de los que ya tenía.
- **Informe de compatibilidad**: lista verificada de cambios del editor entre la versión anterior y la nueva, con el impacto en la aplicación y la decisión tomada (sin cambio, adaptar, solicitar al editor, diferir).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una instalación limpia del proyecto produce la misma versión del editor en el 100 % de las ejecuciones, y esa versión es la última publicada.
- **SC-002**: El 100 % de las pruebas existentes (unitarias, de interfaz y nativas sobre la aplicación real) pasan con la versión nueva sin cambios en sus expectativas de comportamiento.
- **SC-003**: Los 7 estilos pasan una revisión visual completa (barra, contenido, código, cita, enlace, tabla con menú, diálogo de enlace, selector de tabla) sin ningún elemento ilegible; el texto sobre su fondo cumple contraste mínimo 4,5:1 en todos.
- **SC-004**: La memoria privada de todo el árbol de procesos con un documento abierto permanece por debajo de 250 MB, y la apertura de un documento de 100 KB no empeora más de un 20 %.
- **SC-005**: Las 4 exportaciones del documento de referencia son visualmente equivalentes a las generadas antes de la actualización (mismo número de páginas A4 ±0 en el documento de prueba, mismos colores de estilo).
- **SC-006**: El instalador regenerado instala sobre la versión anterior sin pérdida de ajustes, sesión ni recuperables, y la aplicación instalada en este equipo queda en la versión nueva (hash idéntico al build).
- **SC-007**: Con la barra oculta y reactivada 10 veces seguidas sobre un documento con cambios sin guardar, el contenido, la posición del cursor y el historial de deshacer permanecen idénticos y el marcador de modificado no cambia; ambas preferencias se conservan tras cerrar y abrir la aplicación en el 100 % de las pruebas.

## Assumptions

- "Última versión" significa la etiqueta `latest` en npm en el momento de implementar; hoy es la 0.8.0 y la publicó el propietario del editor, que es también el propietario del proyecto.
- Los datos sobre cambios del editor provienen de su registro de cambios y de su tipado publicado, y se contrastarán con pruebas reales sobre la aplicación; lo no verificado se marca como tal en el informe de compatibilidad.
- Decisión de la persona propietaria (2026-11-14): de las funciones nuevas del editor se exponen solo "Mostrar barra" e "Historial de versiones". El modo de comparación, la barra auto-ocultable y el alto automático quedan **fuera de alcance** (candidatas futuras, p. ej. comparar contra la versión de disco en un conflicto); se documentan como tales.
- La creación y gestión de estilos propios (ventana "Temas") es una función aparte: especificación `004-custom-themes`, que depende de esta actualización.
- Los valores de las variables de tema nuevas para los estilos Winamp, CG Theme, Anthropic y demás se derivan de cada estilo (no se copian de un tema genérico); el estilo predeterminado conserva los valores por defecto del editor.
- Se mantienen los criterios de trabajo del proyecto: todo se hace en local, se confirma con las pruebas existentes y nuevas, y no se sube nada al repositorio remoto hasta que la persona lo indique.
- La versión bloqueada del editor se tomará con el flujo normal de instalación de dependencias; si la publicación de la última versión no estuviera disponible, no se usa una copia local salvo que la persona lo pida.
- No se cambia la API que la aplicación usa del editor ni se toca el editor (su repositorio es independiente); cualquier cambio requerido allí se tramita como solicitud (FR-012).
