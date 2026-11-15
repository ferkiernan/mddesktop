# Feature Specification: Opción para desactivar el corrector ortográfico

**Feature Branch**: `015-spellcheck-toggle`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "En Configuración activá un check para desactivar el control de ortografía. Por defecto, sin marcar."

## Contexto verificado (2026-11-15)

- La vista visual del editor muestra el subrayado rojo del corrector ortográfico del sistema (activo siempre, sin opción).
- La vista Markdown (texto plano) ya tiene el corrector apagado.
- El menú "Configuración" tiene "Estilo del editor", "Temas…" y la casilla "Historial de versiones".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apagar el corrector ortográfico (Priority: P1)

Quien escribe en otro idioma, o con mucha jerga técnica, marca "Desactivar corrector ortográfico" en el menú "Configuración" y deja de ver subrayadas las palabras en el editor.

**Why this priority**: Es el pedido completo.

**Independent Test**: Escribir una palabra mal escrita, ver el subrayado, marcar la casilla: el subrayado desaparece en todas las pestañas abiertas; desmarcarla lo vuelve a mostrar.

**Acceptance Scenarios**:

1. **Given** una instalación nueva, **When** se abre el menú "Configuración", **Then** aparece la casilla "Desactivar corrector ortográfico" sin marcar y el corrector funciona como hoy.
2. **Given** la casilla sin marcar, **When** se marca, **Then** el editor deja de subrayar errores ortográficos en todos los documentos abiertos, sin reiniciar.
3. **Given** la casilla marcada, **When** se desmarca, **Then** el subrayado vuelve.
4. **Given** la casilla marcada, **When** se cierra y vuelve a abrir la aplicación, **Then** sigue marcada y el corrector sigue apagado.

### Edge Cases

- Documentos abiertos después de cambiar la opción: respetan el valor actual.
- Vista Markdown: el corrector ya está apagado ahí y sigue igual con cualquier valor.
- Exportaciones: no cambian (el subrayado nunca se exporta).
- Archivo de preferencias antiguo sin este valor: se toma "sin marcar" (corrector activo).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El menú "Configuración" MUST tener la casilla "Desactivar corrector ortográfico", sin marcar por defecto.
- **FR-002**: Con la casilla marcada, la vista visual del editor MUST NOT marcar errores ortográficos; sin marcar, MUST comportarse como hoy.
- **FR-003**: El cambio MUST aplicarse al instante a todos los documentos abiertos.
- **FR-004**: La elección MUST guardarse con las demás preferencias y mantenerse al reiniciar.
- **FR-005**: La marca de la casilla MUST reflejar siempre el valor guardado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Apagar o encender el corrector requiere 2 clics (abrir "Configuración" y marcar la casilla).
- **SC-002**: Con la casilla marcada, 0 palabras subrayadas en el editor visual, en cualquier pestaña.
- **SC-003**: El 100 % de las veces la preferencia se conserva tras reiniciar la aplicación.

## Assumptions

- "Control de spelling" = el corrector ortográfico del sistema que subraya palabras en el editor visual.
- La casilla se redacta en negativo ("Desactivar…") tal como se pidió, así "sin marcar" deja el comportamiento actual (corrector activo).
- Se ubica en el menú "Configuración", junto a "Historial de versiones".
- No se agrega elección de idioma del corrector (usa el del sistema, como hoy).
