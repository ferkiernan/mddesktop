# Feature Specification: Estilos propios y ventana "Temas"

**Feature Branch**: `004-custom-themes`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "quiero poder crear y gestionar estilos propios, y guardarlos, adicionales a los que existen, desde una ventana 'Themes', con selector de colores, que sea cómoda y tenga una vista previa de cómo quedará el control."

**Depende de**: `003-upgrade-mdwysiwyg` (el editor 0.6.0 permite tematizar más elementos y desde cualquier ancestro; sin esa actualización no hay variables suficientes para un estilo completo).

## Clarifications

### Session 2026-11-14

- Q: ¿Cómo se abre la ventana "Temas"? → A: Panel modal grande dentro de la ventana principal (no una segunda ventana nativa ni una pestaña).
- Q: (desde 007) ¿Dónde vive el ajuste de tamaño de barra? → A: En esta ventana, como un único control "Ajuste tamaño de barra" que escala la barra de pestañas y la barra de herramientas del editor juntas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear un estilo propio con vista previa en vivo (Priority: P1)

La persona abre Configuración → Temas…, crea un estilo nuevo partiendo de uno existente (o del predeterminado), cambia colores con un selector de color y ve al instante, en una vista previa del editor dentro de la misma ventana, cómo queda: barra, contenido, código, cita, enlace, tabla, menús. Lo nombra y lo guarda.

**Why this priority**: Es el núcleo de la función: sin crear y ver el resultado no hay valor.

**Independent Test**: Abrir la ventana, duplicar un estilo, cambiar fondo, texto y acento, comprobar que la vista previa cambia al mover el selector, guardar con un nombre y verificar que aparece en el menú de estilos y que se puede aplicar a un documento real.

**Acceptance Scenarios**:

1. **Given** la ventana "Temas" abierta, **When** se pulsa "Nuevo" y se elige un estilo de partida, **Then** aparece un estilo sin guardar con el nombre sugerido ("Copia de X") y una vista previa con ese aspecto.
2. **Given** un estilo en edición, **When** se cambia un color con el selector, **Then** la vista previa se actualiza mientras se arrastra, sin retraso apreciable, y el documento real de la ventana principal **no** cambia hasta guardar o aplicar.
3. **Given** un estilo en edición con nombre válido, **When** se pulsa "Guardar", **Then** el estilo queda guardado, aparece en Configuración → Estilo del editor junto a los 7 existentes y puede aplicarse.
4. **Given** el estilo recién guardado, **When** se pulsa "Aplicar" (o se elige desde el menú), **Then** todos los editores abiertos y la interfaz (pestañas, barra de estado, diálogos) adoptan el estilo al instante.

---

### User Story 2 - Los estilos propios se guardan y se gestionan (Priority: P1)

La persona puede ver la lista de estilos (los 7 incluidos y los propios), duplicar, renombrar, editar y eliminar los propios, y todo persiste entre sesiones. Los 7 estilos incluidos no se pueden modificar ni borrar, pero sí duplicar.

**Why this priority**: Un estilo que se pierde al cerrar no sirve; sin gestión la lista se vuelve inmanejable.

**Independent Test**: Crear dos estilos, renombrar uno, borrar otro, cerrar la aplicación, reabrirla y comprobar que la lista y el estilo activo se conservan.

**Acceptance Scenarios**:

1. **Given** estilos propios guardados, **When** se cierra y reabre la aplicación, **Then** aparecen en la ventana "Temas" y en el menú, y el estilo activo se restaura (propio o incluido).
2. **Given** un estilo propio, **When** se renombra con un nombre ya existente (sin distinguir mayúsculas), **Then** se rechaza con un mensaje claro y el nombre anterior se conserva.
3. **Given** un estilo propio que está activo, **When** se elimina (tras confirmar), **Then** la aplicación pasa al estilo predeterminado, la ventana y el menú se actualizan y los documentos abiertos no pierden contenido.
4. **Given** un estilo incluido, **When** se intenta editar o eliminar, **Then** las acciones no están disponibles y se ofrece "Duplicar" para crear una copia editable.
5. **Given** un estilo propio, **When** se pulsa "Duplicar", **Then** se crea una copia con nombre único listo para editar.

---

### User Story 3 - Edición cómoda: modo básico y modo avanzado (Priority: P2)

Para crear un estilo rápido la persona elige pocos colores (fondo, texto, acento, borde, barra); el resto se deriva automáticamente de ellos. Si quiere más control, pasa al modo avanzado, donde ve todas las variables de color agrupadas por zona (barra, contenido, código, tablas, citas, enlaces, controles, paneles flotantes) con una descripción de qué afecta cada una, y puede restablecer una variable a su valor derivado.

**Why this priority**: Con ~45 variables, un editor plano es agobiante; el modo básico da resultado en segundos y el avanzado cubre el detalle.

**Independent Test**: En modo básico cambiar solo fondo y texto y comprobar que la vista previa completa (código, menús, enlaces) queda legible; en avanzado cambiar un color de resaltado de código y verificar que solo cambia eso.

**Acceptance Scenarios**:

1. **Given** el modo básico, **When** se cambian fondo y texto, **Then** el resto de los elementos de la vista previa (barra, tablas, código, cita, enlaces, menús) se adaptan a ellos de forma legible, sin que haya que tocar más campos.
2. **Given** el modo avanzado, **When** se cambia una variable concreta, **Then** esa variable queda fijada y marcada como "personalizada"; el botón "Restablecer" vuelve a su valor derivado.
3. **Given** cualquier color introducido, **When** el contraste entre texto y fondo es inferior a 4,5:1, **Then** la ventana muestra un aviso no bloqueante junto a ese par de colores.
4. **Given** un campo de color, **When** se escribe un valor manualmente (hexadecimal, `rgb()`, nombre CSS), **Then** se acepta si es un color válido y se rechaza con mensaje si no, sin romper la vista previa.
5. **Given** un fondo o barra con degradado en un estilo incluido, **When** se duplica, **Then** el degradado se conserva y se puede editar (color inicial, intermedio y final).

---

### User Story 4 - Ventana cómoda y segura (Priority: P2)

La ventana "Temas" tiene la lista a un lado, el editor de colores en el centro y la vista previa a la vista en todo momento; se maneja con teclado; no se pierde trabajo al cerrarla sin guardar; y no bloquea la aplicación principal.

**Why this priority**: La comodidad es parte del pedido ("que sea cómoda"); perder un estilo a medio hacer es una molestia seria.

**Independent Test**: Editar un estilo, cerrar la ventana sin guardar y comprobar que se pregunta; cambiar el tamaño de la ventana y verificar que la vista previa sigue visible; recorrer todos los controles con Tab.

**Acceptance Scenarios**:

1. **Given** cambios sin guardar, **When** se cierra la ventana o se elige otro estilo en la lista, **Then** se ofrece Guardar / Descartar / Cancelar.
2. **Given** la ventana abierta, **When** se cambia su tamaño dentro de un mínimo razonable, **Then** la lista, el editor y la vista previa se reorganizan sin ocultar la vista previa.
3. **Given** la ventana abierta, **When** se usa solo el teclado, **Then** todos los controles (lista, selector de color, campos, botones) son alcanzables y operables, Escape cierra (con la pregunta de cambios) y Enter confirma el campo actual.
4. **Given** el panel abierto, **When** se intenta volver a la aplicación principal, **Then** el panel cubre la ventana principal (modal): los documentos siguen abiertos e intactos detrás y se vuelve a ellos al cerrar el panel; los cambios de estilo en edición no afectan a la aplicación hasta aplicarlos.

---

### User Story 5 - Los estilos propios funcionan en todo (Priority: P2)

Un estilo propio se comporta igual que uno incluido en todas partes: editor, pestañas, barra de estado, diálogos, menús del editor y exportación (HTML, PDF, Word, OpenDocument).

**Why this priority**: Un estilo que solo se ve en el editor y no al exportar o en la interfaz sería una función a medias.

**Independent Test**: Aplicar un estilo propio oscuro y exportar el documento de referencia a los 4 formatos; comprobar colores, y reabrir la aplicación.

**Acceptance Scenarios**:

1. **Given** un estilo propio activo, **When** se exporta a cualquier formato, **Then** el resultado usa sus colores y fondos como con un estilo incluido.
2. **Given** un estilo propio oscuro, **When** se abren menús, diálogos y paneles del editor, **Then** son legibles y coherentes.
3. **Given** un estilo propio activo, **When** se ve la interfaz de la aplicación (pestañas, barra de estado, diálogos), **Then** adopta los colores derivados del estilo igual que con los incluidos.

---

### Edge Cases

- Archivo de estilos propios dañado o con valores inválidos: la aplicación arranca igualmente con los 7 estilos incluidos, avisa con un mensaje y conserva una copia del archivo dañado; no se pierde el resto de la configuración.
- Un estilo activo referido en la configuración que ya no existe: se vuelve al predeterminado sin error.
- Nombres: vacíos, solo espacios, demasiado largos (> 40 caracteres) o con caracteres de control se rechazan; se admiten tildes y espacios.
- Muchos estilos (p. ej. 50): la lista y el menú siguen siendo manejables (la lista desplaza; el menú muestra los propios en su propia sección).
- Dos instancias o cierre brusco durante el guardado: el archivo de estilos no queda a medias (escritura atómica).
- Un color con transparencia: se admite donde el editor lo admite; si afectara a la legibilidad (texto sobre fondo), el aviso de contraste lo tiene en cuenta contra el fondo más probable.
- Estilos con degradados o imágenes de fondo: el editor de colores edita degradados de dos o tres paradas; las imágenes de fondo no se ofrecen (quedan fuera de alcance).
- Cambiar de estilo con documentos abiertos y editores en segundo plano: todos adoptan el cambio sin recargar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Configuración MUST incluir "Temas…", que abre la ventana de gestión de estilos; el submenú "Estilo del editor" MUST listar los estilos incluidos y, en una sección aparte, los propios, y reflejar el activo.
- **FR-002**: La ventana MUST mostrar a la vez: lista de estilos, editor de colores del estilo seleccionado y una vista previa del control (barra, contenido con encabezados, texto con énfasis, enlace visitado y no visitado, cita, lista de tareas, tabla, bloque de código resaltado, diagrama y un menú/panel flotante de ejemplo), además del control "Ajuste tamaño de barra" de la especificación 007.
- **FR-003**: La vista previa MUST actualizarse mientras se cambia un color, sin aplicar el estilo al resto de la aplicación hasta que se guarde y se aplique.
- **FR-004**: Cada color MUST poder elegirse con un selector gráfico de color y también escribiendo el valor; los valores inválidos MUST rechazarse con mensaje sin romper la vista previa.
- **FR-005**: La persona MUST poder crear un estilo (desde uno existente), duplicar, renombrar, editar y eliminar estilos propios. Los 7 estilos incluidos MUST ser de solo lectura y duplicables.
- **FR-006**: Los nombres MUST ser únicos sin distinguir mayúsculas de minúsculas, de 1 a 40 caracteres (sin contar espacios de los extremos), y MUST rechazarse si colisionan con el nombre de un estilo incluido o de otro propio.
- **FR-007**: Los estilos propios MUST guardarse en el equipo de forma duradera y atómica, restaurarse al iniciar y seguir disponibles tras cierres bruscos; el estilo activo MUST recordarse (propio o incluido).
- **FR-008**: El editor MUST ofrecer un modo básico (pocos colores base; el resto se deriva) y un modo avanzado (todas las variables de color del editor, agrupadas por zona con descripción, con indicación de cuáles están personalizadas y opción de restablecer a su valor derivado).
- **FR-009**: La ventana MUST avisar (sin bloquear) cuando el contraste de un texto sobre su fondo sea inferior a 4,5:1, incluido el fondo de los diagramas Mermaid frente a su trazo oscuro por defecto (si no, los diagramas sin relleno quedan invisibles; bug `pdf-mermaid-missing`).
- **FR-009a**: Terminología única en la interfaz: *estilo* es un conjunto de colores y tipografías (incluidos o propios); *"Temas…"* es solo el nombre del panel donde se gestionan. El elemento de menú actual "Alternar tema claro/oscuro" MUST renombrarse a "Alternar estilo claro/oscuro".
- **FR-010**: Aplicar un estilo MUST actualizar de inmediato todos los editores abiertos, la interfaz de la aplicación (pestañas, barra de estado, diálogos, menús del editor) y la exportación, con la misma lógica que los estilos incluidos.
- **FR-011**: Al eliminar el estilo activo, la aplicación MUST pasar al predeterminado; al cerrar la ventana o cambiar de selección con cambios sin guardar MUST preguntarse Guardar / Descartar / Cancelar.
- **FR-012**: La ventana MUST ser operable solo con teclado, con etiquetas accesibles para cada control, y respetar un tamaño mínimo que mantenga visibles lista, editor y vista previa.
- **FR-013**: Un archivo de estilos dañado MUST NOT impedir el arranque: se usan los incluidos, se avisa y se conserva una copia del archivo dañado.
- **FR-014**: Los valores guardados MUST validarse al leerlos (solo colores y degradados admitidos, longitud acotada); el contenido de un estilo nunca MUST poder introducir comportamiento (solo valores de color), ni afectar a otros elementos que no sean los del editor y la interfaz de la aplicación.
- **FR-015**: Crear, editar o aplicar un estilo MUST NOT modificar los documentos abiertos ni marcarlos como modificados.
- **FR-016**: El menú nativo MUST reflejar al instante altas, bajas y cambios de nombre de estilos propios sin reiniciar.

### Key Entities

- **Estilo**: nombre único, origen (incluido o propio), valores de color del editor y de la interfaz (los básicos y, opcionalmente, los avanzados personalizados), fecha de creación y de modificación.
- **Catálogo de estilos**: los 7 incluidos más los propios; incluye cuál está activo.
- **Borrador de estilo**: copia de trabajo de un estilo mientras se edita en la ventana; no afecta a la aplicación hasta guardarse y aplicarse.
- **Aviso de contraste**: resultado de comparar texto y fondo de un par de colores del estilo en edición.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona puede crear, nombrar y guardar un estilo propio completo a partir de uno existente cambiando 3 colores básicos en menos de 2 minutos.
- **SC-002**: La vista previa refleja un cambio de color en menos de 100 ms desde que se suelta o mueve el selector.
- **SC-003**: El 100 % de los estilos propios guardados se restauran idénticos tras cerrar y abrir la aplicación (incluido tras un cierre brusco durante el guardado: el archivo nunca queda parcial).
- **SC-004**: Con solo los colores básicos de fondo y texto cambiados, la vista previa completa (código, cita, enlaces, tabla, menús) supera contraste 4,5:1 en el 100 % de las combinaciones de la batería de pruebas (claro/oscuro/medios tonos).
- **SC-005**: Un estilo propio aplicado produce las 4 exportaciones con los colores del estilo y se ve completo en interfaz, editor y paneles, verificado con el documento de referencia.
- **SC-006**: Todas las funciones de la ventana son alcanzables y operables con teclado únicamente (revisión de accesibilidad sin bloqueos).
- **SC-007**: La aplicación arranca con un archivo de estilos dañado en el 100 % de las pruebas de corrupción, usando los incluidos y avisando.
- **SC-008**: Abrir la ventana "Temas" no aumenta la memoria privada del árbol de procesos por encima del presupuesto de 250 MB con un documento abierto.

## Assumptions

- Esta función se implementa **después** de `003-upgrade-mdwysiwyg`: usa las variables de tema nuevas y el mecanismo de tematizado por ancestro de la 0.6.0.
- "Ventana Temas": un **panel modal grande** (casi a pantalla completa) dentro de la ventana principal, abierto desde Configuración → Temas… y cerrado con su botón o Escape; no abre una segunda ventana nativa (no suma memoria de otra vista web).
- Los 7 estilos incluidos siguen siendo los actuales (Predeterminado y los de la demo del editor) y de solo lectura; su definición sigue siendo la fuente única para menú, interfaz y exportación, ahora ampliada con los valores de las variables nuevas (spec 003).
- Los estilos propios se guardan en la carpeta de datos de la aplicación (junto a ajustes y sesión), no en el documento; no viajan con los archivos Markdown.
- Fuera de alcance (candidatas futuras): importar/exportar estilos como archivo, compartir estilos, imágenes de fondo, tamaños y tipografías personalizadas más allá de elegir una fuente de una lista, tema automático según el modo claro/oscuro del sistema, atajos para cambiar de estilo.
- Las tipografías se eligen de una lista corta de fuentes del sistema ya usadas por los estilos incluidos; no se instalan ni cargan fuentes.
- El selector de color es el selector gráfico propio de la aplicación o el del sistema web de la ventana, lo que dé una experiencia consistente y sin red; no se añade ninguna dependencia que requiera conexión.
- Se mantienen los criterios del proyecto: trabajo local, todas las pruebas (unitarias, interfaz y nativas) y no subir al remoto hasta que la persona lo indique.
