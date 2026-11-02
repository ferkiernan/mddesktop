# Feature Specification: Exportar documento

**Feature Branch**: `002-export-document`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Archivo > Exportar: exportar el contenido renderizado del documento activo (con los estilos del estilo de editor activo, gráficos Mermaid, tablas, código resaltado, imágenes y listas de tareas) a HTML autocontenido, PDF, Word (.docx) y OpenDocument (.odt), siempre con ancho A4."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exportar a una página web autocontenida (Priority: P1)

El usuario abre un documento, elige Archivo → Exportar → Página web, elige nombre y ubicación en el diálogo nativo y obtiene un único archivo `.html` que, abierto en cualquier navegador sin conexión, se ve igual que el visualizador de la aplicación.

**Why this priority**: Es el formato base: los demás formatos reutilizan la misma representación visual. Por sí solo ya entrega valor (compartir/publicar un documento con su aspecto).

**Independent Test**: Abrir un documento con encabezados, tabla, bloque de código, lista de tareas, imagen local y un gráfico Mermaid; exportar a HTML; abrir el archivo resultante sin red y comparar visualmente con el visualizador.

**Acceptance Scenarios**:

1. **Given** un documento abierto con un estilo de editor activo, **When** el usuario exporta a HTML, **Then** se crea un único archivo cuyo contenido muestra los mismos colores, fuentes, fondo, tablas y bloques de código que el visualizador.
2. **Given** un documento con una imagen local relativa y un gráfico Mermaid, **When** se exporta, **Then** la imagen y el gráfico aparecen en el archivo sin depender de otros archivos ni de Internet.
3. **Given** el archivo HTML exportado, **When** se abre en un navegador, **Then** el contenido ocupa un ancho equivalente a una página A4 (210 mm), centrado.

---

### User Story 2 - Exportar a PDF fiel al visualizador (Priority: P1)

El usuario exporta el documento a PDF y obtiene páginas A4 que respetan visualmente lo que ve en el visualizador (estilos, gráficos, tablas), sin cortar líneas de texto por la mitad entre páginas.

**Why this priority**: PDF es el formato de entrega más habitual para compartir documentos.

**Independent Test**: Exportar el documento de prueba a PDF, abrirlo en un lector y comprobar tamaño de página A4, fidelidad visual y que los saltos de página caen entre bloques.

**Acceptance Scenarios**:

1. **Given** un documento largo, **When** se exporta a PDF, **Then** todas las páginas son A4 y el documento completo está presente en orden.
2. **Given** un documento con un estilo oscuro, **When** se exporta, **Then** el fondo y los colores del estilo se conservan en cada página.
3. **Given** un párrafo, una fila de tabla o un gráfico que cabe en una página, **When** caería sobre el borde de página, **Then** se mueve entero a la página siguiente.

---

### User Story 3 - Exportar a Word y a OpenDocument (Priority: P2)

El usuario exporta el documento a `.docx` o `.odt` y, al abrirlo en Word o LibreOffice, ve cada página A4 tal cual el visualizador.

**Why this priority**: Atiende a quienes necesitan un formato de oficina; depende de la misma representación visual que las historias 1 y 2.

**Independent Test**: Exportar el documento de prueba a `.docx` y a `.odt`, abrirlos en Word y LibreOffice y comprobar páginas A4 con el aspecto del visualizador.

**Acceptance Scenarios**:

1. **Given** un documento abierto, **When** se exporta a Word, **Then** el archivo se abre en Word con páginas A4 que reproducen el visualizador.
2. **Given** el mismo documento, **When** se exporta a OpenDocument, **Then** el archivo se abre en un procesador compatible con el mismo resultado visual y tamaño A4.

---

### User Story 4 - Resultado, progreso y errores claros (Priority: P2)

El usuario recibe confirmación de que la exportación terminó (con la ubicación del archivo) o un mensaje claro si falló o si canceló el diálogo; la aplicación sigue utilizable mientras se exporta.

**Why this priority**: Evita incertidumbre en documentos largos y protege contra pérdidas por fallos.

**Independent Test**: Exportar un documento largo y observar el aviso de progreso y el de finalización; provocar un error de escritura (destino de solo lectura) y comprobar el mensaje.

**Acceptance Scenarios**:

1. **Given** una exportación en curso, **When** tarda más de un instante, **Then** se muestra un aviso de progreso y al terminar otro con el archivo creado.
2. **Given** el diálogo de guardado, **When** el usuario cancela, **Then** no se crea ningún archivo ni se muestra un error.
3. **Given** un destino sin permiso de escritura, **When** se exporta, **Then** se informa el motivo y ningún archivo parcial queda en disco.

---

### Edge Cases

- Documento vacío: se exporta una página A4 en blanco con el fondo del estilo (sin error).
- Documento muy largo (decenas de páginas): se exporta completo; el progreso informa el avance y la interfaz no se bloquea.
- Un bloque más alto que una página (tabla o gráfico enorme): se divide en el límite de página en lugar de perderse.
- Imagen que no se puede leer (ruta inexistente): se omite con el texto alternativo y se avisa al terminar; el resto se exporta.
- Gráfico Mermaid con sintaxis inválida: se exporta el texto del bloque tal como lo muestra el visualizador.
- Documento nuevo sin guardar o con cambios sin guardar: se exporta el contenido actual sin guardar el archivo Markdown.
- El usuario cambia de pestaña o edita mientras se exporta: la exportación usa el contenido capturado al iniciarla.
- Nombre de archivo existente: el diálogo nativo pide confirmar la sobrescritura.
- Exportar sin documento abierto: la opción está deshabilitada o muestra un aviso, sin error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El menú Archivo MUST incluir un submenú "Exportar" con cuatro opciones: Página web (.html), PDF (.pdf), Word (.docx) y OpenDocument (.odt).
- **FR-002**: La exportación MUST usar el contenido actual del documento activo, incluidos cambios sin guardar, y MUST NOT modificar ni guardar el archivo Markdown original.
- **FR-003**: El contenido exportado MUST reproducir el visualizador: estilos del estilo de editor activo (colores, tipografías, fondo), encabezados, énfasis, listas, listas de tareas con su estado, tablas, enlaces, bloques de código con resaltado, imágenes y gráficos Mermaid renderizados.
- **FR-004**: Todas las exportaciones MUST tener ancho de página A4 (210 mm); PDF, Word y OpenDocument MUST ser paginados en A4 (210 × 297 mm).
- **FR-005**: La exportación a HTML MUST producir un único archivo autocontenido: imágenes, gráficos y estilos incrustados, sin referencias a archivos locales ni a recursos de Internet, visible sin conexión.
- **FR-006**: En los formatos paginados, los saltos de página MUST caer entre bloques de contenido siempre que el bloque quepa en una página; un bloque más alto que una página se divide en el límite.
- **FR-007**: El usuario MUST elegir nombre y ubicación con un diálogo nativo de guardado, con la extensión del formato elegido y un nombre sugerido derivado del documento.
- **FR-008**: Si el usuario cancela el diálogo, el sistema MUST NOT crear archivos ni mostrar errores.
- **FR-009**: La escritura del archivo MUST ser segura: nunca dejar un archivo parcial o dañado ante un fallo, y solo sobre la ruta elegida por el usuario en el diálogo.
- **FR-010**: El sistema MUST informar el progreso de exportaciones que tarden y el resultado final (archivo creado y su ubicación) o el motivo del error, y la aplicación MUST seguir respondiendo durante la exportación.
- **FR-011**: La exportación MUST funcionar sin conexión y sin herramientas externas instaladas, y MUST NOT ejecutar comandos del sistema.
- **FR-012**: Los archivos Word y OpenDocument MUST abrirse sin errores ni avisos de reparación en Microsoft Word y LibreOffice, con páginas A4.
- **FR-013**: Elementos no exportables (imagen ilegible) MUST degradar con elegancia: se omiten con su texto alternativo, se avisa al terminar y el resto del documento se exporta.

### Key Entities

- **Exportación**: operación sobre un documento: formato elegido (html, pdf, docx, odt), contenido capturado, estilo de editor vigente, ruta de destino elegida, estado (en curso, terminada, cancelada, fallida) y mensaje de resultado.
- **Página exportada**: porción A4 (210 × 297 mm) del contenido renderizado, delimitada en límites de bloque, usada por los formatos paginados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario completa una exportación (elegir formato, nombre y guardar) en menos de 30 segundos para un documento de 5 páginas.
- **SC-002**: Un documento de 10 páginas A4 se exporta a cualquiera de los cuatro formatos en menos de 20 segundos sin congelar la interfaz.
- **SC-003**: El 100 % de los archivos exportados tiene ancho A4 (210 mm); los formatos paginados tienen páginas de 210 × 297 mm.
- **SC-004**: En una revisión visual lado a lado con el visualizador, el contenido exportado conserva colores, fuentes, fondo, tablas, código, imágenes y gráficos sin elementos faltantes en el 100 % del documento de prueba.
- **SC-005**: El HTML exportado se abre y se ve completo sin conexión y sin los archivos originales presentes (0 recursos externos).
- **SC-006**: Los archivos Word y OpenDocument se abren sin avisos de reparación en el 100 % de las pruebas.
- **SC-007**: Ante cualquier fallo de exportación, 0 archivos parciales o dañados quedan en el destino y el 100 % de los fallos muestra un mensaje comprensible.
- **SC-008**: La exportación no agrega procesos residentes ni consumo de memoria significativo cuando no se usa (la funcionalidad se carga bajo demanda).

## Assumptions

- La petición original decía "ODT(docx)"; por ser ambiguo se ofrecen ambos formatos: Word (.docx) y OpenDocument (.odt).
- Prioridad: fidelidad visual exacta sobre editabilidad. Los formatos PDF, Word y OpenDocument reproducen cada página A4 como imagen del visualizador, por lo que su texto no es seleccionable ni editable; el HTML conserva texto real.
- El contenido se renderiza con el mismo motor y estilo del visualizador, independientemente de la vista (visual o código) activa en pantalla.
- Se exporta un documento por vez (el activo); la exportación por lotes está fuera de alcance.
- Márgenes de página fijos y razonables (aprox. 15 mm); sin encabezados, pies ni numeración de página en esta versión.
- Imágenes remotas (http/https) se incrustan solo si están disponibles; si no, se degradan según FR-013.
- Windows es la plataforma de validación; el diseño no depende de componentes específicos de una plataforma.
- Fuera de alcance: edición del resultado desde la app, plantillas de exportación, protección con contraseña y metadatos avanzados del documento.
