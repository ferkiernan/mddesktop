# Contract: Export package formats

Estructuras que los escritores deben producir (verificadas por pruebas automáticas; la apertura en Word/LibreOffice se comprueba a mano, ver [quickstart.md](../quickstart.md)).

## HTML

- Un único archivo `.html` UTF-8: `<!doctype html>`, `<meta charset>`, `<title>` = nombre del documento, un `<style>` mínimo (reset + página) y el contenido con estilos en línea.
- Contenedor `.page` de ancho `210mm` centrado; fondo de página = fondo del estilo activo.
- Cero recursos externos: ninguna URL `http(s)://`, `file:`, `asset:` ni `src`/`href` a archivos locales (las imágenes van como `data:`). Los enlaces del documento (`<a href="https://…">`) se conservan como enlaces.

## PDF

- Cabecera `%PDF-1.4`; objetos: catálogo, árbol de páginas, una página por imagen de `595.28 × 841.89` pt con `/XObject` JPEG (`/DCTDecode`, `/DeviceRGB`, 8 bits) dibujado a página completa; tabla `xref` con desplazamientos exactos y `trailer`/`startxref`; termina en `%%EOF`.

## ZIP (base de DOCX y ODT)

- Entradas *stored* (método 0), con CRC-32, cabeceras locales + directorio central + fin de directorio central; nombres UTF-8 con `/`; fecha DOS fija.

## DOCX

Partes: `[Content_Types].xml` (defaults `rels`, `xml`, `jpeg`; override de `/word/document.xml`), `_rels/.rels` → `word/document.xml`, `word/document.xml`, `word/_rels/document.xml.rels` (un `image` por página), `word/media/pageN.jpeg`.

`word/document.xml`: `w:body` con un `w:p` por página; cada uno contiene un `w:drawing` → `wp:anchor` (`behindDoc="1"`, `simplePos` 0, `positionH/V relativeFrom="page"` offset 0, `extent` 7 560 000 × 10 692 000 EMU, `wp:wrapNone`, `a:blip r:embed`) y, salvo la última, un `w:br w:type="page"`; `w:sectPr` con `w:pgSz w:w="11906" w:h="16838"` y `w:pgMar` en 0.

## ODT

Partes: `mimetype` (primera entrada, sin compresión, contenido exacto `application/vnd.oasis.opendocument.text`, sin campo extra), `META-INF/manifest.xml` (documento, `content.xml`, `styles.xml`, cada imagen), `content.xml`, `styles.xml`, `Pictures/pageN.jpeg`.

`content.xml`: estilos automáticos (párrafo con `fo:break-before="page"` y sin márgenes; marco anclado a la página), un `text:p` por página con `draw:frame` (`text:anchor-type="page"`, `svg:x/y` = 0, `svg:width="210mm"`, `svg:height="297mm"`, `draw:image xlink:href="Pictures/pageN.jpeg"`). `styles.xml`: `style:page-layout` A4 (`fo:page-width="210mm" fo:page-height="297mm"`, márgenes `0mm`) y `style:master-page "Standard"`.
