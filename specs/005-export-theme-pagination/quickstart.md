# Quickstart: 005

1. Con el estilo Dark activo, abrir un documento → Archivo → Exportar → PDF: aparece el panel con "Como en pantalla" preseleccionado y la vista previa paginada.
2. Elegir "Default": la vista previa se rehace en claro; el editor sigue en Dark.
3. Exportar: diálogo de guardado; el PDF tiene las mismas páginas que la vista previa.
4. `node tests/e2e/native/export.cdp.mjs <exe>`: con el documento largo de prueba ninguna página corta renglones, filas ni gráficos, nada queda recortado a la derecha y las tablas largas repiten el encabezado.
5. Reabrir el panel: recuerda el último estilo elegido.
