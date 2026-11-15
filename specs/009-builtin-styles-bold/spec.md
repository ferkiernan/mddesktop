# Feature Specification: Estilos incluidos en negrita

**Feature Branch**: `009-builtin-styles-bold`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Los Themes 'nativos' deben estar en negrita (no con el texto 'incluido')."

**Modifica**: `004-custom-themes` (lista del panel "Temas").

## Contexto verificado (2026-11-15)

- En la lista del panel "Temas", cada estilo incluido (los 7 que trae la aplicación) muestra el sufijo " · incluido"; los estilos propios no llevan sufijo. El estilo en uso muestra además " · activo".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Distinguir los estilos incluidos por su formato (Priority: P1)

En la lista del panel "Temas", los estilos incluidos se reconocen porque su nombre aparece **en negrita**, sin texto adicional; los estilos propios aparecen con peso normal.

**Why this priority**: Es todo el pedido: una lista más limpia, donde el tipo de estilo se ve de un vistazo.

**Independent Test**: Abrir Configuración → Temas… con al menos un estilo propio y comprobar que los 7 incluidos están en negrita, sin "incluido", y el propio en peso normal.

**Acceptance Scenarios**:

1. **Given** el panel "Temas" abierto, **When** se mira la lista, **Then** los nombres de los 7 estilos incluidos aparecen en negrita y ninguno muestra el texto "incluido".
2. **Given** estilos propios guardados, **When** se mira la lista, **Then** sus nombres aparecen en peso normal.
3. **Given** el estilo activo (incluido o propio), **When** se mira la lista, **Then** sigue indicándose cuál es el activo como hasta ahora.
4. **Given** un lector de pantalla, **When** recorre la lista, **Then** cada estilo incluido se anuncia como incluido (la distinción no depende solo del formato visual).

### Edge Cases

- Un estilo propio cuyo nombre coincide en apariencia con uno incluido no puede existir (los nombres son únicos, spec 004 FR-006).
- Con el estilo seleccionado resaltado, la negrita sigue distinguiéndose.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: En la lista del panel "Temas", el nombre de cada estilo incluido MUST mostrarse en negrita y MUST NOT llevar el texto "incluido".
- **FR-002**: Los estilos propios MUST mostrarse con peso de letra normal.
- **FR-003**: La indicación del estilo activo MUST conservarse.
- **FR-004**: La condición de estilo incluido MUST seguir disponible para tecnologías de asistencia (nombre accesible o descripción), sin texto visible adicional.

### Key Entities

- **Estilo incluido**: uno de los 7 estilos que trae la aplicación (solo lectura).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los estilos incluidos de la lista aparecen en negrita y 0 muestran el texto "incluido".
- **SC-002**: El 100 % de los estilos propios aparecen en peso normal.
- **SC-003**: Un lector de pantalla identifica cada estilo incluido como tal en el 100 % de los casos.

## Assumptions

- "Themes nativos" = los 7 estilos incluidos en la aplicación.
- El cambio aplica a la lista del panel "Temas"; el menú nativo de Windows (Configuración → Estilo del editor) no admite negrita y ya separa los propios en su propia sección; el panel de exportación lista los estilos sin distinguir tipo y no cambia.
- Se mantiene el marcador " · activo".
