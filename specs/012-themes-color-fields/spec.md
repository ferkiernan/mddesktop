# Feature Specification: Campos de color compactos en "Temas"

**Feature Branch**: `012-themes-color-fields`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "El botón Restablecer es muy grande, feo y se pasa al renglón de abajo. Quiero que esté a la derecha del input del color: un botón con icono de 'reset' que diga 'Restablecer' al pasar el mouse. El input de color está demasiado largo, podría ser la mitad de ancho. El 'Fondo de la barra de pestañas' quedó distinto a los demás, no tiene color picker."

**Modifica**: `004-custom-themes` (campos de color del panel "Temas") y `010-tab-bar-color` (campo "Fondo de la barra de pestañas").

## Contexto verificado (2026-11-15, captura de la persona)

- En el grupo "Base", un campo modificado (p. ej. "Fondo suave ·") muestra un botón de texto "Restablecer" en un renglón propio, debajo del campo, desalineado con el resto.
- El valor escrito de cada color ocupa casi todo el ancho disponible.
- "Fondo de la barra de pestañas" se muestra sin la muestra/selector gráfico de color que tienen los demás campos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restablecer sin romper la grilla (Priority: P1)

Al editar un estilo propio, cuando un color fue cambiado, aparece a la derecha del valor escrito, en el mismo renglón, un botón pequeño con icono de "restablecer". Al pasar el mouse muestra "Restablecer"; al pulsarlo el color vuelve a su valor derivado.

**Why this priority**: Es la queja principal: el botón actual rompe la alineación y es grande.

**Independent Test**: Duplicar un estilo, cambiar "Fondo suave", comprobar que el botón aparece en el mismo renglón, que su ayuda dice "Restablecer" y que al pulsarlo el valor vuelve al derivado.

**Acceptance Scenarios**:

1. **Given** un campo de color modificado, **When** se mira el panel, **Then** el botón de restablecer está en el mismo renglón, a la derecha del valor escrito, y ningún campo baja de renglón.
2. **Given** el botón, **When** se pasa el mouse o llega el foco de teclado, **Then** se muestra "Restablecer" como ayuda, y los lectores de pantalla lo anuncian como "Restablecer {nombre del campo}".
3. **Given** el botón, **When** se pulsa (clic, Enter o Espacio), **Then** el color vuelve a su valor derivado y el botón desaparece.
4. **Given** un campo sin modificar, **When** se mira, **Then** no hay botón, pero el espacio queda reservado para que las columnas sigan alineadas.

---

### User Story 2 - Valor escrito más angosto (Priority: P2)

El cuadro donde se escribe el color mide aproximadamente la mitad de su ancho actual, suficiente para leer completo un valor como `#d0d4da`.

**Why this priority**: Mejora estética pedida; no cambia funciones.

**Independent Test**: Medir el ancho del cuadro antes y después (≈ 50 %) y comprobar que los valores típicos se leen completos.

**Acceptance Scenarios**:

1. **Given** el panel "Temas", **When** se mira cualquier campo de color, **Then** el cuadro de valor mide entre el 45 % y el 60 % del ancho anterior y muestra completos los valores hex de 7 caracteres.
2. **Given** un valor más largo (p. ej. `rgba(…)`), **When** se escribe, **Then** se puede leer y editar completo (desplazando dentro del cuadro), sin desbordar el panel.

---

### User Story 3 - "Fondo de la barra de pestañas" igual a los demás (Priority: P1)

El campo "Fondo de la barra de pestañas" tiene la misma muestra/selector gráfico, el mismo ancho y el mismo botón de restablecer que los demás colores, aunque aún no se haya elegido un color.

**Why this priority**: Es un defecto visible de la función 010.

**Independent Test**: Abrir "Temas" con un estilo propio sin color de pestañas: el campo muestra la muestra con el color que tiene hoy la barra; al elegir otro, se aplica a la vista previa.

**Acceptance Scenarios**:

1. **Given** un estilo propio sin color de pestañas, **When** se mira el campo, **Then** muestra la muestra de color (con el color actual de la barra) y el valor escrito vacío con el texto "automático".
2. **Given** la muestra, **When** se elige un color, **Then** se guarda como color de pestañas y la vista previa cambia.
3. **Given** un color de pestañas elegido, **When** se pulsa restablecer, **Then** vuelve a "automático".
4. **Given** una barra de herramientas definida con un valor que el selector gráfico no puede representar tal cual, **When** se mira el campo, **Then** la muestra igual aparece, con el color más cercano.

### Edge Cases

- Estilos incluidos (solo lectura): los campos se ven igual de compactos; no hay botón de restablecer.
- Tamaño de barra (spec 007) al 150 %: el botón y los cuadros escalan sin bajar de renglón.
- Modo avanzado: los mismos campos usan el mismo diseño compacto.
- Ventana angosta: el panel puede desplazarse, pero cada campo mantiene muestra, valor y botón en un renglón.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El botón de restablecer de cada campo de color MUST mostrarse en el mismo renglón, a la derecha del valor escrito, como botón pequeño con icono (sin texto visible).
- **FR-002**: El botón MUST mostrar "Restablecer" como ayuda al pasar el mouse o al recibir el foco, y tener nombre accesible "Restablecer {campo}".
- **FR-003**: El botón MUST ser operable con teclado y conservar el comportamiento actual (volver al valor derivado / automático).
- **FR-004**: Los campos sin modificar MUST reservar el espacio del botón para que las columnas queden alineadas.
- **FR-005**: El cuadro del valor escrito MUST medir aproximadamente la mitad del ancho actual y mostrar completo un valor hex de 7 caracteres.
- **FR-006**: "Fondo de la barra de pestañas" MUST tener siempre muestra/selector gráfico, ancho y botón iguales a los demás campos, también cuando no tiene color propio.
- **FR-007**: El mismo diseño MUST aplicarse en los modos básico y avanzado del panel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el grupo "Base" con un campo modificado, el 100 % de los campos ocupa un solo renglón.
- **SC-002**: El cuadro de valor mide 45–60 % de su ancho anterior.
- **SC-003**: El 100 % de los campos de color del modo básico (incluido "Fondo de la barra de pestañas") tiene selector gráfico.
- **SC-004**: El botón de restablecer anuncia "Restablecer" a mouse, teclado y lector de pantalla.

## Assumptions

- "Alt del mouse over" se interpreta como la ayuda emergente (tooltip) al pasar el mouse.
- El icono es una flecha circular de "restablecer", dibujada con el color del texto del panel, sin depender de fuentes externas.
- La palabra mostrada es "Restablecer" (ortografía correcta), como el botón actual.
- No cambia qué valores se aceptan ni cómo se guardan los estilos.
