# Feature Specification: Estilo y paginación fiable al exportar

**Feature Branch**: `005-export-theme-pagination`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Al imprimir en pdf, permitime elegir el 'theme' de la impresión (el estilo), con vista previa. Además sucede que en muchos casos quedan TABLAS, o GRÁFICOS, o incluso 'renglones' de texto cortados."

**Depende de**: `002-export-document` (la exportación que se mejora). Se beneficia de `003-upgrade-mdwysiwyg` (más elementos tematizables) y, cuando exista, de `004-custom-themes` (los estilos propios aparecen en la lista).

## Contexto verificado (2026-11-14)

- Hoy la exportación (HTML, PDF, Word, OpenDocument) usa siempre el **estilo activo del editor**; no se puede elegir otro al exportar y no hay vista previa antes de escribir el archivo.
- La paginación actual corta entre bloques cuando el bloque cabe en una página; un bloque más alto que una página se corta en el límite de la página. Esto deja sin garantía: gráficos (diagramas, imágenes) más altos que la página, bloques de código largos, párrafos muy largos y filas de tabla muy altas (se cortan por la mitad, incluso a mitad de un renglón de texto).
- Cada página se recorta al ancho útil de A4: contenido más ancho (tablas anchas, código sin saltos de línea) puede quedar cortado en el lado derecho. **A verificar** en la fase de plan cuál de las dos causas (vertical u horizontal) explica cada caso reportado.
- Las páginas del PDF son imágenes (el texto no se puede seleccionar); eso **no** cambia en esta función. Word y OpenDocument pasan a contenido nativo con la spec `006-native-docx-export` y los pagina el programa que los abre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el estilo de la exportación con vista previa (Priority: P1)

Al elegir Archivo → Exportar → PDF (o cualquier otro formato), antes de pedir el nombre del archivo se abre una ventana donde la persona elige el estilo con el que se verá el documento exportado y ve una vista previa de las páginas A4 tal como saldrán. Puede elegir "Como en pantalla" (estilo activo, predeterminado) o cualquier otro estilo, incluido uno claro pensado para imprimir.

**Why this priority**: Es lo pedido: el aspecto de lo impreso no tiene por qué coincidir con el del editor (p. ej. un estilo oscuro en pantalla y uno claro y sin fondo al imprimir).

**Independent Test**: Con un estilo oscuro activo, exportar a PDF eligiendo un estilo claro en la ventana; abrir el PDF y comprobar colores y fondo del estilo elegido, y que el estilo activo del editor no cambió.

**Acceptance Scenarios**:

1. **Given** un documento abierto, **When** se elige Archivo → Exportar → PDF, **Then** se muestra la ventana de exportación con la lista de estilos (el activo preseleccionado como "Como en pantalla"), la vista previa paginada en A4 y los botones Exportar y Cancelar.
2. **Given** la ventana abierta, **When** se elige otro estilo, **Then** la vista previa se rehace con ese estilo sin cerrar la ventana y sin cambiar el estilo del editor ni de la aplicación.
3. **Given** un estilo elegido, **When** se pulsa Exportar, **Then** aparece el diálogo nativo de guardado y el archivo resultante usa exactamente ese estilo (colores, fondo, tipografías), con las mismas páginas que mostraba la vista previa.
4. **Given** la ventana abierta, **When** se cancela, **Then** no se crea ningún archivo y no se cambia nada.
5. **Given** la ventana abierta, **When** se exporta, **Then** el documento Markdown original no se modifica ni se marca como modificado.
6. **Given** una exportación anterior, **When** se vuelve a abrir la ventana, **Then** se recuerda el último estilo elegido para exportar (si ya no existe, se usa "Como en pantalla").

---

### User Story 2 - Nada queda cortado en las páginas (Priority: P1)

En el archivo exportado ningún elemento se ve cortado en el borde de una página: las tablas no pierden filas ni columnas ni se parten por la mitad de un renglón, los gráficos (diagramas Mermaid, imágenes) aparecen completos y los renglones de texto y de código nunca se parten a lo alto.

**Why this priority**: Es el defecto reportado y afecta a la utilidad de todos los formatos paginados; un documento con tablas o gráficos cortados no es entregable.

**Independent Test**: Exportar un documento de prueba con tabla corta, tabla de 120 filas, tabla de 12 columnas, diagrama más alto que una página, imagen grande, bloque de código de 200 líneas y párrafos de 40 líneas, a PDF; recorrer cada página y comprobar que no hay ningún renglón, fila, gráfico ni columna cortados.

**Acceptance Scenarios**:

1. **Given** una tabla que cabe en una página, **When** el salto de página cae dentro de ella, **Then** la tabla pasa completa a la página siguiente (si cabe) en lugar de partirse.
2. **Given** una tabla más alta que una página, **When** se exporta, **Then** se parte solo entre filas y la fila de encabezado se repite al comienzo de cada página de continuación; ninguna fila queda cortada.
3. **Given** un gráfico (diagrama o imagen) más alto que el espacio útil de una página, **When** se exporta, **Then** se reduce proporcionalmente hasta caber entera en una página, sin deformarse y sin cortarse.
4. **Given** una tabla, un diagrama, un bloque de código o cualquier elemento más ancho que el ancho útil de A4, **When** se exporta, **Then** se ajusta al ancho (reduciendo proporcionalmente) o se parte en líneas; nunca queda recortado en el borde derecho.
5. **Given** un párrafo, lista o bloque de código largos que cruzan un salto de página, **When** se exporta, **Then** el corte cae entre renglones, nunca a mitad de un renglón, y no queda una sola línea huérfana o viuda (al menos 2 líneas de un párrafo a cada lado cuando sea posible).
6. **Given** un encabezado cerca del final de una página, **When** se exporta, **Then** pasa a la página siguiente junto con el contenido que le sigue.
7. **Given** una fila de tabla individual más alta que una página (celda con muchísimo texto), **When** se exporta, **Then** la fila se parte únicamente entre renglones de texto de la celda y el encabezado se repite; ningún renglón queda cortado.

---

### User Story 3 - La vista previa muestra exactamente lo que saldrá (Priority: P2)

La vista previa de la ventana de exportación muestra las mismas páginas, con los mismos saltos de página, que tendrá el archivo; la persona puede recorrerlas, ver el número total de páginas y detectar de antemano cómo se reparte el contenido.

**Why this priority**: Una vista previa que difiere del resultado no sirve; es además la forma de verificar a ojo que no hay cortes.

**Independent Test**: Para el documento de referencia, comparar página a página la vista previa con el PDF resultante (mismo número de páginas y mismos saltos).

**Acceptance Scenarios**:

1. **Given** la ventana abierta, **When** se muestra la vista previa, **Then** presenta las páginas A4 en secuencia, con número de página y total, y permite desplazarse entre ellas con ratón y teclado.
2. **Given** un documento largo, **When** se abre la ventana, **Then** aparece una indicación de progreso mientras se prepara la vista previa y se puede cancelar sin esperar.
3. **Given** el formato elegido (HTML, PDF, Word, OpenDocument), **When** se muestra la ventana, **Then** la vista previa corresponde al formato: páginas A4 para los paginados y una página continua de ancho A4 para HTML.
4. **Given** un estilo nuevo elegido, **When** la vista previa se actualiza, **Then** conserva la página que se estaba mirando cuando sea posible.

---

### User Story 4 - Resultado y errores claros (Priority: P3)

La exportación sigue informando del progreso y del resultado; si no se puede garantizar algo (p. ej. un gráfico reducido por ser muy grande), la persona lo sabe.

**Why this priority**: Evita sorpresas (un gráfico reducido a tamaño ilegible) sin bloquear la exportación.

**Independent Test**: Exportar un documento con un diagrama enorme y comprobar el aviso y que el archivo se crea.

**Acceptance Scenarios**:

1. **Given** un gráfico o tabla reducido más allá de un 50 % de su tamaño original para caber, **When** se exporta, **Then** un aviso lo menciona al terminar, con el elemento afectado, sin impedir el guardado.
2. **Given** un error al generar la vista previa o el archivo, **When** ocurre, **Then** se muestra un mensaje en español, no se deja un archivo parcial y la ventana permite reintentar.

---

### Edge Cases

- Documento vacío o de una sola línea: una página, vista previa correcta.
- Documento con un solo elemento enorme (p. ej. diagrama de varias páginas de alto): una página con el diagrama reducido y aviso.
- Tabla con celdas combinadas o celdas con bloques de código: no se cortan por la mitad; si una fila excede la página se aplica la regla de la fila alta.
- Imágenes remotas o rotas: se muestran como hoy (aviso), sin romper la paginación.
- Estilos con fondo degradado o de color: el fondo cubre cada página completa, también la zona de márgenes.
- Elegir un estilo que se elimina mientras la ventana está abierta (estilos propios, spec 004): la vista previa vuelve a "Como en pantalla" y lo informa.
- Cambiar rápidamente de estilo varias veces: solo importa el último; no se acumulan trabajos ni se muestran resultados viejos.
- Exportar a HTML: el estilo elegido se aplica; no hay saltos de página (una página continua de ancho A4).
- Documentos muy grandes (cientos de páginas): la vista previa puede mostrar las páginas bajo demanda sin bloquear la aplicación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada opción de Archivo → Exportar MUST abrir una ventana de exportación **antes** del diálogo nativo de guardado, con la lista de estilos, la vista previa y los botones Exportar y Cancelar.
- **FR-002**: La lista de estilos MUST incluir "Como en pantalla" (estilo activo, valor inicial en la primera exportación), los 7 estilos incluidos y los estilos propios cuando existan; se MUST ofrecer al menos un estilo claro adecuado para imprimir.
- **FR-003**: El estilo elegido para exportar MUST aplicarse solo a esa exportación: no cambia el estilo del editor, ni el de la aplicación, ni la configuración, salvo recordar la última elección para exportar.
- **FR-004**: La vista previa MUST usar la misma representación y paginación que el archivo final: el número de páginas, los saltos y el aspecto de la vista previa MUST coincidir con el archivo exportado.
- **FR-005**: La vista previa MUST permitir recorrer las páginas (ratón y teclado), mostrar página actual y total, mostrar progreso en documentos largos y poder cancelarse.
- **FR-006**: En el PDF, ningún elemento MUST quedar cortado en el borde de una página ni en el borde derecho: tablas (filas y columnas), gráficos (diagramas, imágenes), bloques de código, listas y párrafos.
- **FR-007**: Un salto de página MUST caer entre filas de tabla, entre renglones de texto/código o entre bloques; nunca dentro de un renglón de texto ni dentro de un gráfico.
- **FR-008**: Una tabla que no cabe en una página MUST partirse entre filas y repetir la fila de encabezado en cada página de continuación.
- **FR-009**: Un gráfico (imagen o diagrama) más alto o más ancho que el espacio útil MUST reducirse proporcionalmente hasta caber, sin deformarse; el contenido más ancho que A4 (tablas, código) MUST ajustarse al ancho (reducción proporcional o salto de línea) y nunca recortarse.
- **FR-010**: Los párrafos y bloques de código que cruzan una página MUST cortarse entre renglones y evitar renglones sueltos (mínimo 2 líneas a cada lado cuando el bloque tenga 4 o más líneas); un encabezado MUST ir siempre con el contenido que le sigue.
- **FR-011**: La exportación MUST avisar al terminar cuando algún elemento haya debido reducirse por debajo del 50 % de su tamaño para caber, indicando cuál, sin impedir el guardado.
- **FR-012**: Se MUST recordar la última elección de estilo para exportar entre sesiones; si ese estilo ya no existe se usa "Como en pantalla".
- **FR-013**: Cancelar la ventana o el diálogo de guardado MUST NOT crear archivos ni cambiar el documento; exportar MUST NOT modificar ni marcar como modificado el documento original ni el estilo activo.
- **FR-014**: Todo lo exigido a la exportación en la especificación 002 (ancho A4, contenido actual sin guardar, un solo archivo autocontenido para HTML, aviso de progreso, sin archivos parciales) MUST seguir cumpliéndose.
- **FR-015**: La ventana MUST ser operable con teclado (lista de estilos, vista previa, botones), con etiquetas accesibles, y MUST cerrarse con Escape (equivalente a Cancelar).

### Key Entities

- **Estilo de exportación**: el estilo (incluido, propio o "Como en pantalla") con el que se pinta el documento exportado; su elección se recuerda.
- **Vista previa de exportación**: secuencia de páginas A4 (o página continua en HTML) generada con el estilo elegido, idéntica al resultado.
- **Salto de página**: posición donde termina una página; solo puede caer en las posiciones permitidas por FR-007.
- **Aviso de reducción**: mensaje que nombra un elemento reducido por debajo del 50 % para caber.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el documento de referencia (tablas cortas y de 120 filas, tabla de 12 columnas, diagrama más alto que una página, imagen grande, código de 200 líneas, párrafos de 40 líneas, listas anidadas), el 100 % de las páginas de las exportaciones paginadas no contienen ningún elemento cortado a mitad de renglón, fila, columna o gráfico, comprobado por una verificación automática sobre las páginas generadas y por revisión visual.
- **SC-002**: El número de páginas y la posición de los saltos de la vista previa coinciden con los del archivo exportado en el 100 % de las pruebas para el PDF; para Word y OpenDocument la vista previa es aproximada (contenido y colores, no reparto de páginas).
- **SC-003**: La vista previa de un documento de 10 páginas aparece en menos de 5 segundos tras abrir la ventana y se actualiza en menos de 5 segundos al cambiar de estilo.
- **SC-004**: Una persona puede exportar un documento a PDF con un estilo distinto del activo, viendo la vista previa, en menos de 30 segundos desde el menú hasta el archivo guardado.
- **SC-005**: Tras exportar con otro estilo, el estilo del editor y de la aplicación permanece idéntico en el 100 % de los casos.
- **SC-006**: Con el estilo "Como en pantalla" y sin tablas ni gráficos problemáticos, el archivo exportado es visualmente equivalente al de la versión anterior (mismo aspecto y a lo sumo ±1 página en el documento de referencia por la nueva regla de renglones sueltos).
- **SC-007**: La exportación del documento de referencia no supera el presupuesto de memoria de 250 MB del proyecto y la vista previa de un documento de 100 páginas no bloquea la interfaz más de 100 ms seguidos.

## Assumptions

- Alcance: la ventana de exportación aparece para los cuatro formatos. Las reglas de paginación (cortes, vista previa idéntica al archivo, FR-004 a FR-011) aplican al **PDF**, el único formato cuyas páginas genera la aplicación. Word y OpenDocument pasan a contenido nativo (especificación `006-native-docx-export`) y los pagina el programa que los abre: para ellos la ventana ofrece la elección de estilo y una vista previa **aproximada** del contenido y los colores, no del reparto exacto en páginas. El HTML solo gana la elección de estilo y la vista previa (página continua).
- Los estilos disponibles son los de la aplicación (los 7 incluidos, y los propios de la especificación 004 cuando existan); no se crea un editor de estilos específico para imprimir. "Estilo claro para imprimir" es uno de los 7 existentes o uno nuevo incluido aprobado en el plan.
- Los saltos de página se calculan automáticamente; no se ofrece edición manual de saltos, márgenes ni tamaño de papel (A4 fijo, como en 002).
- Las páginas siguen siendo imágenes (texto no seleccionable); hacer el texto seleccionable/buscable y vectorial es una mejora **fuera de alcance** (candidata futura) porque cambia el motor de generación.
- Reducir un gráfico para que quepa es preferible a cortarlo; el umbral de aviso del 50 % es un valor por defecto razonable.
- "Renglón suelto" significa una sola línea de un párrafo o bloque de código aislada al inicio o al final de una página; la regla de 2 líneas es la práctica tipográfica habitual.
- La vista previa se calcula en el equipo, sin red, con el mismo visor oculto que ya usa la exportación; no se añade ninguna dependencia que requiera conexión.
- Se mantienen los criterios del proyecto: trabajo local, pruebas unitarias, de interfaz y nativas (incluida la verificación automática de cortes) y no subir al remoto hasta que la persona lo indique.
