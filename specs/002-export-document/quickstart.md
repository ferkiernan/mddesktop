# Quickstart: validación de la exportación

Prerrequisitos y comandos generales: [001 quickstart](../001-markdown-desktop-editor/quickstart.md).

## Pruebas automáticas

```bash
npm test                                        # escritores ZIP/PDF/DOCX/ODT, paginación, instantánea, flujo
cargo test --manifest-path src-tauri/Cargo.toml # autorización y escritura de exportaciones
npm run test:e2e:ui                             # menú -> exportar con IPC simulado
node scripts/build-test-exe.mjs                 # build de depuración con otro identificador (no choca con la app instalada)
node tests/e2e/native/export.cdp.mjs <exe>      # 4 formatos sobre la app real
```

## Escenarios manuales (V1–V8)

Documento de prueba: `tests/fixtures/markdown/export-sample.md` (encabezados, énfasis, listas, tareas, tabla, bloque de código, imagen local, gráfico Mermaid).

| # | Historia | Pasos | Resultado esperado |
|---|---|---|---|
| V1 | US1 | Archivo → Exportar → Página web; guardar; abrir el `.html` sin conexión | Mismo aspecto que el visor; imagen y gráfico presentes; ancho A4 centrado |
| V2 | US1 | Mover el `.html` a otra carpeta sin la imagen original | Se ve igual (autocontenido) |
| V3 | US2 | Exportar a PDF con el estilo Winamp y con Default | Páginas A4; fondo y colores del estilo; ningún bloque cortado por la mitad |
| V4 | US3 | Exportar a Word; abrir en Microsoft Word | Sin aviso de reparación; páginas A4 que se ven como el visor |
| V5 | US3 | Exportar a OpenDocument; abrir en LibreOffice Writer | Igual que V4 |
| V6 | US4 | Cancelar el diálogo | No se crea archivo ni error |
| V7 | US4 | Elegir un destino de solo lectura | Mensaje claro; sin archivo parcial |
| V8 | Bordes | Exportar con cambios sin guardar | El archivo refleja los cambios; el `.md` no cambia |

## Qué verifica la prueba nativa

`export.cdp.mjs` abre el documento de prueba, dispara cada formato y comprueba: el archivo existe; firmas (`%PDF-`, `PK`, `mimetype` de ODT primero); tamaño de página A4; el HTML sin referencias externas; y que el `.md` original no cambió.
