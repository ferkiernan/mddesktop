<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: none (initial ratification)
- Added principles: I Lightweight First; II Native Desktop Architecture; III Markdown First;
  IV Data Integrity; V Security by Design; VI Modular Architecture; VII Testing and Quality;
  VIII Offline First; IX Simplicity and Scope Control
- Added sections: Governance (principle X from user input + amendment/versioning policy),
  Objetivo final
- Removed sections: template SECTION_2 / SECTION_3 placeholders (not requested)
- Templates: ✅ plan-template.md (generic "Constitution Check" gate, no change needed);
  ✅ spec-template.md, tasks-template.md (no conflicts)
- Deferred TODOs: none
-->

# MD Desktop (Lightweight Markdown Desktop Editor) Constitution

Principios obligatorios para todo el desarrollo del proyecto.

## Core Principles

### I. Lightweight First — Rendimiento y eficiencia

El bajo consumo de recursos es un principio arquitectónico fundamental.

- MUST priorizar el consumo reducido de RAM, CPU y almacenamiento.
- MUST evitar dependencias innecesarias.
- MUST evitar runtimes y servicios residentes que no sean indispensables.
- MUST utilizar el WebView nativo del sistema operativo mediante Tauri.
- MUST evitar empaquetar Chromium o Node.js.
- MUST optimizar los renders de React y el ciclo de vida de los componentes.
- MUST medir el rendimiento antes de incorporar dependencias que puedan afectar los recursos.
- SHOULD preferir soluciones simples y nativas frente a abstracciones pesadas.

### II. Native Desktop Architecture — Arquitectura nativa

La aplicación debe utilizar Tauri 2 como runtime desktop.

- MUST utilizar Rust para las operaciones nativas.
- MUST utilizar React y TypeScript para la interfaz.
- MUST utilizar Vite para el proceso de desarrollo y build.
- MUST utilizar Tauri Commands e IPC para la comunicación entre frontend y backend.
- MUST evitar implementar un servidor HTTP local.
- MUST mantener desacoplados los servicios nativos y la interfaz.
- MUST evitar introducir Electron o Node.js como dependencias de producción.

### III. Markdown First — Integridad del formato

Markdown es el formato de persistencia principal y la fuente de verdad de los documentos.

- MUST utilizar mdwysiwyg como motor de edición WYSIWYG.
- MUST preservar el contenido Markdown.
- MUST evitar utilizar HTML como formato de persistencia.
- MUST evitar transformaciones que produzcan pérdida innecesaria de información.
- MUST preservar UTF-8 y los finales de línea cuando sea posible.
- MUST mantener compatibilidad con archivos Markdown convencionales.
- MUST validar cualquier limitación de compatibilidad antes de modificar el comportamiento del editor.

### IV. Data Integrity — Protección de documentos

La integridad de los archivos del usuario tiene prioridad sobre cualquier optimización de rendimiento
o conveniencia.

- MUST evitar pérdidas de información.
- MUST implementar detección de modificaciones pendientes.
- MUST advertir sobre modificaciones externas.
- MUST evitar sobrescrituras silenciosas.
- MUST implementar mecanismos de escritura segura.
- MUST proteger documentos no guardados durante el cierre de pestañas y aplicación.
- MUST implementar recuperación ante cierres inesperados.
- MUST evitar escrituras innecesarias cuando el contenido no haya cambiado.

### V. Security by Design — Seguridad

El acceso al sistema operativo debe ser explícito, limitado y controlado.

- MUST utilizar las capacidades de seguridad de Tauri.
- MUST aplicar el principio de mínimo privilegio.
- MUST validar todos los parámetros recibidos mediante IPC.
- MUST evitar acceso irrestricto al filesystem.
- MUST evitar ejecución arbitraria de comandos del sistema.
- MUST mantener las operaciones nativas encapsuladas en servicios Rust.
- MUST evitar exponer funcionalidades nativas innecesarias al frontend.

### VI. Modular Architecture — Modularidad y mantenibilidad

La aplicación debe mantener una arquitectura simple, modular y extensible.

- MUST separar responsabilidades.
- MUST evitar componentes React con responsabilidades de acceso al filesystem.
- MUST centralizar la gestión de documentos y pestañas.
- MUST definir contratos tipados entre frontend y backend.
- MUST evitar duplicación de lógica.
- MUST preferir composición frente a herencia.
- MUST evitar patrones arquitectónicos innecesarios.
- MUST documentar decisiones arquitectónicas relevantes.

### VII. Testing and Quality — Calidad

Toda funcionalidad crítica debe contar con pruebas.

- MUST implementar pruebas unitarias para la lógica de documentos.
- MUST probar operaciones de apertura, guardado y cierre.
- MUST probar la recuperación de sesiones.
- MUST probar la detección de modificaciones externas.
- MUST implementar pruebas de integración para los servicios nativos.
- MUST implementar pruebas E2E para los principales flujos de usuario.
- MUST verificar que las modificaciones no introduzcan regresiones.
- MUST validar los builds de producción.

### VIII. Offline First — Independencia de servicios externos

La aplicación debe funcionar de manera completamente local.

- MUST permitir todas las operaciones principales sin conexión a Internet.
- MUST evitar dependencias de servicios cloud.
- MUST evitar autenticación y cuentas de usuario.
- MUST almacenar localmente las preferencias y sesiones.
- MUST evitar telemetría y comunicaciones externas no autorizadas.

### IX. Simplicity and Scope Control — Simplicidad

El objetivo es construir un editor Markdown eficiente, no un framework genérico.

- MUST priorizar las funcionalidades del MVP.
- MUST evitar funcionalidades que no aporten valor directo al editor.
- MUST evitar incorporar bases de datos si filesystem y almacenamiento local son suficientes.
- MUST evitar implementar funcionalidades que ya proporciona mdwysiwyg.
- MUST justificar las nuevas dependencias.
- MUST priorizar soluciones simples, mantenibles y verificables.

## Governance — Gobernanza

Toda modificación arquitectónica debe respetar esta constitución, que prevalece sobre otras prácticas.

- Los cambios en principios fundamentales requieren actualización de esta constitución.
- Las decisiones técnicas deben ser consistentes con los principios establecidos.
- Las excepciones deben documentarse y justificarse (ver "Complexity Tracking" en el plan).
- Cada funcionalidad debe contar con criterios de aceptación.
- Las decisiones que afecten rendimiento, seguridad o integridad de documentos deben evaluarse antes
  de implementarse.
- El cumplimiento de estos principios debe verificarse durante las etapas de planificación, análisis
  e implementación (Constitution Check en `/speckit-plan` y `/speckit-analyze`).

**Versionado**: semántico. MAJOR = eliminación o redefinición incompatible de principios; MINOR =
principio o sección nuevos, o ampliación sustancial; PATCH = aclaraciones y correcciones de redacción.

**Enmiendas**: se realizan mediante `/speckit-constitution`, actualizando versión, fecha y el Sync
Impact Report, y revisando las plantillas dependientes.

## Objetivo final

Construir un editor Markdown desktop que sea liviano, rápido, confiable, seguro y completamente
local, utilizando Tauri 2, React, TypeScript y mdwysiwyg, con una experiencia de edición moderna y
sin complejidad arquitectónica innecesaria.

**Version**: 1.0.0 | **Ratified**: 2026-11-01 | **Last Amended**: 2026-11-01
