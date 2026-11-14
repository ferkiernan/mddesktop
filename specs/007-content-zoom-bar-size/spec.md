# Feature Specification: Zoom del contenido y tamaño de la barra de pestañas

**Feature Branch**: `007-content-zoom-bar-size`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Deseo poder ajustar independientemente: el tamaño de la barra de título y sus pestañas, y el tamaño del contenido del documento. Para el tamaño de la barra, no quiero la opción en el menú, solamente en la ventana de configuración del theme como 'ajuste tamaño de barra'. En cambio el contenido del documento sí quiero que esté en el menú de arriba, y que también al presionar Ctrl + rueda sobre el área del contenido se pueda hacer zoom in y out, ajustando de a 5 %."

**Depende de**: `004-custom-themes` solo para la historia 3 (la ventana "Temas" donde vive el ajuste de la barra). Las historias 1, 2 y 4 son independientes.

## Clarifications

### Session 2026-11-14

- Q: ¿Se reemplaza el zoom de interfaz de la spec 001 por el zoom del contenido? → A: Sí; Ctrl++/−/0 y Ctrl+rueda pasan a ser zoom del contenido y se enmienda 001 FR-017.
- Q: ¿"Ajuste tamaño de barra" incluye la barra de herramientas del editor? → A: Sí, un solo ajuste escala la barra de pestañas y la barra de herramientas del editor (con sus barras secundarias y menús flotantes) juntas.
- Q: ¿Cómo se abre "Temas"? → A: Panel modal grande dentro de la ventana principal (spec 004).

## Contexto verificado (2026-11-14)

- Hoy existe **un solo zoom que escala toda la interfaz a la vez** (barra de pestañas, barra de estado, diálogos y contenido): Ver → "Acercar interfaz / Alejar interfaz / Restablecer zoom" (Ctrl++, Ctrl+−, Ctrl+0), de 70 % a 200 % en pasos de 10 %, que se recuerda entre sesiones.
- La barra de pestañas mide 25 px de alto fijos (pedido anterior de la persona propietaria). El título de la ventana lo dibuja el sistema operativo (barra de título nativa), no la aplicación.
- La rueda con Ctrl sobre el contenido no tiene ningún efecto definido por la aplicación.
- El editor (versión 0.8.0) ofrece de forma pública un zoom del contenido (factor aplicable sin tocar su barra) y un factor de escala de su barra de herramientas y menús. Su zoom propio por teclado/rueda avanza de a 10 % y no informa el nivel a la aplicación; por eso la aplicación conduce el zoom (pasos de 5 %, persistencia) y deja apagado el del editor.
- La exportación genera siempre páginas A4 con su propio tamaño; no depende de lo que se vea en pantalla.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zoom del contenido desde el menú y el teclado (Priority: P1)

La persona acerca o aleja **solo el contenido del documento** desde el menú Ver (y con atajos), en pasos de 5 %, y puede volver al 100 %. La barra de pestañas, la barra de estado, los menús y los diálogos no cambian de tamaño.

**Why this priority**: Es lo que más se usa para leer cómodo; hoy solo hay un zoom global que agranda también las barras.

**Independent Test**: Abrir un documento, elegir Ver → Acercar contenido cinco veces y comprobar que el texto crece hasta 125 % mientras la barra de pestañas permanece en 25 px; elegir Restablecer y volver a 100 %.

**Acceptance Scenarios**:

1. **Given** un documento abierto al 100 %, **When** se elige Ver → "Acercar contenido", **Then** el contenido pasa a 105 % y el resto de la interfaz no cambia de tamaño.
2. **Given** el contenido al 105 %, **When** se elige "Alejar contenido" cinco veces, **Then** pasa por 100 %, 95 %, … hasta 80 % (cada paso resta exactamente 5 puntos).
3. **Given** cualquier zoom distinto de 100 %, **When** se elige "Tamaño normal del contenido" (Ctrl+0), **Then** vuelve a 100 %.
4. **Given** el zoom en su límite máximo o mínimo, **When** se intenta seguir, **Then** no cambia y se informa brevemente del límite.
5. **Given** un cambio de zoom, **When** se aplica, **Then** el valor actual (por ejemplo "115 %") se muestra en la barra de estado (si está visible) y como aviso breve si no lo está.
6. **Given** cualquier zoom, **When** se cambia de pestaña, se abre otro documento o se alterna entre vista renderizada y Markdown, **Then** el mismo zoom se aplica a todos los documentos y vistas.
7. **Given** el menú Ver, **When** se abre, **Then** muestra las opciones de zoom del contenido con sus atajos (Ctrl++, Ctrl+−, Ctrl+0) y ya **no** ofrece "Acercar/Alejar interfaz".

---

### User Story 2 - Ctrl + rueda sobre el contenido hace zoom (Priority: P1)

Con la tecla Ctrl pulsada, girar la rueda del ratón sobre el área del contenido acerca (hacia adelante) o aleja (hacia atrás) el documento en pasos de 5 % por paso de rueda, sin desplazar el documento.

**Why this priority**: Es el gesto habitual en cualquier visor; fue pedido expresamente.

**Independent Test**: Con el cursor sobre el contenido, mantener Ctrl y dar 4 pasos de rueda hacia adelante; comprobar 120 % y que el documento no se desplazó por la rueda.

**Acceptance Scenarios**:

1. **Given** el cursor sobre el contenido, **When** se gira la rueda hacia adelante con Ctrl pulsada, **Then** el zoom sube 5 % por paso de rueda; hacia atrás, baja 5 %.
2. **Given** Ctrl pulsada, **When** el cursor está sobre la barra de pestañas, la barra de estado, el área de la barra de herramientas del editor o un diálogo, **Then** la rueda no cambia el zoom del contenido.
3. **Given** la rueda girada **sin** Ctrl, **When** el cursor está sobre el contenido, **Then** el documento se desplaza como siempre y el zoom no cambia.
4. **Given** una rueda de alta resolución o un panel táctil que genera muchos eventos pequeños, **When** se usa con Ctrl, **Then** el zoom acumula el movimiento y avanza en pasos de 5 % sin saltos bruscos ni cambios de más de un paso por cada paso físico equivalente.
5. **Given** el zoom que cambia con la rueda, **When** se observa el documento, **Then** el texto que estaba en la parte visible permanece cerca de la misma posición (el zoom no "salta" a otro lugar del documento).
6. **Given** Ctrl + rueda, **When** se gira, **Then** el sistema no aplica además su propio zoom de página (no se produce doble zoom ni cambio de tamaño de la ventana).

---

### User Story 3 - Ajuste del tamaño de las barras en la ventana "Temas" (Priority: P2)

En la ventana "Temas" (especificación 004) hay una opción "Ajuste tamaño de barra" con la que la persona agranda o reduce la barra de pestañas (alto, texto y pestañas) con vista previa inmediata. No hay opción equivalente en ningún menú.

**Why this priority**: Es lo pedido para la barra; depende de que exista la ventana "Temas".

**Independent Test**: Abrir Configuración → Temas…, mover "Ajuste tamaño de barra" a 150 %, comprobar que la barra de pestañas y la de la vista previa crecen y que el contenido no cambia; recorrer los menús y comprobar que no hay opción de tamaño de barra.

**Acceptance Scenarios**:

1. **Given** la ventana "Temas", **When** se mueve "Ajuste tamaño de barra" (en pasos de 5 %, de 75 % a 200 %), **Then** la barra de pestañas (alto, texto, relleno y radio; 100 % = 25 px) y la barra de herramientas del editor (botones, iconos, barras de comparación/historial y menús flotantes) cambian de tamaño proporcionalmente y a la vez.
2. **Given** el ajuste de barra modificado, **When** se mira el contenido del documento, **Then** su tamaño no cambia (ni su zoom).
3. **Given** la ventana "Temas" abierta, **When** se cambia el tamaño de barra, **Then** el cambio se ve al instante en la vista previa y en la barra real, y puede restablecerse a 100 % con un botón.
4. **Given** un tamaño de barra elegido, **When** se cambia de estilo o se cierra y se abre la aplicación, **Then** el tamaño se conserva (es una preferencia de la aplicación, independiente del estilo).
5. **Given** cualquier menú de la aplicación, **When** se revisan todas sus opciones, **Then** ninguna controla el tamaño de la barra.
6. **Given** un tamaño de barra grande, **When** hay muchas pestañas, **Then** la barra mantiene su desplazamiento horizontal, el marcador de modificado y el cierre con botón central siguen funcionando y no se superponen elementos.

---

### User Story 4 - Independencia, persistencia y cero efectos colaterales (Priority: P2)

El zoom del contenido y el tamaño de la barra son preferencias independientes que se recuerdan entre sesiones y no afectan al documento, a la exportación ni a los demás elementos.

**Why this priority**: Garantiza que ajustar uno no rompa lo otro ni el contenido guardado.

**Independent Test**: Poner contenido a 130 % y barra a 120 %, cerrar y abrir la aplicación, comprobar ambos; exportar a PDF y comprobar que el resultado es idéntico al de 100 %.

**Acceptance Scenarios**:

1. **Given** zoom de contenido y tamaño de barra distintos, **When** se cierra y se abre la aplicación, **Then** ambos valores se restauran.
2. **Given** cualquier zoom, **When** se exporta a cualquier formato, **Then** el archivo resultante es idéntico al exportado a 100 % (la exportación no depende del zoom en pantalla).
3. **Given** cualquier zoom, **When** se edita, se guarda o se recupera una sesión, **Then** el contenido del archivo es el mismo y el zoom no marca el documento como modificado ni altera su historial de deshacer ni la posición del cursor.
4. **Given** una versión anterior con "zoom de interfaz" guardado, **When** se abre la versión nueva, **Then** ese valor se convierte en zoom del contenido (dentro del rango admitido) y la barra queda en 100 %.
5. **Given** la interfaz y los diálogos, **When** se cambia el zoom del contenido, **Then** diálogos, menús, barra de estado e iconos de la barra de herramientas del editor conservan su tamaño.

---

### Edge Cases

- Valores guardados fuera de rango o dañados: se corrigen al rango admitido o a 100 % sin error.
- Zoom muy alto con tablas o código anchos: el contenido se desplaza horizontalmente (no se corta) y la barra de desplazamiento sigue accesible.
- Cambio de zoom con la vista Markdown (texto plano) y con la vista renderizada: ambas lo respetan.
- Ctrl + rueda mientras un menú del editor, un diálogo o el selector de color está abierto: no cambia el zoom del contenido.
- Ctrl + rueda sobre imágenes o diagramas dentro del contenido: sigue siendo zoom del documento, no un zoom propio de la imagen.
- Teclados con Ctrl++ en distintas disposiciones (el más/igual/teclado numérico): todas las variantes habituales funcionan.
- Varias ventanas o instancias: la aplicación tiene instancia única; un solo valor de zoom.
- Barra de pestañas en tamaño mínimo/máximo: el texto sigue siendo legible (no menos de 9 px) y las pestañas siguen siendo clicables (área mínima de toque razonable).
- Pantallas con escalado del sistema (125 %, 150 %): los porcentajes de esta función se aplican sobre el escalado del sistema, no lo sustituyen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El menú Ver MUST ofrecer "Acercar contenido" (Ctrl++), "Alejar contenido" (Ctrl+−) y "Tamaño normal del contenido" (Ctrl+0), que afectan **solo** al área de contenido del documento (vista renderizada y vista Markdown).
- **FR-002**: Cada paso de acercar/alejar MUST ser exactamente de 5 puntos porcentuales; el valor inicial es 100 % y el rango admitido es de 50 % a 300 %; en los límites no cambia y se informa.
- **FR-003**: Con Ctrl pulsada, la rueda del ratón sobre el área de contenido MUST cambiar el zoom en pasos de 5 % (adelante acerca, atrás aleja) sin desplazar el documento; MUST acumular el movimiento de ruedas de alta resolución y paneles táctiles; sin Ctrl el comportamiento de la rueda no cambia.
- **FR-004**: Ctrl + rueda fuera del área de contenido (barras, menús, diálogos, selectores) MUST NOT cambiar el zoom del contenido, y el zoom propio del sistema/navegador integrado MUST NOT aplicarse en ningún caso.
- **FR-005**: El zoom del contenido MUST ser un único valor para toda la aplicación (todos los documentos y vistas), aplicarse al instante a todos los editores abiertos y recordarse entre sesiones.
- **FR-006**: El zoom del contenido MUST NOT cambiar el tamaño de la barra de pestañas, la barra de estado, los menús, los diálogos ni la barra de herramientas del editor.
- **FR-007**: Tras cada cambio, el valor actual MUST mostrarse en la barra de estado (si está visible) o como aviso breve (si no lo está).
- **FR-008**: Al cambiar el zoom, el texto visible MUST permanecer aproximadamente en la misma posición y el cursor y la selección MUST conservarse.
- **FR-009**: Las opciones del menú "Acercar/Alejar interfaz" y "Restablecer zoom" actuales MUST sustituirse por las de zoom del contenido; no MUST quedar ningún zoom global de la interfaz en el menú ni en los atajos. Un valor de zoom de interfaz guardado MUST migrarse a zoom del contenido (dentro del rango) y la barra quedar en 100 %.
- **FR-010**: La ventana "Temas" MUST incluir la opción "Ajuste tamaño de barra" (de 75 % a 200 % en pasos de 5 %, 100 % = tamaño actual de 25 px) que escala con un único control, proporcionalmente, la barra de pestañas (alto, texto, relleno y radio) y la barra de herramientas del editor con sus barras secundarias y menús flotantes, con vista previa inmediata y un botón para restablecer a 100 %.
- **FR-011**: El tamaño de la barra MUST ser una preferencia de la aplicación independiente del estilo del editor y del zoom del contenido, se MUST recordar entre sesiones y MUST NOT aparecer en ningún menú.
- **FR-012**: Con cualquier tamaño de barra, las funciones de la barra de pestañas (desplazamiento horizontal, marcador de modificado, cierre con botón central, apertura de pestaña temporal con clic central en el espacio vacío) MUST seguir funcionando, el texto no MUST bajar de 9 px y las pestañas MUST seguir siendo operables.
- **FR-013**: Ni el zoom del contenido ni el tamaño de barra MUST modificar el archivo, marcarlo como modificado, alterar el historial de deshacer ni afectar a la exportación (las exportaciones MUST ser idénticas a las de 100 %).
- **FR-014**: Los valores guardados inválidos o fuera de rango MUST corregirse (al límite más cercano o al valor por defecto) sin error ni pérdida de otras preferencias.
- **FR-015**: Los atajos MUST funcionar con las variantes habituales del teclado (más, igual y teclado numérico) y respetar el manejo central de atajos de la aplicación (sin conflicto con los demás).

### Key Entities

- **Zoom del contenido**: porcentaje (50–300 %, pasos de 5 %) aplicado al área de contenido de todos los documentos; preferencia de la aplicación.
- **Tamaño de la barra**: porcentaje (75–200 %, pasos de 5 %) aplicado a la barra de pestañas; preferencia de la aplicación, independiente del estilo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cada acción de acercar/alejar (menú, teclado o un paso de rueda) cambia el zoom exactamente 5 puntos en el 100 % de las pruebas; 4 pasos adelante desde 100 % dan 120 %.
- **SC-002**: El cambio de zoom se ve en pantalla en menos de 100 ms tras la acción, con un documento de 100 KB abierto.
- **SC-003**: Con el zoom en 150 %, la altura de la barra de pestañas, el tamaño de su texto y el de la barra de estado son idénticos a los de 100 % en el 100 % de las mediciones.
- **SC-004**: Con la barra en 150 %, el área de contenido y su tamaño de texto son idénticos a los de 100 % en el 100 % de las mediciones.
- **SC-005**: Ctrl + rueda cambia el zoom solo sobre el área de contenido: 0 cambios de zoom en 20 intentos sobre barras, menús y diálogos; 0 casos de doble zoom del sistema.
- **SC-006**: Tras cerrar y abrir la aplicación, ambos valores se restauran idénticos en el 100 % de las pruebas, y un valor guardado inválido se corrige sin error en el 100 % de las pruebas de corrupción.
- **SC-007**: Las exportaciones del documento de referencia a 50 %, 100 % y 300 % de zoom producen archivos con el mismo contenido visual (mismo número de páginas y mismo aspecto).
- **SC-008**: Con la barra en 75 % y en 200 %, el 100 % de las funciones de la barra de pestañas (abrir, cerrar con botón central, desplazar, marcador de modificado) siguen operativas en las pruebas.
- **SC-009**: El uso de memoria con un documento abierto sigue por debajo del presupuesto del proyecto (250 MB) y el desplazamiento con zoom en 300 % se mantiene fluido (sin bloqueos de más de 100 ms).

## Assumptions

- "Barra de título y sus pestañas" se interpreta como la **barra de pestañas de la aplicación** (la franja con las pestañas de los documentos), que es la que la aplicación controla; la barra de título del sistema operativo (con el nombre de la ventana y los botones de minimizar/cerrar) la dibuja Windows y no se puede escalar desde la aplicación. Si la intención era otra cosa, se ajusta antes del plan.
- El zoom del contenido sustituye al zoom global de interfaz actual, con los mismos atajos (Ctrl++, Ctrl+−, Ctrl+0): ya hay un ajuste de barra independiente, y tener dos zooms con los mismos atajos sería confuso. Se puede restaurar un zoom de interfaz completo como opción futura.
- El zoom del contenido es global, no por documento. Un zoom por documento es una candidata futura.
- Rango de zoom 50 %–300 % y de barra 75 %–200 % son valores por defecto razonables; el paso de 5 % lo fijó la persona propietaria.
- El valor del zoom se muestra en la barra de estado (existente) y como aviso breve cuando no está visible; no se añade un control gráfico nuevo (deslizador) para el zoom del contenido.
- El zoom del contenido aplicado a los editores visibles MUST NOT alcanzar al visor interno que usa la exportación (si no, la exportación saldría ampliada); se cubre con FR-013 y una prueba específica.
- El ajuste de la barra vive en la ventana "Temas" de la especificación 004; hasta que exista esa ventana, la historia 3 no se puede completar (las historias 1, 2 y 4 sí). Alternativa mientras tanto: ninguna opción en el menú, por pedido expreso.
- Se mantienen los criterios del proyecto: trabajo local, pruebas unitarias, de interfaz y nativas (incluida la verificación del gesto Ctrl + rueda en la aplicación real) y no subir al remoto hasta que la persona lo indique.
