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
