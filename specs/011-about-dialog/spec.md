# Feature Specification: Menú Ayuda → Acerca de

**Feature Branch**: `011-about-dialog`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Añadí un menú al final Ayuda → Acerca de: donde muestres el logo, la fecha de compilación, el número de versión, un link al repo de este proyecto, autor: 'Fernando Manuel Kiernan'. Debajo añadí: basado en la librería 'mdwysiwyg' (Licencia MIT), con link a esa librería también y aclarando el autor del repositorio '@ferkiernan'. Para más información ir a: https://github.com/ferkiernan"

## Contexto verificado (2026-11-15)

- La barra de menús termina hoy en "Configuración"; no existe el menú "Ayuda".
- Versión actual de la aplicación: 0.2.0. Logo: `logo_principal.png` (aportado por la persona propietaria para pantallas de presentación).
- Repositorio del proyecto: https://github.com/ferkiernan/mddesktop (**privado**). Repositorio del editor: https://github.com/ferkiernan/mdwysiwyg (público, licencia MIT, © Fernando Manuel Kiernan).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la información de la aplicación (Priority: P1)

La persona abre Ayuda → Acerca de… y ve una ventana con el logo, el nombre "MD Desktop", la versión, la fecha de compilación, el autor "Fernando Manuel Kiernan" y el enlace al repositorio del proyecto. Debajo, "Basado en la librería mdwysiwyg (Licencia MIT)" con enlace a la librería y su autor "@ferkiernan", y al final "Para más información: https://github.com/ferkiernan".

**Why this priority**: Es todo el pedido.

**Independent Test**: Abrir Ayuda → Acerca de… y comprobar cada dato contra el instalador usado (versión y fecha de compilación) y que cada enlace abre la dirección correcta en el navegador.

**Acceptance Scenarios**:

1. **Given** la aplicación abierta, **When** se mira la barra de menús, **Then** el último menú es "Ayuda" y contiene "Acerca de MD Desktop…".
2. **Given** se elige Acerca de, **When** se abre la ventana, **Then** muestra el logo, "MD Desktop", "Versión 0.2.0" (la del instalador en uso), la fecha de compilación, "Autor: Fernando Manuel Kiernan" y el enlace al repositorio del proyecto.
3. **Given** la ventana abierta, **When** se lee la parte inferior, **Then** dice "Basado en la librería mdwysiwyg (Licencia MIT)" con enlace a https://github.com/ferkiernan/mdwysiwyg, "Autor: @ferkiernan" y "Para más información: https://github.com/ferkiernan" como enlace.
4. **Given** un enlace, **When** se pulsa, **Then** se abre en el navegador predeterminado del sistema (no dentro de la aplicación) y la ventana Acerca de sigue abierta.
5. **Given** la ventana abierta, **When** se pulsa "Cerrar" o Escape, **Then** se cierra y el foco vuelve al documento.

### Edge Cases

- Sin conexión a Internet: la ventana se abre igual (todo su contenido es local); los enlaces solo intentan abrir el navegador al pulsarlos.
- El repositorio del proyecto es privado: quien no tenga acceso verá una página de GitHub "no encontrado"; se acepta (decisión de la persona propietaria al pedir el enlace).
- La fecha de compilación es la del ejecutable instalado, no la del día.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La barra de menús MUST terminar con el menú "Ayuda", que MUST contener "Acerca de MD Desktop…".
- **FR-002**: La ventana Acerca de MUST mostrar: logo, nombre de la aplicación, número de versión, fecha de compilación, "Autor: Fernando Manuel Kiernan" y enlace a https://github.com/ferkiernan/mddesktop.
- **FR-003**: Debajo MUST mostrar "Basado en la librería mdwysiwyg (Licencia MIT)" con enlace a https://github.com/ferkiernan/mdwysiwyg y "Autor: @ferkiernan", y "Para más información: https://github.com/ferkiernan" como enlace.
- **FR-004**: La versión y la fecha de compilación MUST provenir del propio ejecutable (no escritas a mano), de modo que cada instalador muestre las suyas.
- **FR-005**: Los enlaces MUST abrirse en el navegador predeterminado; MUST NOT poder abrirse otras direcciones desde esta ventana (solo estas tres).
- **FR-006**: La ventana MUST cerrarse con "Cerrar" o Escape, ser operable con teclado y no requerir conexión para mostrarse.

### Key Entities

- **Información de la aplicación**: nombre, versión, fecha de compilación, autor, enlaces.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La ventana se abre en menos de 0,5 s desde el menú, con o sin conexión.
- **SC-002**: En el 100 % de las compilaciones, la versión y la fecha mostradas coinciden con las del instalador generado.
- **SC-003**: Los 3 enlaces abren exactamente sus direcciones en el navegador predeterminado.

## Assumptions

- Texto en español; nombre del menú "Ayuda" y de la opción "Acerca de MD Desktop…".
- El logo es `logo_principal.png`, mostrado reducido (unos 96 px).
- La fecha de compilación se muestra en formato local (día/mes/año).
- Abrir el navegador es una acción explícita de la persona (no viola el principio "Offline First": no hay comunicación automática).
