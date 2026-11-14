# Exportar documento (feature 002)

Archivo → Exportar → **Página web (.html)**, **PDF (.pdf)**, **Word (.docx)**, **OpenDocument (.odt)**.
Spec, plan y tareas: [`specs/002-export-document/`](../specs/002-export-document/).

## Cómo funciona

1. Se captura el contenido **actual** del documento activo (también cambios sin guardar); el `.md` no se toca.
2. Un diálogo nativo de guardado (Rust) elige nombre y ubicación y autoriza esa ruta; cancelar no deja nada.
3. Un visor oculto renderiza el documento con el mismo componente y el **estilo de editor activo**.
4. Una instantánea copia los estilos computados a cada elemento; los gráficos Mermaid y las imágenes (también las
   relativas de la carpeta del documento) se incrustan como imágenes `data:`. Nada depende de CSS ni de archivos externos.
5. Según el formato:
   - **HTML**: página única de 210 mm de ancho, texto real.
   - **PDF / Word / OpenDocument**: cada página A4 (794×1123 px, márgenes de 15 mm) se dibuja como imagen
     (SVG `foreignObject` → canvas, 2×) y se empaqueta con escritores propios (sin dependencias). Los cortes caen entre
     bloques (los títulos acompañan al bloque siguiente); un bloque más alto que una página se corta en el límite.
6. Rust escribe los bytes de forma atómica (`temp + rename`) solo en la ruta elegida y con extensión `html/pdf/docx/odt`.

## Límites conocidos

- En PDF, Word y OpenDocument el texto **no es seleccionable ni editable**: se prioriza que se vea exactamente como el visor.
  El HTML conserva el texto. Una mejora futura es el PDF vectorial con `PrintToPdf` de WebView2.
- La apertura en Word/LibreOffice no se pudo probar en esta máquina; la estructura se valida con pruebas automáticas
  (XML bien formado, partes y relaciones, `mimetype` de ODT primero) y con el lector ZIP de .NET. Ver `specs/002-export-document/quickstart.md`.
- Tipografías: se usan las del sistema (las del estilo activo); si el equipo de destino no las tiene, el HTML usa su fallback.
- Imágenes remotas (`http/https`) no se incrustan (CSP sin red): se omiten con aviso.

## Pruebas

```bash
npm test                                   # escritores, paginación, flujo
npm run test:e2e:ui                        # menú -> exportación con Chromium e IPC simulado
node scripts/build-test-exe.mjs            # exe de depuración con otro identificador (no choca con la app instalada)
node tests/e2e/native/export.cdp.mjs <exe> # 4 formatos sobre la app real (WebView2)
cargo test --manifest-path src-tauri/Cargo.toml
```

## Panel de exportación (feature 005)

- Archivo → Exportar abre primero un panel: lista de estilos ("Como en pantalla" = estilo activo, o cualquier estilo) y vista previa. Se recuerda el último estilo (`exportStyle`).
- La vista previa usa el mismo proceso que el archivo y "Exportar…" escribe **esos mismos bytes**: el PDF tiene exactamente las páginas que se vieron.
- El estilo elegido se aplica solo al visor oculto (variables en su contenedor; clase `mdd-export-editor`). El zoom de pantalla nunca llega a la exportación (`--mdw-content-zoom: 1`).
- PDF sin cortes: imágenes/diagramas más altos o anchos que la página se reducen proporcionalmente (aviso si quedan por debajo del 50 %); tablas anchas se reducen; el código parte sus líneas; los bloques más altos que una página se cortan entre renglones (mínimo 2 líneas a cada lado) o entre filas; las tablas largas repiten la fila de encabezado.

## Word y OpenDocument nativos (feature 006)

- `.docx` y `.odt` ya no son imágenes de página: texto editable con estilos de encabezado (panel de navegación), listas numeradas/viñetas, tareas (☐/☑), citas, código con sus colores, tablas reales (encabezado repetido, filas que no se parten, alineación), hipervínculos e imágenes con texto alternativo. Solo los diagramas Mermaid se insertan como imagen (PNG nítido).
- Página A4 con márgenes de 15 mm; colores y tipografías del estilo elegido (tipografías poco comunes se sustituyen por una de uso común); contraste del texto ≥ 4,5:1. En estilos oscuros se usa color de página y se avisa de la opción de impresión de fondos.
- La paginación la hace el programa que abre el archivo; la vista previa del panel muestra el contenido y los colores (página continua).
- Código: `src/features/export/native/` (`model.ts` DOM → documento estructurado; `docx.ts`, `odt.ts` escritores; `color.ts`).
