# Contract: Editor Adapter (`mdwysiwyg`)

Único punto del frontend que importa `mdwysiwyg`. Aísla las limitaciones de la librería ([research.md](../research.md) R1–R3, R9) para poder adoptar las mejoras upstream sin tocar el resto.

## Interfaz del adaptador

```typescript
interface EditorAdapterProps {
  documentId: string;
  initialContent: string;            // solo se lee al montar (librería no controlada)
  onChange(markdown: string): void;  // normaliza a "\n"
  active: boolean;                   // false => oculto, sin foco
  className?: string;                // tema claro/oscuro vía --mdw-*
}

interface EditorAdapterHandle {
  isModified(): boolean;                 // existe hoy
  reset(): void;                         // existe hoy
  focus(): void;                         // best effort (foco del contenedor)
  setMarkdown?(md: string): void;        // U1 — undefined hasta que exista upstream
  insertMarkdown?(md: string): void;     // U2
}
```

## Qué existe hoy vs. qué no

| Capacidad | Hoy (0.2.1) | Con upstream |
|---|---|---|
| Montar con contenido, `onChange` | Sí | — |
| `reset()`, `isModified()` | Sí | — |
| Cursor/selección/scroll/undo entre pestañas | No (solo vía pool de instancias montadas) | U4 |
| Recargar contenido con Ctrl+Z | No → fallback `reloadSnapshot` | U1 |
| Insertar imagen en el cursor | No | U2 |
| Mostrar imágenes relativas | No | U3 (`resolveImageSrc`) |

El adaptador detecta la presencia de `setMarkdown`/`insertMarkdown` en el handle y elige la ruta (nativa o fallback); los tests cubren ambas.

## Responsabilidades

- Ciclo de vida del pool LRU: monta/oculta/desmonta ([plan.md](../plan.md), decisión D2).
- Nunca duplica funciones del editor (negrita, tablas, exportar, etc.).
- No guarda archivos ni toca el filesystem.
- Aplica `onlyView` solo si el documento se abre en modo lectura (no previsto en MVP).
- Atajos: el editor maneja Ctrl+Z/Y/B/I…; el gestor de atajos de la app **no** intercepta esos eventos cuando el foco está en el editor (FR-018). Ctrl+Z solo se intercepta en el fallback de FR-014a y solo mientras `reloadSnapshot` esté activo.

## Pruebas de contrato

- Montar con contenido y verificar `onChange` tras una edición.
- `isModified()` coherente con `savedContent` tras guardar (la app remonta o ajusta su referencia; el estado sucio de la app se calcula por comparación propia, no por `isModified()`).
- Alternar vistas sin editar no dispara `onChange` ni cambia el contenido.
- Corpus de Markdown real: abrir sin editar → guardar produce bytes idénticos (spike S2).
