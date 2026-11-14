# Feature Specification: Exportación a Word con contenido editable

**Feature Branch**: `006-native-docx-export`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Al imprimir en docx no deseo que TODA la página sea una captura de pantalla. Quiero que transcribas el texto, y lo que corresponde a tablas lo pases como tablas, y lo que sean GRÁFICOS si puede ser que los tomes como una captura y los insertes dentro del documento."

**Depende de**: `002-export-document` (la exportación que se reemplaza para Word y OpenDocument). Se coordina con `005-export-theme-pagination` (elección de estilo y vista previa) y se beneficia de `003-upgrade-mdwysiwyg`.

## Contexto verificado (2026-11-14)

- Hoy el `.docx` (y el `.odt`) contiene **una imagen JPEG por página A4**: el texto no se puede seleccionar, buscar, copiar ni editar, las tablas no son tablas y el archivo es grande. El PDF funciona igual, pero esta función trata solo Word y OpenDocument (el PDF queda como está).
- El visualizador interno ya produce el documento renderizado, con sus estilos; de él se pueden obtener estructura, texto y formato.
- Los gráficos (diagramas Mermaid) ya se convierten en imagen para la exportación; las imágenes locales ya se resuelven.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El texto del documento es texto en Word (Priority: P1)

La persona exporta a Word y obtiene un documento donde cada párrafo, encabezado, lista, cita y bloque de código es contenido real de Word: se puede seleccionar, buscar, copiar, corregir y reformatear, y los encabezados aparecen en el panel de navegación.

**Why this priority**: Es el núcleo del pedido; un documento hecho de fotos no es un documento de Word.

**Independent Test**: Exportar el documento de referencia a `.docx`, abrirlo en Word: seleccionar un párrafo, buscar una palabra, abrir el panel de navegación y editar una frase.

**Acceptance Scenarios**:

1. **Given** un documento con encabezados de nivel 1 a 6, párrafos y énfasis, **When** se exporta a Word, **Then** los encabezados usan los estilos de encabezado de Word (aparecen en el panel de navegación) y los párrafos son texto editable con negrita, cursiva, tachado y código en línea conservados.
2. **Given** listas con viñetas, numeradas, anidadas (al menos 4 niveles) y listas de tareas, **When** se exporta, **Then** son listas de Word con su numeración o viñeta correcta y sangría por nivel; las tareas muestran ☐ o ☑ según su estado.
3. **Given** enlaces, **When** se exporta, **Then** son hipervínculos funcionales con el texto visible original.
4. **Given** citas y líneas horizontales, **When** se exporta, **Then** aparecen como cita (con sangría y barra lateral) y como línea separadora.
5. **Given** un bloque de código, **When** se exporta, **Then** se conserva la tipografía de ancho fijo, el fondo, la sangría y los espacios, las líneas largas se ajustan a la página (no se cortan) y el texto es seleccionable.
6. **Given** el documento exportado, **When** se extrae su texto, **Then** coincide con el texto del documento original, en el mismo orden y sin caracteres perdidos (comprobado sobre un documento de referencia).

---

### User Story 2 - Las tablas son tablas de Word (Priority: P1)

Las tablas del documento aparecen como tablas de Word, con filas, columnas y celdas editables, el encabezado diferenciado, la alineación de columnas respetada y el formato interno (negrita, enlaces, código) conservado.

**Why this priority**: Es lo segundo que pidió explícitamente; además evita los cortes de tabla en las páginas.

**Independent Test**: Exportar el documento con una tabla de 5 columnas y 120 filas, abrir en Word, comprobar que se puede añadir una fila, que el encabezado se repite en cada página y que ninguna fila queda partida entre páginas.

**Acceptance Scenarios**:

1. **Given** una tabla, **When** se exporta, **Then** es una tabla de Word con el mismo número de filas y columnas, con el texto de cada celda editable.
2. **Given** una tabla con columnas alineadas a izquierda, centro o derecha, **When** se exporta, **Then** cada columna conserva su alineación.
3. **Given** una tabla más larga que una página, **When** se abre en Word, **Then** la fila de encabezado se repite al inicio de cada página y ninguna fila se parte entre dos páginas.
4. **Given** una tabla más ancha que el ancho útil de la página, **When** se exporta, **Then** se ajusta al ancho de la página con columnas proporcionales, sin salirse de los márgenes.
5. **Given** celdas con formato (negrita, enlaces, código en línea, saltos de línea), **When** se exporta, **Then** se conserva dentro de la celda.
6. **Given** el estilo elegido, **When** se exporta, **Then** el fondo del encabezado, los bordes y los colores de texto de la tabla siguen ese estilo.

---

### User Story 3 - Las imágenes y los gráficos se insertan como imágenes dentro del texto (Priority: P1)

Las imágenes del documento se insertan como imágenes de Word, y los gráficos que no pueden ser texto (diagramas Mermaid) se capturan como imagen y se insertan en su lugar, entre el resto del texto editable.

**Why this priority**: Es la excepción pedida: los gráficos pueden ser captura, pero solo ellos.

**Independent Test**: Exportar un documento con una imagen local, un diagrama Mermaid y texto entre ambos; abrir en Word y comprobar que son imágenes seleccionables con el texto circundante editable.

**Acceptance Scenarios**:

1. **Given** una imagen local (relativa o absoluta), **When** se exporta, **Then** se inserta como imagen de Word en su resolución original (no como captura de pantalla de la página) y con su texto alternativo.
2. **Given** un diagrama Mermaid, **When** se exporta, **Then** se inserta una imagen nítida del diagrama tal como se ve en el visualizador, con un texto alternativo que lo identifica como diagrama.
3. **Given** una imagen o diagrama más ancho que el área útil, **When** se exporta, **Then** se reduce proporcionalmente al ancho útil; si además es más alto que una página, se reduce hasta caber en una página, sin deformarse.
4. **Given** una imagen que no se puede cargar (ruta rota, sin red), **When** se exporta, **Then** se inserta un texto indicando la imagen faltante y la exportación avisa al terminar, sin impedir el guardado.
5. **Given** un diagrama que no se puede dibujar, **When** se exporta, **Then** se inserta su código fuente como bloque de código con un aviso, en lugar de fallar.
6. **Given** una imagen con enlace, **When** se exporta, **Then** conserva el enlace.

---

### User Story 4 - El documento respeta el estilo elegido y es legible (Priority: P2)

El documento exportado usa los colores y tipografías del estilo elegido para la exportación (el activo o el que se elija en la ventana de la especificación 005), de modo que se parece al visualizador sin sacrificar la edición; en estilos oscuros el documento sigue siendo legible.

**Why this priority**: Mantiene el compromiso de 002 de que lo exportado se parece al visualizador y evita texto claro sobre papel blanco.

**Independent Test**: Exportar con un estilo claro y con uno oscuro; abrir en Word y comprobar colores de texto, encabezados, enlaces, código y tablas, y legibilidad.

**Acceptance Scenarios**:

1. **Given** un estilo elegido, **When** se exporta, **Then** el texto, los encabezados, los enlaces, las citas, el fondo de los bloques de código y de los encabezados de tabla usan los colores de ese estilo.
2. **Given** código con resaltado de sintaxis, **When** se exporta, **Then** los fragmentos conservan los colores de resaltado del estilo (palabras clave, cadenas, comentarios, números, títulos).
3. **Given** un estilo oscuro, **When** se exporta, **Then** el documento aplica el color de fondo de página del estilo para que el texto claro sea legible, y se avisa de que Word imprime sin color de fondo salvo que se active esa opción de impresión.
4. **Given** las tipografías del estilo, **When** se exporta, **Then** el documento usa esas tipografías o, si no es habitual que estén instaladas en el equipo que lo abra, una sustituta de aspecto similar de uso común, de modo que Word no tenga que sustituirla de forma impredecible.
5. **Given** cualquier estilo, **When** se exporta, **Then** el contraste entre texto y fondo de cada elemento es de al menos 4,5:1.

---

### User Story 5 - OpenDocument recibe el mismo tratamiento (Priority: P2)

El archivo `.odt` se genera con el mismo criterio: texto, tablas, listas y enlaces reales, y solo los gráficos como imagen.

**Why this priority**: Es el mismo problema y la misma representación de documento; dejar `.odt` como imágenes sería incoherente. (Decisión por defecto: no se pidió expresamente; se puede retirar del alcance.)

**Independent Test**: Exportar el documento de referencia a `.odt` y abrirlo en LibreOffice: seleccionar texto, editar una celda, comprobar la imagen del diagrama.

**Acceptance Scenarios**:

1. **Given** el documento de referencia, **When** se exporta a `.odt`, **Then** se cumplen los criterios de las historias 1 a 4 en el formato OpenDocument (encabezados, listas, tablas con encabezado repetido, imágenes, hipervínculos, estilo).
2. **Given** el mismo documento, **When** se exporta a `.docx` y a `.odt`, **Then** ambos contienen el mismo texto, estructura y número de tablas e imágenes.

---

### User Story 6 - Archivo compatible, ligero y con errores claros (Priority: P3)

El archivo abre sin avisos de reparación en Word y LibreOffice, pesa mucho menos que antes cuando hay poco contenido gráfico y, si algo no se pudo convertir, la persona lo sabe.

**Why this priority**: Un archivo que Word "repara" al abrir o que pesa decenas de MB resta confianza.

**Independent Test**: Abrir los archivos en Word y LibreOffice sin mensajes de reparación; comparar tamaños con la versión anterior.

**Acceptance Scenarios**:

1. **Given** el documento de referencia exportado, **When** se abre en Word y en LibreOffice, **Then** se abre sin mensajes de error ni de reparación.
2. **Given** un documento de 10 páginas solo de texto y tablas, **When** se exporta, **Then** el archivo pesa menos de 100 KB.
3. **Given** un elemento que no se pudo convertir fielmente (imagen faltante, diagrama no dibujable, elemento sin equivalente), **When** termina la exportación, **Then** un aviso lo lista y el archivo se guarda igualmente con una representación razonable del elemento.
4. **Given** un error al generar el archivo, **When** ocurre, **Then** no queda un archivo parcial y se muestra un mensaje en español.

---

### Edge Cases

- Documento vacío: se genera un documento de Word válido con una página vacía.
- Tabla con una sola columna o una sola fila; tablas vacías; celdas vacías: se generan tablas válidas.
- Celdas con listas o bloques de código (sin equivalente exacto en Markdown estricto): el contenido se conserva como texto de la celda, con saltos de línea.
- Mezcla de HTML incrustado en el Markdown: se exporta como texto/estructura lo que el visualizador muestra; lo que no tiene equivalente se informa en los avisos.
- Caracteres especiales (emoji, tildes, símbolos matemáticos, texto de derecha a izquierda, caracteres que XML no admite): se conservan o se sustituyen de forma segura sin corromper el archivo.
- Texto muy largo sin espacios (URLs): se ajusta en la página, no se sale del margen.
- Documento de cientos de páginas: la exportación no bloquea la interfaz y muestra progreso (como en 002).
- Imágenes enormes (p. ej. 8000 px): se reducen a una resolución útil para el ancho de página para no inflar el archivo, conservando la proporción.
- Títulos repetidos o saltos de nivel de encabezado (de H1 a H4): se conservan tal cual.
- Notas al pie, índice, numeración de páginas y encabezados/pies de página: no se generan (fuera de alcance).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Al exportar a Word (`.docx`), el contenido MUST generarse como contenido nativo del formato (texto, estilos de encabezado, listas, tablas, hipervínculos, imágenes), no como imágenes de páginas; el texto de todo el documento MUST ser seleccionable, buscable y editable.
- **FR-002**: Los encabezados MUST usar los estilos de encabezado del formato (niveles 1 a 6), de modo que aparezcan en el panel de navegación y en un índice si la persona lo añade.
- **FR-003**: Los énfasis (negrita, cursiva, tachado, código en línea), enlaces, citas, líneas horizontales, listas (viñetas, numeradas, anidadas hasta 4 niveles como mínimo, de tareas con ☐/☑) MUST conservarse con su semántica.
- **FR-004**: Los bloques de código MUST conservarse como texto con tipografía de ancho fijo, fondo diferenciado, sangría y espacios intactos y colores de resaltado del estilo; las líneas largas MUST ajustarse sin cortarse.
- **FR-005**: Las tablas MUST generarse como tablas nativas del formato con las mismas filas, columnas y texto de celda, encabezado diferenciado y repetido en cada página, alineación de columnas, formato interno de celda, ajuste al ancho útil y filas que no se parten entre páginas.
- **FR-006**: Las imágenes MUST insertarse como imágenes nativas (no como captura de la página) con su texto alternativo, escaladas proporcionalmente al ancho útil y a la altura de una página, y con resolución suficiente sin superar un tope razonable para no inflar el archivo.
- **FR-007**: Los gráficos sin equivalente textual (diagramas Mermaid) MUST capturarse como imagen nítida e insertarse en su posición, con texto alternativo; el resto del documento MUST NOT convertirse en imagen.
- **FR-008**: Las imágenes o diagramas que fallen MUST sustituirse por un texto informativo (imagen faltante) o por el código fuente del diagrama, con un aviso final; la exportación MUST completarse.
- **FR-009**: El documento MUST usar página A4 con márgenes razonables, y MUST respetar el estilo elegido (colores de texto, encabezados, enlaces, citas, código y tablas); en estilos oscuros MUST aplicar el color de fondo de página y avisar de la opción de impresión de fondos.
- **FR-010**: El contraste entre texto y fondo de cada elemento MUST ser de al menos 4,5:1, ajustando el color del texto si el estilo elegido no lo cumple en el documento exportado.
- **FR-011**: Las tipografías MUST ser las del estilo cuando sean de uso común; en otro caso MUST usarse una sustituta de uso común de aspecto similar, declarando la familia genérica.
- **FR-012**: El formato OpenDocument (`.odt`) MUST recibir el mismo tratamiento nativo, con el mismo contenido y estructura que el `.docx` para el mismo documento.
- **FR-013**: Los archivos MUST abrirse sin avisos de error ni reparación en Word y en LibreOffice; un documento de 10 páginas solo de texto y tablas MUST pesar menos de 100 KB.
- **FR-014**: Todo lo exigido en 002 que sigue aplicando MUST mantenerse: contenido actual sin guardar, el documento original no se modifica, aviso de progreso, sin archivos parciales, mensajes en español, escritura en una ruta autorizada.
- **FR-015**: El PDF y el HTML MUST quedar sin cambios con esta función.
- **FR-016**: Al terminar, un aviso MUST listar cualquier elemento que no se pudo convertir fielmente; el archivo MUST guardarse igualmente.

### Key Entities

- **Documento estructurado**: representación intermedia del documento renderizado (encabezados, párrafos con formato, listas, tablas, bloques de código, imágenes, enlaces) de la que se generan `.docx` y `.odt` con el mismo contenido.
- **Elemento gráfico**: imagen local o diagrama que se inserta como imagen con texto alternativo.
- **Aviso de conversión**: mensaje que identifica un elemento no convertido fielmente y lo que se hizo en su lugar.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el documento de referencia, el texto extraído del `.docx` coincide con el del documento original en el 100 % de los caracteres y en el mismo orden (excluyendo imágenes).
- **SC-002**: El 100 % de las tablas del documento de referencia son tablas nativas con las mismas filas y columnas, y el encabezado se repite en cada página en las tablas largas.
- **SC-003**: Las únicas imágenes en el archivo son las imágenes del documento y los diagramas: 0 imágenes de páginas completas ni de bloques de texto o tablas.
- **SC-004**: El archivo se abre sin mensajes de error ni de reparación en Word y LibreOffice en el 100 % de los documentos de la batería de pruebas (incluido el documento vacío y los casos extremos).
- **SC-005**: Un documento de 10 páginas de texto y tablas pesa menos de 100 KB (antes, varios MB).
- **SC-006**: En el documento de referencia exportado con los 7 estilos incluidos, el contraste texto/fondo de todos los elementos es ≥ 4,5:1.
- **SC-007**: Una persona puede editar una frase, corregir una celda de tabla y buscar una palabra en el documento exportado en menos de 1 minuto sin ninguna conversión previa.
- **SC-008**: Las exportaciones `.docx` y `.odt` del mismo documento contienen el mismo texto, el mismo número de tablas e imágenes y los mismos encabezados en el 100 % de las pruebas.
- **SC-009**: La exportación del documento de referencia no supera el presupuesto de memoria de 250 MB ni bloquea la interfaz más de 100 ms seguidos.

## Assumptions

- Esta función **reemplaza** el modo de páginas de imagen para `.docx` y `.odt`; no se ofrece como opción (candidata futura: "copia fiel como imágenes").
- La maquetación y los saltos de página de Word/OpenDocument los decide el programa que abre el archivo; por tanto, las reglas de paginación de la especificación 005 (cortes, vista previa idéntica) ya no aplican a estos formatos. La vista previa de la ventana de exportación para `.docx`/`.odt` es una **aproximación** del contenido y el estilo, no del reparto exacto en páginas.
- Fuera de alcance: números de página, encabezados y pies de página, notas al pie, índice automático, comentarios, control de cambios, plantillas de Word, texto seleccionable en PDF (candidata futura), imágenes de fondo.
- La fidelidad visual es la del estilo elegido aplicado con estilos nativos del formato; pequeñas diferencias de maquetación respecto del visualizador (espaciados, bordes redondeados, sombras) son aceptables si el contenido y el color se conservan.
- Las pruebas en Word las realiza la persona propietaria en su equipo; el resto se verifica con validaciones automáticas de estructura del archivo y, si está disponible, abriéndolo con LibreOffice.
- El resaltado de sintaxis se conserva por colores de texto (no por estilos de lenguaje); los colores provienen del estilo elegido.
- Las imágenes remotas siguen el comportamiento de 002 (se incrustan si hay conexión o se avisa).
- Se mantienen los criterios del proyecto: trabajo local, pruebas unitarias, de interfaz y nativas (incluida la validación de estructura de los archivos generados) y no subir al remoto hasta que la persona lo indique.
