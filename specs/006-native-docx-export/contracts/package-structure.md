# Contract: estructura de los paquetes

**DOCX**: `[Content_Types].xml`, `_rels/.rels`, `docProps/core.xml`, `word/document.xml`, `word/styles.xml` (Normal, Heading1–6 con nivel de esquema, Code, Hyperlink), `word/numbering.xml` (viñetas = 0, decimal = 1, más una `w:num` por lista ordenada), `word/settings.xml`, `word/_rels/document.xml.rels` (estilos, numeración, ajustes, hipervínculos externos, imágenes), `word/media/imageN.(png|jpeg|gif)`. Página A4 (11906 × 16838) con márgenes de 850 twips.

**ODT**: `mimetype` (primero, sin comprimir), `META-INF/manifest.xml`, `content.xml` (`text:h` con `outline-level`, `text:list`, `table:table` con `table:table-header-rows`, `text:a`, `draw:frame/draw:image`), `styles.xml` (página A4, márgenes de 15 mm, fondo en estilos oscuros), `meta.xml`, `Pictures/imageN.*`.
