# Research: Word/ODT nativos

## R1 — Fuente del contenido
- **Decision**: recorrer el DOM del visor oculto (el mismo de 002/005, con el estilo elegido) y producir un documento estructurado con los colores y tipografías calculados por el navegador.
- **Alternatives**: convertir desde el Markdown (árbol sintáctico); descartado porque perdería los colores del estilo y el resaltado de código.

## R2 — Escritores sin dependencias
- **Decision**: OOXML y ODF escritos a mano y empaquetados con el ZIP de 002 (principios I y IX).
- **Notas OOXML**: orden de elementos según el esquema (rPr, pPr, tblPr); `tblHeader` + `cantSplit`; una numeración por lista ordenada para reiniciar; `w:background` + `displayBackgroundShape` en estilos oscuros.

## R3 — Imágenes y diagramas
- **Decision**: imágenes con sus bytes (PNG/JPEG/GIF; otros formatos pasan a PNG por canvas); Mermaid como PNG 2x; tamaño ajustado al área útil A4 (márgenes de 15 mm); aviso si se reduce por debajo del 50 %.

## R4 — Legibilidad y fuentes
- **Decision**: contraste ≥ 4,5:1 corrigiendo el texto (negro/blanco); fuentes: la primera de uso común de la lista CSS o una sustituta (Segoe UI, Georgia, Consolas).
