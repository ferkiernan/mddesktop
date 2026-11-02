# Quickstart: validación de Markdown Desktop Editor

Guía de preparación y validación de extremo a extremo. Detalles de interfaces en [contracts/](contracts/) y entidades en [data-model.md](data-model.md).

## 1. Prerrequisitos (Windows 10/11 x64)

Estado detectado en esta máquina (2026-11-01): Node 24.18 y npm 11.16 presentes; **faltan Rust (`rustc`, `cargo`) y las herramientas de compilación de MSVC**.

```powershell
winget install --id Rustlang.Rustup
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
rustup default stable-x86_64-pc-windows-msvc
```

- WebView2 Runtime: incluido en Windows 11 y Windows 10 actualizado (verificar en "Aplicaciones instaladas").
- Solo para desarrollo; el usuario final no necesita nada de esto (FR-029).

## 2. Instalación y ejecución en desarrollo

```bash
npm install
npm run tauri dev
```

Esperado: ventana con menú, barra de pestañas vacía y barra de estado; sin consola de errores.

## 3. Pruebas automáticas

```bash
npm run test            # Vitest + React Testing Library
npm run test:e2e:ui     # Playwright (UI, IPC simulado)
cargo test --manifest-path src-tauri/Cargo.toml   # servicios Rust
npm run test:e2e:native # Playwright sobre el binario real (tras S5)
```

## 4. Escenarios de validación (mapeados a las historias)

| # | Historia | Pasos | Resultado esperado |
|---|---|---|---|
| V1 | US1 | Abrir `fixtures/sample.md`, editar, `Ctrl+S` | El archivo en disco refleja el cambio; indicador de cambios desaparece; confirmación visible |
| V2 | US1 | `Ctrl+N`, escribir, `Ctrl+S` | Se abre Guardar como; la pestaña toma el nombre elegido |
| V3 | US1 | Abrir el mismo archivo dos veces | Se activa la pestaña existente; no hay duplicado |
| V4 | US2 | Abrir 3 archivos, escribir en cada uno, alternar pestañas | Cursor/scroll/undo se conservan en los recientes (pool) y el contenido en todos; reordenar por arrastre |
| V5 | US3 | Modificar y cerrar pestaña / cerrar todas / salir | Diálogo Guardar/Descartar/Cancelar; Cancelar no cierra |
| V6 | US3 | Con cambios locales, modificar el archivo desde otro editor | Aviso con 3 opciones (pisar / abrir en pestaña nueva / recargar); tras recargar, `Ctrl+Z` restaura lo anterior |
| V7 | US4 | Editar sin guardar, terminar el proceso (`taskkill /F`), relanzar | Oferta de recuperación; se restauran pestañas y pestaña activa; el archivo original no cambió |
| V8 | US5 | Doble clic en un `.md` con la app cerrada y luego abierta | Abre en una sola instancia; el segundo archivo aparece como pestaña en la misma ventana |
| V9 | US5 | Arrastrar `.md` y un `.txt` sobre la ventana | El `.md` se abre; el `.txt` se rechaza con mensaje |
| V10 | US6 | Probar cada atajo de la tabla del spec; alternar tema y reiniciar | Acciones correctas sin conflicto con el editor; el tema persiste |
| V11 | Bordes | Abrir archivo > 256 KB | Aviso con opción de abrir o cancelar; UI sin bloqueo |
| V12 | Bordes | Abrir un `.md` en Windows-1252 y guardar | Pide confirmación para convertir a UTF-8 |
| V13 | Integridad | Guardar un `.md` CRLF sin tocar el contenido | Bytes idénticos (EOL y BOM preservados); sin escritura si no hay cambios |
| V14 | US7 (cuando exista U2/U3) | Insertar imagen en documento guardado, aceptar copia a `assets/` | Ruta relativa en el Markdown; la imagen se ve; mover la carpeta no la rompe |
| V15 | Rendimiento | `npm run perf` en el equipo de referencia | Informe con arranque en frío, RAM en reposo, cambio de pestaña y apertura frente a SC-001…SC-003 |

## 5. Build de producción e instalación

```bash
npm run tauri build
```

Esperado: instalador NSIS (`src-tauri/target/release/bundle/nsis/*-setup.exe`). Instalar en una máquina sin Node/Rust, comprobar asociaciones `.md`/`.markdown` y repetir V7–V9 con la app instalada (SC-009, SC-010).
