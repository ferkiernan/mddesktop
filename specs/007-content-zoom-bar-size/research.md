# Research: zoom del contenido y tamaño de barras

## R1 — Mecanismo del zoom
- **Decision**: variable pública `--mdw-content-zoom` (mdwysiwyg 0.8.0) escrita por la app; `allowContentZoom` apagado.
- **Rationale**: el zoom propio del editor va de a 10 % y no informa el nivel (no se podría guardar); la variable se aplica aunque la propiedad esté apagada.

## R2 — Ámbito
- **Decision**: CSS `.editor-slot .mdd-editor { --mdw-content-zoom: X }`: solo los editores visibles; el visor de exportación está fuera de `.editor-slot` y fija `1`.

## R3 — Ctrl + rueda
- **Decision**: oyente `wheel` en captura y no pasivo: con Ctrl siempre `preventDefault` (sin zoom del WebView); solo cambia el zoom si el objetivo está en el área de contenido; acumula deltas (100 px = un paso de 5 %).

## R4 — Tamaño de barras
- **Decision**: un único `barScale`: barra de pestañas por CSS (`--mdd-bar-scale`) y barra del editor con `--mdw-toolbar-scale` (aclaración: un solo ajuste para ambas).

## R5 — Migración
- **Decision**: si `settings.json` tiene `uiZoom` y no `contentZoom`, Rust copia el valor una vez.
