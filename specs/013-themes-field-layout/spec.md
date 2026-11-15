# Feature Specification: Diseño de los atributos en "Temas"

**Feature Branch**: `013-themes-field-layout`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Te doy un ejemplo de cómo quiero que se vean los atributos en la ventana de temas" (con captura de referencia).

**Modifica**: `012-themes-color-fields` (campos de color del panel "Temas").

## Referencia (captura de la persona)

Grupo "Barra" con tres atributos ("Fondo de la barra de pestañas", "Degradado (inicio)", "Degradado (medio)"). Cada atributo es un renglón con:

1. el nombre a la izquierda;
2. una línea de puntos suaves que va desde el final del nombre hasta la muestra de color;
3. la muestra de color (rectángulo con marco), siempre en la misma columna;
4. el valor escrito (cuadro angosto, p. ej. `#bababa`), alineado en columna;
5. el botón de restablecer (cuadrado con flecha circular), alineado en columna, en el mismo renglón.

El grupo tiene un marco de bordes redondeados con el título arriba a la izquierda.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Atributos alineados con guía de puntos (Priority: P1)

Al abrir "Temas", cada atributo de color se lee como una fila de índice: nombre, puntos guía, muestra, valor y restablecer, con las tres últimas columnas alineadas en todo el grupo.

**Why this priority**: Es el pedido completo.

**Independent Test**: Abrir "Temas", duplicar un estilo y comparar el grupo "Barra" con la captura: mismas columnas, puntos guía visibles entre nombre y muestra, un renglón por atributo.

**Acceptance Scenarios**:

1. **Given** cualquier grupo de atributos, **When** se mira, **Then** las muestras, los valores y los botones de restablecer de todas sus filas empiezan en la misma posición horizontal.
2. **Given** un nombre corto y uno largo, **When** se miran, **Then** la línea de puntos ocupa todo el espacio libre entre el final del nombre y la muestra, con al menos un pequeño margen a cada lado.
3. **Given** un nombre más largo que su columna, **When** se mira, **Then** el nombre se corta con "…" (y se ve completo al pasar el mouse) sin empujar ni desalinear las demás columnas.
4. **Given** un atributo modificado, **When** se mira, **Then** su nombre está en negrita y el botón de restablecer aparece en su columna; uno sin modificar deja la columna vacía.

---

### User Story 2 - Mismo aspecto en todo el panel (Priority: P2)

El mismo diseño se usa en el modo básico, en todos los grupos del modo avanzado y también para el selector de tipografía (nombre, puntos y control en la columna de la muestra).

**Why this priority**: Consistencia; evita que un campo "quede distinto" como pasó en 010.

**Independent Test**: Recorrer los modos básico y avanzado y comprobar que ningún atributo rompe la grilla.

**Acceptance Scenarios**:

1. **Given** el modo básico, **When** se mira, **Then** todos los atributos (incluida "Tipografía") siguen la grilla.
2. **Given** cada grupo del modo avanzado, **When** se mira, **Then** todos sus atributos siguen la grilla y el grupo tiene marco redondeado con su título.

### Edge Cases

- Estilos incluidos (solo lectura): mismo diseño, sin botones de restablecer.
- Valor no válido: el aviso "Color no válido" aparece debajo de la fila, sin desalinear las demás.
- Tamaño de barra (spec 007) o ventana angosta: el panel puede desplazarse, pero cada fila sigue en un renglón.
- Tema oscuro de la aplicación: los puntos guía usan un tono tenue del color del texto, visibles sin competir con el contenido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada atributo de color MUST mostrarse en un renglón: nombre, puntos guía, muestra, valor escrito y espacio del botón de restablecer, en ese orden.
- **FR-002**: Dentro de un grupo, la muestra, el valor y el botón MUST estar alineados en columnas.
- **FR-003**: La línea de puntos MUST rellenar el espacio entre el nombre y la muestra, con un tono tenue.
- **FR-004**: Los nombres demasiado largos MUST cortarse con "…" y mostrarse completos como ayuda al pasar el mouse.
- **FR-005**: Los atributos modificados MUST mostrar el nombre en negrita (sin el "·" actual) y su botón de restablecer.
- **FR-006**: Los grupos MUST tener marco de bordes redondeados con el título arriba a la izquierda.
- **FR-007**: El diseño MUST aplicarse en los modos básico y avanzado, incluido el selector de tipografía, y en estilos incluidos y propios.
- **FR-008**: El comportamiento de los campos (validación, restablecer, selector de color, ayuda "Restablecer") MUST mantenerse como en la función 012.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En todos los grupos, las muestras de color de todas las filas están alineadas con una diferencia de 1 px o menos.
- **SC-002**: El 100 % de los atributos ocupa un solo renglón con el panel a su tamaño normal.
- **SC-003**: El 100 % de las filas muestra la guía de puntos entre nombre y muestra.
- **SC-004**: La persona confirma que el panel se ve como la captura de referencia.

## Assumptions

- En la captura todos los nombres están en negrita y con botón porque los tres atributos están modificados; los no modificados van en peso normal y sin botón (columna reservada).
- Se quita el "·" que hoy marca un atributo modificado: la negrita y el botón ya lo indican.
- La tipografía del panel es la de la aplicación (no se cambia la fuente).
- La muestra de color es un rectángulo algo más ancho que alto (aprox. 34 × 20), con marco gris, como en la captura.
