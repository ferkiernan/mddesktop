# Research: Estilos propios y panel "Temas"

## R1 — Dónde se abre
- **Decision**: panel modal grande dentro de la ventana principal (aclaración 2026-11-14).
- **Rationale**: no suma una segunda vista web (presupuesto de memoria) ni complica la instancia única o el menú.
- **Alternatives**: ventana nativa (más memoria y gestión de cierre); pestaña (mezcla documentos con configuración).

## R2 — Persistencia
- **Decision**: `styles.json` en la carpeta de datos, escrito por Rust de forma atómica; un archivo dañado se aparta como `.corrupt-<ts>` y se usan los estilos incluidos.
- **Rationale**: Rust es dueño del disco (constitución II/V); mismo patrón que `settings.json`.

## R3 — Seguridad de los valores
- **Decision**: los valores se inyectan en una hoja de estilos: solo colores, degradados, listas de fuentes y números; prohibidos `; { } < > \`, `url(` y `expression`. Validación en Rust y en zod.

## R4 — Modo básico
- **Decision**: colores base (fondo, texto, acento, bordes, barra, y opcional fondo de pestañas) + tipografía; `deriveVars` produce todas las variables garantizando contraste (texto ≥ 4,5:1, código ≥ 3:1, fondo de Mermaid claro).
- En avanzado, los valores explícitos (`overrides`) ganan a los derivados; "Restablecer" los quita.

## R5 — Registro en la app
- **Decision**: `registerCustomStyles` en `applyStyle` (hoja con ámbito `html[data-editor-style]`), `exportStyleOptions` (panel de exportación) y `set_custom_styles_menu` (sección propia del menú nativo, reconstruida al vuelo).
