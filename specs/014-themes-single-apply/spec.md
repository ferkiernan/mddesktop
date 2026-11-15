# Feature Specification: Un solo botón "Aplicar" en "Temas"

**Feature Branch**: `014-themes-single-apply`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Unificá 'Guardar' y 'Aplicar' en un mismo botón; en definitiva debería ser una sola cosa."

**Modifica**: `004-custom-themes` (botones del panel "Temas").

## Contexto verificado (2026-11-15)

- El pie del panel tiene "Cerrar", "Guardar" y "Aplicar" (principal).
- "Guardar" solo guarda un estilo propio con cambios (gris en estilos incluidos o sin cambios).
- "Aplicar" ya guarda primero los cambios pendientes y luego aplica el estilo seleccionado.
- Al cambiar de estilo o cerrar con cambios sin guardar, un aviso ofrece "Cancelar / Descartar / Guardar".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Un solo paso para guardar y aplicar (Priority: P1)

Quien edita un estilo propio pulsa un único botón, "Aplicar", y el estilo queda guardado y aplicado a la aplicación. No existe un botón separado "Guardar".

**Why this priority**: Es el pedido completo.

**Independent Test**: Duplicar un estilo, cambiar un color, pulsar "Aplicar": el estilo aparece guardado en la lista (persiste al reabrir el panel) y la aplicación lo usa.

**Acceptance Scenarios**:

1. **Given** el panel "Temas", **When** se mira el pie, **Then** hay solo "Cerrar" y "Aplicar" (principal).
2. **Given** un estilo propio con cambios, **When** se pulsa "Aplicar", **Then** el estilo se guarda y se aplica; los cambios no se pierden al cerrar y reabrir el panel.
3. **Given** un estilo incluido u otro estilo propio sin cambios distinto del activo, **When** se pulsa "Aplicar", **Then** se aplica (no hay nada que guardar).
4. **Given** el estilo activo sin cambios, **When** se mira "Aplicar", **Then** está deshabilitado y la ayuda explica "Este estilo ya está aplicado".
5. **Given** un nombre o un color no válido, **When** se pulsa "Aplicar", **Then** no se guarda ni se aplica y se muestra el mismo mensaje de error que hoy.

---

### User Story 2 - Salir con cambios pendientes (Priority: P2)

Al cambiar de estilo en la lista o cerrar el panel con cambios sin aplicar, el aviso ofrece "Cancelar", "Descartar" y "Aplicar", coherente con el único botón.

**Why this priority**: Evita que reaparezca "Guardar" como paso separado.

**Independent Test**: Editar un estilo, cerrar el panel y elegir "Aplicar" en el aviso: el estilo queda guardado y aplicado.

**Acceptance Scenarios**:

1. **Given** cambios sin aplicar, **When** se cierra el panel o se elige otro estilo, **Then** el aviso dice "Cambios sin aplicar" con "Cancelar", "Descartar" y "Aplicar" (principal).
2. **Given** el aviso, **When** se elige "Aplicar", **Then** el estilo editado se guarda, se aplica y luego se completa la acción (cerrar o cambiar de estilo).
3. **Given** el aviso, **When** se elige "Descartar", **Then** los cambios se pierden y la acción continúa; con "Cancelar" todo sigue igual.

### Edge Cases

- Error al guardar en disco: se muestra el error, el estilo no se aplica y los cambios siguen en el editor.
- Estilo recién duplicado sin cambios: "Aplicar" lo guarda (para que exista en la lista) y lo aplica.
- Teclado: Enter en un campo no aplica (solo confirma el valor); "Aplicar" se activa con su botón.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El pie del panel MUST tener solo "Cerrar" y "Aplicar"; el botón "Guardar" MUST quitarse.
- **FR-002**: "Aplicar" MUST guardar los cambios pendientes del estilo propio y aplicar el estilo seleccionado, como una sola acción.
- **FR-003**: Si el guardado falla o hay datos no válidos, "Aplicar" MUST NOT aplicar y MUST mostrar el error.
- **FR-004**: "Aplicar" MUST estar deshabilitado solo cuando el seleccionado ya es el activo y no hay cambios, con una ayuda que lo explique.
- **FR-005**: El aviso de cambios pendientes MUST ofrecer "Cancelar", "Descartar" y "Aplicar".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Guardar y aplicar un estilo editado requiere 1 clic (antes 1–2).
- **SC-002**: El 100 % de los estilos aplicados con cambios siguen guardados al reabrir el panel y al reiniciar la aplicación.
- **SC-003**: No queda ningún botón ni opción "Guardar" en el panel "Temas".

## Assumptions

- El botón conserva el nombre "Aplicar" (el término que ya se usa); su ayuda dice "Guarda los cambios y aplica el estilo".
- Ya no se puede guardar un estilo sin aplicarlo; para volver al anterior basta con seleccionarlo y pulsar "Aplicar".
- El resto de acciones de la lista (Nuevo, Duplicar, Renombrar, Eliminar, Exportar/Importar si existen) no cambian.
