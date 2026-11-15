# Bug Assessment: "Aplicar" del panel Temas siempre deshabilitado

- **Slug**: themes-apply-disabled
- **Created**: 2026-11-15
- **Source**: pasted text
- **Verdict**: likely valid, needs reproduction (comportamiento confuso reproducido; "siempre" no reproducido)
- **Severity**: low

## Report (verbatim or summarized)

> el boton "aplicar" de la ventana de temas está siempre grisado.

## Symptom

El botón "Aplicar" del panel Temas aparece deshabilitado. Esperado: poder aplicar el estilo elegido desde el panel.

## Reproduction

Probado en Chromium (Playwright, IPC simulado) y en la app real (WebView2, exe de prueba con el código actual):

1. Configuración → Temas…: el panel abre con el estilo **activo** seleccionado → "Aplicar" **deshabilitado**.
2. Clic en otro estilo de la lista (p. ej. Winamp) → "Aplicar" **habilitado**; al pulsarlo se aplica.
3. Duplicar / editar / guardar → "Aplicar" habilitado; tras aplicar, vuelve a deshabilitarse (el seleccionado pasa a ser el activo).

No reproduce que esté deshabilitado *siempre*. Sí reproduce que, al abrir, está gris y no hay ninguna indicación de por qué; con un estilo incluido seleccionado tampoco hay campos editables que lo habiliten, así que parece inutilizable.

[NEEDS CLARIFICATION: ¿en qué paso lo ves gris? ¿después de elegir otro estilo en la lista, o al cambiar colores / el tamaño de barra?]

## Suspected Code Paths

- `src/features/themes/ThemesPanel.tsx:388` — `disabled={selected === active && !dirty}`: deshabilita "Aplicar" cuando el seleccionado ya es el activo y no hay cambios; el panel abre así (`useState<string>(active)`, línea 130).
- `src/features/themes/ThemesPanel.tsx` (control "Ajuste tamaño de barra") — se aplica al instante; no pasa por "Aplicar", lo que puede hacer pensar que el botón debería habilitarse.

## Root Cause Hypothesis

No es un fallo de lógica sino de diseño de interacción: el botón solo tiene sentido cuando hay algo distinto que aplicar, pero el panel abre justo en el único estado en que no lo hay, sin explicarlo; cambiar el tamaño de barra (que sí se aplica al instante) tampoco lo habilita. Confianza: media (falta confirmar el paso exacto con la persona).

## Proposed Remediation

**Preferred**: "Aplicar" siempre habilitado cuando hay un estilo seleccionado. Si hay cambios sin guardar, guarda y aplica (como hoy); si el seleccionado ya es el activo, lo vuelve a aplicar (inocuo) y confirma con un aviso breve "Estilo aplicado: X". Añadir junto a la lista una marca clara del activo (ya existe "· activo") y un `title` en el botón que explique qué hace.

**Alternatives**:
- Mantener el deshabilitado pero cambiar el texto a "Aplicado ✓" cuando el seleccionado es el activo (más preciso, pero sigue pareciendo bloqueado).

**Files likely to change**:
- `src/features/themes/ThemesPanel.tsx`
- `tests/e2e/ui/themes-zoom.spec.ts`

**Tests to add or update**:
- Al abrir el panel, "Aplicar" está habilitado; pulsarlo con el estilo activo no cambia nada y muestra el aviso.
- Elegir otro estilo y "Aplicar" lo activa (ya cubierto).

## Risks & Considerations

- Ninguno de datos: aplicar el activo es idempotente.
- Mantener el foco y Escape del panel como están.

## Open Questions

- [NEEDS CLARIFICATION: paso exacto en que aparece gris (ver Reproduction).]
