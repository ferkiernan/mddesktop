# Quickstart: validar la actualización del editor

## Prerrequisitos

- Node 22+, Rust estable, WebView2; repo limpio en `main`.

## 1. Build reproducible (US1)

```bash
rm -rf node_modules && npm ci
node -p "require('./node_modules/mdwysiwyg/package.json').version"   # 0.8.0
```

## 2. Sin regresiones (US2) — expectativas existentes sin cambios

```bash
npx tsc --noEmit && npm run lint
npx vitest run
cd src-tauri && cargo test && cd ..
npx playwright test
node scripts/build-test-exe.mjs
node tests/e2e/native/export.cdp.mjs "$TEMP/mddesktop-test.exe"
node tests/e2e/native/recovery.cdp.mjs "$TEMP/mddesktop-test.exe"
node tests/e2e/native/shortcuts.cdp.mjs "$TEMP/mddesktop-test.exe"
node tests/e2e/native/images.cdp.mjs "$TEMP/mddesktop-test.exe"
node tests/e2e/native/os-integration.cdp.mjs "$TEMP/mddesktop-test.exe"
```

Esperado: todo PASS sin tocar aserciones.

## 3. Estilos completos (US3)

```bash
node tests/e2e/native/styles.cdp.mjs "$TEMP/mddesktop-test.exe"
```

Revisar capturas por estilo: código resaltado, cita, enlaces, menú de tabla, diálogo de enlace legibles (especialmente Dark y Winamp).

## 4. Opciones nuevas (US6)

```bash
node tests/e2e/native/editor-options.cdp.mjs "$TEMP/mddesktop-test.exe"
```

Esperado: Ver → Mostrar barra de herramientas oculta/muestra la barra en todos los editores sin marcar modificado; Configuración → Historial de versiones muestra el reloj; ambas persisten tras reiniciar.

## 5. Rendimiento (US5)

```bash
powershell -File scripts/perf/measure.ps1
node scripts/perf/measure-ui.mjs
```

Esperado: < 250 MB con un documento; apertura de 100 KB ≤ +20 %; registrar en `docs/performance.md`.

## 6. Entrega (FR-013)

`npm run tauri build`, copiar el exe a la app instalada (si no está abierta), comparar hashes, informar la ruta del instalador.
