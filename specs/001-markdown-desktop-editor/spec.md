# Feature Specification: Markdown Desktop Editor

**Feature Branch**: `001-markdown-desktop-editor`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Markdown Desktop Editor — aplicación de escritorio liviana para crear, abrir, editar y administrar documentos Markdown locales con edición WYSIWYG, múltiples pestañas, protección contra pérdida de datos, recuperación de sesión e integración con el sistema operativo."

## Clarifications

### Session 2026-11-01

- Q: Si un archivo cambia en disco mientras está abierto con cambios locales, ¿qué opciones se ofrecen? → A: Tres opciones: (1) Pisar el archivo en disco con la versión local; (2) Cargar la versión actualizada del disco en otra pestaña como documento nuevo sin ruta; (3) Recargar el contenido del disco en la pestaña actual. En el área de edición, Ctrl+Z siempre debe permitir restaurar el contenido anterior a la recarga.
- Q: ¿Qué debe pasar al abrir un archivo muy grande? → A: Avisar al superar un umbral (valor 256 KB, fijado con mediciones: ver docs/performance.md) y dejar al usuario elegir entre abrirlo igualmente o cancelar.
- Q: ¿Qué hace la app si un archivo `.md` no es UTF-8 válido? → A: Detectar la codificación y abrirlo; al guardar, convertirlo a UTF-8 solo con confirmación explícita del usuario (lista de codificaciones soportadas a definir en el plan).
- Q: ¿Cuándo se guarda el contenido de recuperación de documentos sin guardar? → A: Unos segundos después del último cambio (~3–5 s, sin temporizador activo si no hay cambios) y al cambiar de pestaña, en un almacén aparte sin tocar el archivo original.
- Q: ¿Qué hace la app si se inserta una imagen local en un documento sin ruta? → A: Pedir guardar primero el documento (Guardar como) y, una vez guardado, continuar con la inserción usando ruta relativa.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar un documento Markdown local (Priority: P1)

El usuario abre un archivo `.md`/`.markdown` existente (o crea uno nuevo), lo edita visualmente como en un editor de documentos convencional y lo guarda de vuelta en el disco.

**Why this priority**: Es el flujo central del producto; sin él no hay valor. Por sí solo constituye un MVP utilizable.

**Independent Test**: Abrir un archivo `.md` mediante el diálogo de archivos, modificar texto, guardar, y verificar que el archivo en disco contiene el Markdown actualizado en UTF-8.

**Acceptance Scenarios**:

1. **Given** la aplicación abierta sin documentos, **When** el usuario elige Nuevo, **Then** aparece un documento vacío en una pestaña marcada como documento nuevo, sin ruta asignada.
2. **Given** un archivo `.md` en disco, **When** el usuario lo abre desde el diálogo de selección, **Then** su contenido se muestra renderizado de forma visual en una pestaña con el nombre del archivo.
3. **Given** un documento abierto con cambios, **When** el usuario ejecuta Guardar, **Then** el archivo en disco se actualiza, el indicador de cambios sin guardar desaparece y se muestra una confirmación visual.
4. **Given** un documento nuevo sin ruta, **When** el usuario ejecuta Guardar, **Then** se abre el diálogo Guardar como y, al confirmar, el documento queda asociado a la ruta elegida y la pestaña toma el nuevo nombre.
5. **Given** un archivo ya abierto en una pestaña, **When** el usuario intenta abrirlo de nuevo, **Then** se activa la pestaña existente y no se crea un duplicado.

---

### User Story 2 - Trabajar con varios documentos en pestañas (Priority: P1)

El usuario mantiene varios documentos abiertos a la vez, cada uno en su pestaña, y se mueve entre ellos sin perder su estado de edición.

**Why this priority**: La edición multi-documento es un objetivo principal declarado y condiciona la experiencia diaria.

**Independent Test**: Abrir tres documentos, editar cada uno, alternar entre pestañas y verificar que contenido, cursor, selección, scroll e historial de deshacer se conservan en cada uno.

**Acceptance Scenarios**:

1. **Given** varios documentos abiertos, **When** el usuario cambia de pestaña, **Then** se muestra el documento correspondiente conservando contenido, posición del cursor, selección, scroll e historial de deshacer/rehacer, en la medida en que el editor lo permita.
2. **Given** pestañas con nombre, indicador de cambios sin guardar, botón de cierre y marca de pestaña activa, **When** el usuario modifica un documento, **Then** solo su pestaña muestra el indicador de cambios sin guardar.
3. **Given** varias pestañas, **When** el usuario arrastra una pestaña a otra posición, **Then** el orden se actualiza y se mantiene.
4. **Given** varias pestañas, **When** el usuario elige Cerrar otras o Cerrar todas, **Then** se cierran las pestañas correspondientes aplicando la protección de cambios pendientes.

---

### User Story 3 - No perder cambios al cerrar o salir (Priority: P1)

Cuando existen modificaciones sin guardar, la aplicación pide al usuario decidir antes de cerrar una pestaña, cerrar todas o salir.

**Why this priority**: La integridad de los documentos es una prioridad explícita; perder trabajo destruye la confianza en el producto.

**Independent Test**: Modificar un documento y cerrarlo; verificar que aparece la confirmación con Guardar / Descartar / Cancelar y que cada opción produce el resultado esperado.

**Acceptance Scenarios**:

1. **Given** un documento con cambios sin guardar, **When** el usuario cierra su pestaña, **Then** se ofrece Guardar, Descartar o Cancelar.
2. **Given** varios documentos con cambios, **When** el usuario sale de la aplicación, **Then** se solicita confirmación por cada documento pendiente (o una confirmación equivalente que cubra todos) y Cancelar aborta la salida.
3. **Given** un archivo modificado externamente mientras está abierto, **When** el usuario intenta guardarlo, **Then** la aplicación informa del conflicto, no sobrescribe silenciosamente el contenido del disco y ofrece tres opciones: pisar el archivo con la versión local, abrir la versión del disco en otra pestaña como documento nuevo, o recargar la versión del disco en la pestaña actual.
4. **Given** una pestaña recién recargada desde disco tras un conflicto, **When** el usuario pulsa Ctrl+Z, **Then** se restaura el contenido que tenía antes de la recarga.

---

### User Story 4 - Recuperar la sesión tras reinicio o cierre inesperado (Priority: P2)

Al volver a abrir la aplicación, el usuario encuentra sus pestañas, la pestaña activa y sus preferencias; tras un cierre inesperado puede recuperar el contenido no guardado.

**Why this priority**: Refuerza la protección de datos y la continuidad de trabajo, pero el producto es utilizable sin ello.

**Independent Test**: Abrir documentos, dejar cambios sin guardar, terminar el proceso abruptamente, reiniciar y verificar que se ofrece recuperar los documentos con cambios pendientes y se restauran pestañas y pestaña activa.

**Acceptance Scenarios**:

1. **Given** una sesión con pestañas abiertas, **When** el usuario cierra y reabre la aplicación, **Then** se restauran las pestañas, la pestaña activa, el tema, el tamaño/posición de ventana y el último directorio usado.
2. **Given** documentos con cambios sin guardar y un cierre inesperado, **When** se reabre la aplicación, **Then** se ofrece recuperar ese contenido sin haber modificado los archivos originales en disco.

---

### User Story 5 - Abrir archivos desde el sistema operativo (Priority: P2)

El usuario abre archivos Markdown desde el explorador de archivos, arrastrándolos a la ventana o por línea de comandos, y siempre se usa una única instancia de la aplicación.

**Why this priority**: Hace que la aplicación se integre en el flujo de trabajo diario, pero depende de que la edición básica funcione.

**Independent Test**: Con la aplicación instalada, hacer doble clic en un `.md` desde el explorador, y luego en otro con la aplicación ya abierta; verificar que ambos se abren en pestañas de la misma ventana.

**Acceptance Scenarios**:

1. **Given** la aplicación instalada, **When** el usuario hace doble clic en un `.md` o `.markdown`, **Then** se abre en la aplicación.
2. **Given** la aplicación ya abierta, **When** el usuario abre otro archivo desde el sistema operativo, **Then** el archivo se abre como pestaña en la instancia existente y no se lanza una segunda instancia.
3. **Given** la aplicación abierta, **When** el usuario arrastra uno o más archivos Markdown sobre la ventana, **Then** cada uno se abre en una pestaña (sin duplicar los ya abiertos).

---

### User Story 6 - Menús, atajos y apariencia (Priority: P2)

El usuario usa los menús Archivo, Edición y Ver, atajos de teclado estándar, alterna entre tema claro/oscuro, ajusta el zoom y muestra u oculta la barra de estado.

**Why this priority**: Productividad y comodidad; se apoya en las funciones de las historias anteriores.

**Independent Test**: Ejecutar cada acción de menú y cada atajo documentado y verificar el resultado; alternar tema y reiniciar para comprobar que se conserva.

**Acceptance Scenarios**:

1. **Given** la aplicación abierta, **When** el usuario usa Ctrl+N/O/S/Shift+S/W, Ctrl+Tab/Ctrl+Shift+Tab, Ctrl+Z y Ctrl+Y, **Then** se ejecutan Nuevo, Abrir, Guardar, Guardar como, Cerrar pestaña, pestaña siguiente/anterior, Deshacer y Rehacer respectivamente (con Cmd en macOS).
2. **Given** el foco en el editor, **When** el usuario pulsa un atajo que el editor ya maneja, **Then** no hay conflicto ni doble ejecución.
3. **Given** el menú Ver, **When** el usuario alterna el tema, cambia el zoom o muestra/oculta la barra de estado, **Then** el cambio es inmediato y se conserva entre sesiones.

---

### User Story 7 - Insertar imágenes locales portables (Priority: P3)

El usuario inserta imágenes locales en un documento; la aplicación le ofrece copiarlas a una carpeta `assets` junto al documento y referenciarlas con rutas relativas.

**Why this priority**: Enriquece los documentos, pero no es necesario para el flujo básico de edición.

**Independent Test**: Insertar una imagen en un documento guardado, aceptar la copia a `assets`, mover la carpeta completa a otra ubicación y verificar que la imagen sigue mostrándose.

**Acceptance Scenarios**:

1. **Given** un documento guardado, **When** el usuario inserta una imagen mediante el diálogo de archivos, **Then** se le ofrece copiarla a una carpeta `assets` asociada al documento y, si acepta, el Markdown usa una ruta relativa.
2. **Given** un archivo existente en `assets` con el mismo nombre, **When** se inserta una imagen homónima, **Then** no se sobrescribe sin autorización explícita del usuario.
3. **Given** un documento nuevo sin ruta, **When** el usuario inserta una imagen local, **Then** la aplicación pide guardar primero el documento (Guardar como) y, una vez guardado, continúa con la inserción usando ruta relativa; si el usuario cancela, no se inserta la imagen.

---

### Edge Cases

- Archivo abierto que es eliminado o renombrado externamente: se informa al usuario y se conserva el contenido en memoria para poder guardarlo en otra ruta.
- Archivo modificado externamente con el documento sin cambios locales: se ofrece recargar (también deshacible con Ctrl+Z); con cambios locales: se presenta el conflicto con las tres opciones de FR-014, sin pérdida de ninguna de las dos versiones.
- Archivos muy grandes: al superar el umbral de aviso (FR-002a), la aplicación avisa antes de abrir y el usuario elige abrirlo igualmente o cancelar; en ningún caso se bloquea la interfaz.
- Archivos con codificación distinta de UTF-8: se detecta la codificación y se abren; al guardar se pide confirmación antes de convertirlos a UTF-8 (FR-002b). Si la codificación no se puede determinar con fiabilidad o el archivo tiene bytes inválidos, se informa claramente, no se abre y no se corrompe el archivo original.
- Archivos de solo lectura o sin permisos de escritura, disco lleno, o ruta no disponible (unidad desconectada): error comprensible, sin perder el contenido en memoria.
- Preservación de finales de línea (CRLF/LF) al guardar un archivo existente.
- Guardar como sobre una ruta que ya está abierta en otra pestaña: se gestiona el conflicto sin duplicar ni perder documentos.
- Guardar sin cambios: no se reescribe el archivo.
- Fallo en mitad de un guardado (corte de energía, error de E/S): el archivo original permanece íntegro.
- Cierre inesperado con archivos originales ya modificados en disco por otra herramienta: la recuperación no sobrescribe sin avisar.
- Archivos soltados que no son Markdown: se rechazan con un mensaje claro.
- Múltiples archivos abiertos simultáneamente desde el sistema operativo (selección múltiple).
- Datos de sesión corruptos o ilegibles: la aplicación arranca igualmente con una sesión limpia.

## Requirements *(mandatory)*

### Functional Requirements

**Documentos y pestañas**

- **FR-001**: El sistema MUST permitir crear documentos nuevos vacíos, identificados con un identificador único y sin ruta hasta ser guardados.
- **FR-002**: El sistema MUST permitir abrir archivos `.md` y `.markdown` mediante un diálogo nativo de selección, leyéndolos como UTF-8 por defecto (otras codificaciones: ver FR-002b).
- **FR-002a**: Antes de abrir un archivo cuyo tamaño supere un umbral de aviso (256 KB por defecto, configurable; fijado con mediciones), el sistema MUST advertir al usuario y permitirle elegir entre abrirlo igualmente o cancelar, sin bloquear la interfaz.
- **FR-002b**: El sistema MUST detectar la codificación de los archivos abiertos; si no es UTF-8, MUST mostrarlos igualmente y, antes de guardar, MUST pedir confirmación explícita para convertirlos a UTF-8 (el usuario puede cancelar el guardado). Si la codificación no puede determinarse con fiabilidad, MUST rechazar la apertura con un mensaje claro sin modificar el archivo.
- **FR-003**: El sistema MUST impedir documentos duplicados: abrir un archivo ya abierto activa su pestaña existente.
- **FR-004**: El sistema MUST mostrar cada documento en una pestaña independiente con nombre, indicador de cambios sin guardar, acción de cierre e indicador de pestaña activa.
- **FR-005**: El sistema MUST permitir crear, cambiar, cerrar, cerrar otras, cerrar todas y reordenar pestañas por arrastrar y soltar.
- **FR-006**: El sistema MUST conservar el estado de edición de cada documento al cambiar de pestaña (contenido, cursor, selección, scroll, historial de deshacer/rehacer) en la medida en que el componente de edición lo soporte, y documentar cualquier limitación con una alternativa compatible.
- **FR-007**: El sistema MUST mantener el contenido Markdown como fuente de verdad de cada documento y determinar el estado "con cambios" comparando el contenido actual con el último contenido guardado.

**Edición**

- **FR-008**: El sistema MUST ofrecer edición visual (WYSIWYG) de Markdown usando `mdwysiwyg` como motor de edición, sin duplicar funcionalidades que éste ya provee.
- **FR-009**: El sistema MUST mantener una única instancia activa del editor y evitar cargar o renderizar documentos inactivos innecesariamente.

**Guardado e integridad**

- **FR-010**: El sistema MUST guardar sobre la ruta original; si el documento no tiene ruta, MUST ejecutar Guardar como.
- **FR-011**: El sistema MUST ofrecer Guardar como con diálogo nativo, actualizando ruta, nombre de pestaña y estado del documento, y gestionando conflictos con documentos ya abiertos.
- **FR-012**: El sistema MUST mostrar una confirmación visual de guardado exitoso y un mensaje claro ante cualquier fallo.
- **FR-013**: El sistema MUST usar escritura segura (el archivo original no queda corrupto ante fallos durante el guardado), preservar UTF-8, preservar finales de línea cuando sea posible y omitir la escritura si el contenido no cambió.
- **FR-014**: El sistema MUST detectar modificaciones externas de los archivos abiertos, comparar el estado en memoria con el del disco, y MUST NOT sobrescribir silenciosamente. Ante conflicto (archivo cambiado en disco con cambios locales sin guardar), MUST informar al usuario y ofrecer exactamente: (1) pisar el archivo en disco con la versión local; (2) cargar la versión del disco en otra pestaña como documento nuevo sin ruta, conservando intacta la pestaña original; (3) recargar la versión del disco en la pestaña actual.
- **FR-014a**: Tras recargar el contenido en la pestaña actual (opción 3, o recarga sin cambios locales), el sistema MUST permitir restaurar el contenido anterior con Ctrl+Z en el área de edición. Si el componente de edición no puede conservar ese historial, el plan MUST definir una alternativa que garantice la misma restauración.
- **FR-015**: El sistema MUST solicitar Guardar / Descartar / Cancelar al cerrar una pestaña, cerrar todas o salir cuando existan cambios sin guardar.

**Interfaz y atajos**

- **FR-016**: El sistema MUST presentar una ventana con barra de menú, barra de pestañas, área de edición y barra de estado.
- **FR-017**: El sistema MUST ofrecer los menús Archivo (Nuevo, Abrir, Guardar, Guardar como, Cerrar documento, Cerrar todos, Salir), Edición (Deshacer, Rehacer, Cortar, Copiar, Pegar, Seleccionar todo) y Ver (alternar tema claro/oscuro, zoom de interfaz, mostrar/ocultar barra de estado).
- **FR-018**: El sistema MUST implementar los atajos Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Shift+S, Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab, Ctrl+Z y Ctrl+Y (Cmd en macOS) sin conflictos con los atajos propios del editor.

**Persistencia y recuperación**

- **FR-019**: El sistema MUST funcionar completamente sin conexión a Internet y sin depender de servicios externos.
- **FR-020**: El sistema MUST persistir localmente preferencias, tema, tamaño y posición de ventana, último directorio, pestañas abiertas, pestaña activa y contenido temporal de documentos con cambios sin guardar, con almacenamiento liviano.
- **FR-020a**: El sistema MUST guardar el contenido de recuperación de los documentos con cambios sin guardar unos segundos después del último cambio (~3–5 s) y al cambiar de pestaña, en un almacén separado de los archivos originales y sin actividad periódica cuando no hay cambios.
- **FR-021**: El sistema MUST restaurar la sesión al iniciar y ofrecer recuperar documentos con cambios pendientes tras un cierre inesperado, sin modificar los archivos originales hasta que el usuario guarde.

**Integración con el sistema operativo**

- **FR-022**: El sistema MUST registrarse como manejador de archivos `.md` y `.markdown` en el instalador, permitiendo abrirlos desde el explorador del sistema.
- **FR-023**: El sistema MUST aceptar archivos por argumentos de línea de comandos y por arrastrar y soltar sobre la ventana.
- **FR-024**: El sistema MUST ejecutarse como instancia única; abrir un archivo con la aplicación ya en ejecución MUST enviarlo a la instancia existente.

**Imágenes**

- **FR-025**: El sistema MUST permitir insertar imágenes locales mediante un diálogo nativo, ofrecer copiarlas a una carpeta `assets` asociada al documento, y usar rutas relativas en el Markdown cuando corresponda.
- **FR-025a**: Si el documento no tiene ruta, el sistema MUST pedir guardarlo (Guardar como) antes de insertar una imagen local, y MUST cancelar la inserción si el usuario cancela el guardado.
- **FR-026**: El sistema MUST NOT modificar ni sobrescribir archivos existentes (incluidas imágenes) sin autorización explícita del usuario.

**Seguridad y recursos**

- **FR-027**: El sistema MUST limitar el acceso al sistema de archivos a rutas autorizadas por el usuario (selección en diálogo, apertura desde el SO, arrastre, sesión previa) y MUST NOT permitir ejecución arbitraria de comandos del sistema.
- **FR-028**: El sistema MUST mantener un consumo reducido de recursos: sin procesos residentes ni servicios en segundo plano innecesarios, sin sondeo continuo para detectar cambios externos y sin copias redundantes del contenido de los documentos.
- **FR-029**: El sistema MUST distribuirse como instalador de Windows que no requiera instalar runtimes ni herramientas de desarrollo en el equipo del usuario, dejando abierta la posibilidad de soportar macOS y Linux posteriormente.

### Key Entities

- **Documento**: unidad editable. Atributos: identificador único, ruta (opcional hasta guardar), nombre, contenido actual, último contenido guardado, estado "con cambios", fecha de última modificación conocida en disco, finales de línea originales.
- **Pestaña**: representación visible de un documento, con orden y estado activo; una pestaña por documento.
- **Sesión**: conjunto de documentos abiertos (con su orden), pestaña activa y contenido temporal de documentos no guardados, usado para restaurar y recuperar.
- **Preferencias**: tema, zoom, visibilidad de barra de estado, tamaño y posición de ventana, último directorio utilizado.
- **Recurso local (imagen)**: archivo asociado a un documento, referenciado por ruta relativa y opcionalmente copiado a la carpeta `assets` del documento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Las metas de rendimiento se miden y documentan en un equipo Windows de referencia a definir.

- **SC-001**: La aplicación está lista para usar en menos de 2 segundos desde un inicio en frío.
- **SC-002**: En reposo con un documento habitual abierto, todo el árbol de procesos de la aplicación (incluido el motor de renderizado del sistema) usa menos de 250 MB de memoria privada y un uso de CPU prácticamente nulo.
- **SC-003**: Cambiar de pestaña tarda menos de 100 ms y abrir un documento habitual tarda menos de 500 ms.
- **SC-004**: Un usuario completa el flujo abrir → editar → guardar en menos de 1 minuto sin instrucciones previas.
- **SC-005**: En el 100 % de las pruebas de cierre con cambios pendientes, el usuario recibe la confirmación y ningún cambio se pierde sin su decisión explícita.
- **SC-006**: En el 100 % de las pruebas de interrupción durante el guardado, el archivo original permanece íntegro (nunca vacío ni truncado).
- **SC-007**: Tras un cierre inesperado, el 100 % de los documentos con cambios pendientes pueden recuperarse al reabrir, perdiendo como máximo los últimos ~5 segundos de edición.
- **SC-008**: Todas las funciones (crear, abrir, editar, guardar, recuperar) funcionan sin conexión a Internet.
- **SC-009**: Abrir un `.md` desde el explorador de Windows con la aplicación ya abierta lo muestra en la ventana existente en menos de 1 segundo y sin crear una segunda instancia.
- **SC-010**: Un usuario sin herramientas de desarrollo instaladas puede instalar y usar la aplicación sin pasos adicionales.

## Assumptions

- Usuarios objetivo: personas que editan Markdown local de forma individual, sin necesidad de colaboración ni cuenta.
- Windows es la primera plataforma soportada; macOS y Linux quedan para fases posteriores, pero las decisiones no deben bloquearlos.
- El stack tecnológico indicado en la descripción de entrada (Tauri 2, React, TypeScript, Vite, `mdwysiwyg`, Zustand, Zod, Rust, Vitest, Playwright) es una restricción de la fase de planificación, no parte de este documento de requisitos de producto.
- `mdwysiwyg` (repositorio ferkiernan/mdwysiwyg, licencia MIT) es el motor de edición; su API real se investigará en la fase de plan. Las capacidades que no soporte (p. ej. preservar historial de deshacer por documento) se documentarán con una alternativa compatible.
- Los documentos nuevos se guardan en UTF-8; los archivos existentes en otras codificaciones se abren mediante detección y se convierten a UTF-8 solo con confirmación. Resultado de la implementación: UTF-8 (con o sin BOM), UTF-16 LE/BE con BOM y las codificaciones de un byte que `chardetng` detecta (p. ej. Windows-1252) siempre que el archivo completo decodifique sin reemplazos; si no, se rechaza sin tocar el archivo (research R5, `encoding.rs`).
- Las metas de rendimiento son objetivos iniciales sujetos a medición y no justifican sacrificar la integridad de los documentos.
- Fuera de alcance del MVP: backend remoto, sincronización en la nube, cuentas de usuario, colaboración en tiempo real, inteligencia artificial, base de datos pesada, plugins de terceros, servidor HTTP local y funcionalidades que ya ofrece `mdwysiwyg`.
- Umbral de aviso por tamaño: **256 KB**, fijado con mediciones (apertura: 100 KB ≈ 0,4 s, 300 KB ≈ 1,4 s, 1 MB ≈ 8,7 s; ver `docs/performance.md`). Memoria: < 250 MB privados para todo el árbol de procesos con un documento (SC-002 redefinido tras el spike S1; medido 201–210 MB con mdwysiwyg 0.8.0).
- `mdwysiwyg`: la API de host (`setMarkdown`, `insertMarkdown`, `resolveImageSrc`) se incorporó en 0.3.0 y la app usa 0.8.0 (spec 003); limitaciones vigentes en `docs/mdwysiwyg-limitations.md`.
- Enmiendas posteriores: FR-014 (opciones ante un cambio externo) lo reemplaza la spec `008-external-change-compare`; FR-017 (zoom de interfaz en Ver) lo reemplaza el zoom del contenido de la spec `007-content-zoom-bar-size`.
- El plan de implementación de 15 etapas de la descripción de entrada se usará como guía para la fase de plan y tareas.
