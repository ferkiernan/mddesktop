# Research: Exportar documento

**Fecha**: 2026-11-02 | **Spec**: [spec.md](spec.md)

Convención: **Verificado** = comprobado en la app real (WebView2) o en el código; **A validar** = tarea de verificación en la implementación.

## R1. De dónde sale el contenido renderizado

- **Decisión**: montar un visor *fuera de pantalla* (contenedor oculto con ancho A4 útil) con el mismo componente `mdwysiwyg` en modo solo lectura, con el contenido actual del documento y el estilo de editor vigente, y tomar su DOM como fuente.
- **Justificación**: es el mismo motor y los mismos estilos que ve el usuario (FR-003); no depende de la vista activa (visual o código), ni de que el editor del documento esté montado en el pool, y usa el contenido sin guardar (FR-002).
- **Alternativas**: tomar el `.ProseMirror` del editor visible (falla en vista código o si el documento salió del pool); renderizar con una cadena remark/rehype propia (duplica el motor y los estilos, rompe la constitución IX).

## R2. Instantánea autocontenida (DOM → HTML con estilos incrustados)

- **Decisión**: clonar el contenido y copiar a cada elemento un conjunto acotado de propiedades CSS *computadas* (color, fondo, tipografía, bordes, márgenes/rellenos, listas, tablas, sombras, display, etc.) como `style` en línea; dejar intactos los `<svg>` (Mermaid) porque ya traen sus estilos; convertir `<img>` a `data:` URIs (leyéndolas por el protocolo `asset:` o `data:`); reflejar el estado de las casillas de tareas con el atributo `checked`.
- **Justificación**: las propiedades computadas ya tienen resueltas las variables CSS `--mdw-*` y el estilo activo, por lo que el HTML resultante no depende de hojas de estilo externas (FR-005) y es idéntico al visor. Una lista acotada mantiene el archivo pequeño.
- **Alternativas**: copiar *todas* las propiedades computadas (archivos enormes); incluir las hojas de estilo de la librería (dependen de variables y nombres de clase, frágil).
- **A validar**: pseudo-elementos (`::marker`, `::before`) no se copian; las viñetas nativas se conservan por `list-style`.

## R3. Rasterizar páginas A4 sin dependencias

- **Decisión**: dibujar cada página como imagen SVG con `<foreignObject>` que contiene la instantánea, cargarla en un `Image` y pintarla en un `canvas` (escala 2×, ≈192 dpi) y exportar JPEG/PNG.
- **Verificado** (spike en WebView2 real, 2026-11-02): HTML con degradado, tabla, SVG en línea e imagen `data:` se pinta en el canvas **sin contaminarlo** (`toBlob` y `getImageData` funcionan); un JPEG de 1588×600 pesa ~28 KB.
- **Justificación**: cero dependencias nuevas (constitución I/IX), funciona sin red, fidelidad visual del motor de Chromium. Requiere que todo recurso esté en línea (R2).
- **Alternativas**: `html2canvas`/`dom-to-image` (dependencias y fidelidad inferior); `PrintToPdf` de WebView2 vía COM en Rust (PDF vectorial, pero solo Windows, código `unsafe`, ventana oculta adicional y no sirve para Word/ODT) — se deja como mejora futura para texto seleccionable.

## R4. Paginación A4

- **Decisión**: página = 794 × 1123 px CSS (A4 a 96 dpi), márgenes de 15 mm (≈57 px). Los cortes se eligen en límites de bloque: se miden los hijos directos del contenido (y las filas de tabla) y se corta antes del primer bloque que cruza el límite; si un bloque es más alto que el área útil se divide en el límite exacto.
- **Justificación**: cumple FR-004 y FR-006 sin partir líneas de texto en el caso normal.
- **Alternativas**: cortar cada 1123 px sin mirar bloques (parte líneas y gráficos).

## R5. PDF

- **Decisión**: escribir el PDF a mano (objetos: catálogo, páginas, una imagen JPEG `DCTDecode` por página de 595.28 × 841.89 pt, tabla xref válida). Sin dependencias.
- **Justificación**: un PDF de imágenes a página completa es trivial y robusto; respeta visualmente el visor (FR-003/004). Limitación aceptada y documentada: el texto no es seleccionable.

## R6. DOCX y ODT

- **DOCX**: paquete ZIP (sin compresión) con `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels` y `word/media/pageN.jpeg`. Cada página es una imagen *anclada* a la página (`wp:anchor`, `behindDoc`, posición 0,0 relativa a la página, 210 × 297 mm) dentro de un párrafo vacío; las páginas se separan con salto de página; sección A4 con márgenes 0.
- **ODT**: ZIP con `mimetype` primero y sin compresión, `META-INF/manifest.xml`, `content.xml`, `styles.xml`, `Pictures/pageN.jpeg`; formato de página A4 con márgenes 0; cada página es un `draw:frame` anclado a la página (0,0, 210 × 297 mm) en un párrafo con `fo:break-before="page"`.
- **Justificación**: fidelidad exacta (FR-012 requiere abrir sin reparaciones: se usa el esquema mínimo conocido). Cero dependencias; el ZIP "stored" requiere solo CRC-32 (≈40 líneas).
- **Alternativas**: HTML incrustado vía `altChunk` (Word lo reinterpreta con su motor; sin SVG ni variables CSS; sin garantía visual), conversor completo HTML→OOXML/ODF (muy grande, aproximado); librerías `docx`/`jszip` (~400 KB+ y fidelidad inferior).
- **A validar**: apertura real en Word/LibreOffice (no disponibles aquí): se valida la estructura (XML bien formado, relaciones, tipos) con pruebas automáticas y se deja una verificación manual en `quickstart.md`.

## R7. Escritura segura en Rust

- **Decisión**: `pick_export_path(kind, suggestedName)` abre el diálogo nativo (filtro por extensión) y autoriza esa ruta en un conjunto de *rutas de exportación*; `write_export(path, base64)` solo escribe si la ruta fue autorizada por ese diálogo y la extensión es `html/pdf/docx/odt`, mediante escritura atómica (`temp + rename`). Nunca ejecuta procesos.
- **Justificación**: mismo modelo de seguridad que los documentos (constitución V); el frontend no puede escribir rutas arbitrarias. Los bytes viajan en base64 (crate `base64`, una dependencia mínima) para no inflar el IPC con arreglos JSON.

## R8. Progreso y UI

- **Decisión**: aviso de progreso por pasos ("Preparando", "Página 3 de 10", "Guardando") mediante el toast existente y un diálogo bloqueante ligero opcional; cada página se pinta en una tarea cedida al bucle de eventos (`await` entre páginas) para no congelar la interfaz. La captura del contenido se hace al inicio (FR edge: cambiar de pestaña no afecta).
- **Carga bajo demanda** (SC-008): todo el módulo de exportación se importa dinámicamente al elegir la acción.

## R9. Pruebas

- **Unitarias (Vitest)**: ZIP/CRC, XML de DOCX/ODT (bien formado, partes y relaciones), estructura y xref del PDF, paginación (puntos de corte), instantánea (estilos en línea, imágenes `data:`, casillas), flujo de exportación con IPC simulado.
- **Rust**: autorización y escritura de exportaciones.
- **Nativas (CDP)**: exportar los 4 formatos en la app real con un documento que incluye tabla, código, tareas, imagen y Mermaid; comprobar archivos, firmas (`%PDF`, `PK`), páginas A4 y que el HTML no tiene referencias externas.
- **Aislamiento**: las pruebas nativas se ejecutan con un build de identificador distinto (`--config` `com.ferkiernan.mddesktop.dev`) para no chocar con la app instalada en ejecución (instancia única) ni con sus datos.

## Unknowns resueltos / pendientes

| ID | Tema | Estado |
|---|---|---|
| R3 | Canvas con foreignObject no contaminado | Resuelto (spike) |
| R6 | Apertura en Word/LibreOffice | Pendiente de verificación manual (estructura validada automáticamente) |
| R2 | Mermaid y casillas en la instantánea | A validar en la prueba nativa |
