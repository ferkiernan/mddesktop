# Changelog

Cambios notables de MD Desktop. Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/); versiones según [SemVer](https://semver.org/lang/es/).

## [0.3.0] - 2026-11-23

### Añadido
- **Configuración → Desactivar corrector ortográfico** (spec 015): casilla sin marcar por defecto; al marcarla el editor deja de subrayar palabras en todas las pestañas al instante. La elección se guarda.
- Edición de listas (mdwysiwyg 0.10.0):
  - Backspace en un ítem vacío lo elimina y deja el cursor al final del ítem anterior.
  - Delete al final de una línea une la siguiente aunque esté en otra lista o ítem.
  - **Ctrl+Shift+↑ / ↓** mueve el ítem de la lista.
  - Triple clic selecciona una línea.

### Cambiado
- mdwysiwyg actualizado de 0.9.0 a 0.10.0.

## [0.2.0] - 2026-11-15

Primera versión publicada.

### Añadido
- Editor visual de Markdown (mdwysiwyg) con pestañas, vista Markdown, tablas, diagramas Mermaid, listas de tareas, imágenes y enlaces.
- Archivos: abrir, guardar, varias pestañas, aviso de cambios sin guardar, apertura desde el sistema (doble clic, arrastrar y soltar, asociación de `.md`).
- Sesión y recuperación: las pestañas y los cambios sin guardar se restauran al volver a abrir la aplicación.
- Cambios externos: aviso con opciones y comparación lado a lado entre la versión de la aplicación y la del disco (spec 008).
- **Exportar** a PDF, Word (.docx), OpenDocument (.odt) y HTML con vista previa, elección de estilo y paginación A4 (specs 002, 005, 006).
- **Estilos del editor**: Default, Oscuro, Notebook (pastel), Terminal, Winamp, CG Theme y Anthropic; ventana **Temas** para crear estilos propios con vista previa, colores y tipografía (specs 003, 004, 009–014).
- Zoom del contenido y tamaño de las barras (spec 007); barra de herramientas e historial de versiones opcionales.
- **Ayuda → Acerca de** con versión, fecha de compilación y enlaces (spec 011).
- Instalador para Windows con opción **Actualizar** (desinstala la versión anterior e instala la nueva).

### Corregido
- Las exportaciones incluyen todos los diagramas Mermaid (antes, con muchos diagramas, salía su código).
- Diagramas Mermaid legibles con los estilos oscuros.

[0.3.0]: https://github.com/ferkiernan/mddesktop/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ferkiernan/mddesktop/releases/tag/v0.2.0
