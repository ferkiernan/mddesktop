// S1 harness: mounts N editors so RAM/startup can be measured (build-time VITE_SPIKE_EDITORS).
import { Suspense } from "react";
import { LazyMarkdownEditor } from "../features/editor/lazy";
import sample from "../../tests/fixtures/markdown/gfm-lf.md?raw";

const N = Number(import.meta.env.VITE_SPIKE_EDITORS ?? 0);
const content = sample.repeat(20);

export const spikeEnabled = N > 0;

export function SpikeEditors() {
  return (
    <Suspense fallback={null}>
      {Array.from({ length: N }, (_, i) => (
        <LazyMarkdownEditor key={i} initialContent={content} width="100%" height={260} />
      ))}
    </Suspense>
  );
}
