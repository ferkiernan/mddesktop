# Feature Specification: Color de fondo de la barra de pestañas

**Feature Branch**: `010-tab-bar-color`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Añadí una opción para seleccionar el 'color de fondo de la barra de tabs' en la sección Temas básica."

**Modifica**: `004-custom-themes` (modo básico del panel "Temas").

## Contexto verificado (2026-11-15)

- Hoy la barra de pestañas (y la barra de estado) toma su fondo del degradado de la barra de herramientas del estilo, y su texto del color de texto de esa barra. No hay forma de elegirlo por separado.
- El modo básico del panel "Temas" ofrece: Fondo, Texto, Acento, Bordes, Barra de herramientas y Tipografía.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el fondo de la barra de pestañas (Priority: P1)

En el modo básico del panel "Temas", al editar un estilo propio, hay un campo "Fondo de la barra de pestañas" con selector de color. Al cambiarlo, la barra de pestañas de la vista previa cambia al instante; al guardar y aplicar, la barra de pestañas de la aplicación adopta ese color, con un texto de pestañas legible.

**Why this priority**: Es el pedido completo.

**Independent Test**: Duplicar un estilo, elegir un fondo de pestañas rojo oscuro, comprobar la vista previa, guardar, aplicar y verificar el color real de la barra de pestañas y la legibilidad de los nombres.

**Acceptance Scenarios**:

1. **Given** el panel "Temas" en modo básico con un estilo propio, **When** se mira la lista de campos, **Then** aparece "Fondo de la barra de pestañas" con selector de color y valor escrito.
2. **Given** un color elegido, **When** se cambia, **Then** la barra de pestañas de la vista previa cambia al instante y la de la aplicación no cambia hasta aplicar.
3. **Given** el estilo guardado y aplicado, **When** se mira la ventana, **Then** la barra de pestañas usa ese color de fondo y el texto de las pestañas inactivas contrasta al menos 4,5:1 con él.
4. **Given** un estilo propio sin este color elegido (o uno creado antes de esta función), **When** se aplica, **Then** la barra de pestañas se ve como hoy (deriva de la barra de herramientas).
5. **Given** el campo con un valor, **When** se pulsa "Restablecer" (o se deja vacío), **Then** vuelve a derivarse de la barra de herramientas.

### Edge Cases

- Un color muy claro o muy oscuro: el texto de las pestañas se elige automáticamente (oscuro o claro) para seguir siendo legible.
- La pestaña activa conserva su aspecto actual (fondo del documento y línea de acento); solo cambia el fondo de la barra y las pestañas inactivas sobre ella.
- Valor inválido: se rechaza con el mismo mensaje que los demás campos de color.
- Estilos incluidos: no se modifican (solo lectura); el campo está en los estilos propios.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El modo básico del panel "Temas" MUST incluir el campo "Fondo de la barra de pestañas" (selector gráfico + valor escrito), también visible en el modo avanzado.
- **FR-002**: El color elegido MUST aplicarse al fondo de la barra de pestañas de la aplicación y de la vista previa del panel, al guardar y aplicar el estilo.
- **FR-003**: El texto de las pestañas inactivas MUST elegirse automáticamente para contrastar al menos 4,5:1 con ese fondo.
- **FR-004**: Si el estilo no define este color, la barra de pestañas MUST verse como hasta ahora; "Restablecer" MUST volver a ese comportamiento.
- **FR-005**: El valor MUST guardarse con el estilo propio y validarse como los demás colores (solo colores; sin degradados ni imágenes en este campo).
- **FR-006**: La barra de estado, la barra de herramientas del editor, el contenido y la exportación MUST NOT cambiar por este ajuste.

### Key Entities

- **Estilo propio**: gana un valor opcional "fondo de la barra de pestañas".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Elegir el color y verlo en la vista previa lleva menos de 10 segundos y el cambio aparece al instante.
- **SC-002**: En el 100 % de los colores de una batería de prueba (claros, oscuros, medios tonos), el texto de las pestañas contrasta al menos 4,5:1.
- **SC-003**: Los estilos creados antes de esta función se ven idénticos tras actualizar.

## Assumptions

- "Barra de tabs" = la barra de pestañas de documentos de la aplicación; la barra de estado mantiene su aspecto actual (derivado de la barra de herramientas).
- El campo admite solo un color liso (no degradado) para mantener la edición simple; los estilos incluidos conservan su barra con degradado.
- Se mantiene el tamaño de la barra elegido en "Ajuste tamaño de barra" (spec 007).
