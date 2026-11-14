# Bug Assessment: PDF exportado no muestra los gráficos Mermaid

- **Slug**: pdf-mermaid-missing
- **Created**: 2026-11-14
- **Source**: pasted text
- **Verdict**: likely valid, needs reproduction (reproducido en parte: ver "Reproduction")
- **Severity**: medium

## Report (verbatim or summarized)

> al imprimir un "PDF" no renderiza los graficos mermaid.

## Symptom

Al exportar a PDF, los diagramas Mermaid no aparecen (o no se ven) en las páginas del archivo. Esperado: el diagrama visible como en el visualizador (spec 002, FR-003).

## Reproduction

Probado sobre la app real (WebView2) con el exe de prueba de desarrollo (build del 2026-11-08, mdwysiwyg 0.3.1), ejecutando el mismo `buildExport` que usa el menú y mirando las imágenes de página (el PDF, el DOCX y el ODT comparten las mismas páginas JPEG):

1. Estilo **predeterminado (claro)**, documento de ejemplo con un diagrama de flujo: el diagrama **sí** sale. *No reproduce.*
2. Estilo claro, 6 tipos de diagrama (secuencia, torta, Gantt, estados, clases, flujo): **todos salen**. *No reproduce.* (El flujo de 10 nodos en horizontal queda **recortado a la derecha** y con texto minúsculo: es el recorte lateral ya descrito en la spec 005, no esta falla.)
3. Estilos **oscuros** (`dark`, `winamp`; `terminal` y `anthropic` no se inspeccionaron a ojo), mismo documento con un diagrama de flujo y uno de secuencia:
   - El **flujo** sale (los nodos tienen relleno blanco).
   - El de **secuencia** queda **casi invisible**: líneas, flechas y textos ("Hola", "Chau") son gris/negro oscuro sobre el fondo oscuro del diagrama. Solo se distinguen las cajas con relleno (A, B). *Reproduce.*

No verificado: el mismo defecto en el visualizador/editor en pantalla (se espera que sí, ver causa), y el comportamiento con el ejecutable instalado (build de release, sin gancho de pruebas).

## Suspected Code Paths

- `C:\repo\claude\mdwysiwyg\src\components\MarkdownEditor\markdown\mermaid.ts:19` — `mermaid.initialize({ startOnLoad: false, securityLevel: "strict" })`: usa siempre el tema por defecto de Mermaid, pensado para fondo claro (trazos y texto oscuros, muchos diagramas sin relleno).
- `src/features/settings/editorStyles.ts:60`, `:135` (`--mdw-mermaid-bg`: `#1e293b` en "Oscuro", `#2d275d` en "Winamp") — los estilos oscuros pintan el fondo del diagrama oscuro, así que el trazo oscuro del tema por defecto queda sobre fondo oscuro.
- `src/features/export/snapshot.ts:99-112` (`svgToImage`) — convierte el SVG a imagen tal cual; hereda el problema, no lo causa (el flujo se ve bien, la secuencia no).

## Root Cause Hypothesis

El editor dibuja Mermaid con el tema claro por defecto, que no se adapta a los fondos oscuros de algunos estilos; el diagrama se exporta tal cual se ve en el visualizador, por lo que los diagramas sin relleno (secuencia, Gantt, torta con etiquetas, etc.) quedan ilegibles. Confianza: **media** — explica lo reproducido, pero el reporte dice "no renderiza" y puede referirse a otra causa que no pude reproducir (otro estilo, otro tipo de diagrama, un diagrama con error de sintaxis que cae a código, el build instalado).

## Proposed Remediation

**Preferred (en la app, mínima)**: en los estilos oscuros, definir `--mdw-mermaid-bg` con un color **claro** (el diagrama queda como una "tarjeta" clara dentro de la página oscura), igual que ya hacen los estilos claros. No toca el editor, arregla pantalla y exportaciones (PDF, DOCX, ODT, HTML) a la vez y se verifica con el flujo nativo existente.

**Alternatives**:
- Pedir al editor una opción de tema de Mermaid (p. ej. `mermaidTheme` o tema oscuro automático según el contraste del fondo) y usarla en los estilos oscuros: mejor resultado visual (diagrama oscuro sobre oscuro) pero depende de publicar una versión nueva del editor (solicitud en `docs/upstream-requests.md`).
- Solo en la exportación: pintar un fondo claro detrás de cada imagen de diagrama en `svgToImage`; no arregla el visualizador en pantalla.

**Files likely to change**:
- `src/features/settings/editorStyles.ts` (`--mdw-mermaid-bg` de los estilos oscuros)
- `tests/e2e/native/export.cdp.mjs` y `tests/unit/` (ver abajo)
- `docs/upstream-requests.md` (solicitud de tema de Mermaid, opcional)

**Tests to add or update**:
- Unitaria: para cada estilo, el contraste entre `--mdw-mermaid-bg` y el color de trazo del tema de Mermaid (negro/gris oscuro) debe ser ≥ 3:1.
- Nativa: exportar un documento con un diagrama de secuencia y otro de flujo con cada estilo y comprobar, con muestreo de píxeles de la imagen de página, que el área del diagrama contiene píxeles oscuros y claros suficientes (no uniforme). Hoy `export.cdp.mjs` no mira el contenido de las páginas, solo la estructura de los archivos: por eso este defecto pasó.

## Risks & Considerations

- Cambiar el fondo del diagrama en estilos oscuros altera el aspecto en pantalla de esos estilos (deseable, pero es un cambio visible).
- Si el reporte es de otra causa, este arreglo no lo resuelve: ver preguntas abiertas.
- Documentos con Mermaid inválido se muestran como código fuente (comportamiento existente), no como diagrama.
- El recorte de diagramas anchos (lateral) y los cortes verticales se tratan en la spec 005, no aquí.

## Open Questions

- [NEEDS CLARIFICATION: ¿qué estilo del editor tenías activo al exportar, y qué tipo de diagrama (flujo, secuencia, Gantt…)? ¿el diagrama falta por completo o se ve casi invisible?]
- [NEEDS CLARIFICATION: ¿el diagrama se ve bien en pantalla (visualizador) con ese mismo documento y estilo?]
- [NEEDS CLARIFICATION: ¿la exportación fue con la app instalada (la de `%LOCALAPPDATA%\MD Desktop`)? Si es así, conviene repetir la prueba con ese binario y un documento tuyo.]
