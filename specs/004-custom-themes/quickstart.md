# Quickstart: 004

1. Configuración → Temas…: se abre el panel con la lista (incluidos en negrita), el editor de colores y la vista previa.
2. Elegir "Winamp" → Duplicar → cambiar "Fondo": la vista previa cambia, el editor no.
3. Guardar: aparece en la lista y en Configuración → Estilo del editor (sección propia). Aplicar: toda la app cambia.
4. Reiniciar la app: el estilo y la selección se conservan.
5. Eliminar el estilo activo: la app vuelve a "Default".
6. Pruebas: `npx vitest run tests/unit/themes-zoom.spec.ts`, `npx playwright test tests/e2e/ui/themes-zoom.spec.ts`, `cargo test custom_styles`.
