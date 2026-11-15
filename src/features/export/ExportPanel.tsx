// Export panel (spec 005): pick the style of the exported file and see the result before choosing where to
// save it. The preview is built with the real export pipeline and its bytes are the ones written (FR-004).
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../settings/store";
import { buildExport, toBase64, type BuiltExport } from "./exportDocument";
import { closeExportPanel, type ExportPanelRequest } from "./exportPanelStore";
import { exportStyleOptions, resolveExportStyle } from "./exportStyles";

const FORMAT_LABEL: Record<string, string> = { html: "Página web", pdf: "PDF", docx: "Word", odt: "OpenDocument" };

interface Preview {
  /** The style this preview was built with: results of older choices are never shown. */
  styleId: string;
  built: BuiltExport;
  urls: string[];
}

export default function ExportPanel({ request }: { request: ExportPanelRequest }) {
  const remembered = useSettings((s) => s.prefs.exportStyle);
  const options = useMemo(() => exportStyleOptions(), []);
  const [styleId, setStyleId] = useState(() => resolveExportStyle(remembered).id);
  const [result, setResult] = useState<Preview | null>(null);
  const [progressState, setProgress] = useState<{ styleId: string; text: string } | null>(null);
  const [errorState, setError] = useState<{ styleId: string; text: string } | null>(null);
  // derived: only what belongs to the current choice is shown
  const preview = result?.styleId === styleId ? result : null;
  const error = errorState?.styleId === styleId ? errorState.text : null;
  const progress = progressState?.styleId === styleId ? progressState.text : "Preparando vista previa…";
  const [page, setPage] = useState(1);
  /** Page being looked at; kept when the style changes (spec 005 US3 #4). */
  const keepPage = useRef(1);
  const generation = useRef(0);
  const signal = useRef({ cancelled: false });
  const scroller = useRef<HTMLDivElement>(null);
  const urlsRef = useRef<string[]>([]);

  const revoke = () => {
    urlsRef.current = [];
  };

  // (re)build the preview whenever the style changes; only the latest generation is shown
  useEffect(() => {
    const gen = ++generation.current;
    signal.current.cancelled = true;
    const sig = { cancelled: false };
    signal.current = sig;
    const option = resolveExportStyle(styleId);
    const report = (text: string) => gen === generation.current && setProgress({ styleId, text });
    buildExport(request.markdown, request.format, request.title, report, request.documentId, option.vars, sig)
      .then((built) => {
        if (gen !== generation.current || sig.cancelled) return;
        revoke();
        // data: URLs: the app CSP allows data: images but not blob: (keeps the policy unchanged)
        const urls = (built.pages ?? []).map((p) => `data:image/jpeg;base64,${toBase64(p.jpeg)}`);
        urlsRef.current = urls;
        setResult({ styleId, built, urls });
        setPage(Math.min(keepPage.current, Math.max(1, urls.length)));
      })
      .catch((e: unknown) => {
        if (gen === generation.current && !sig.cancelled) setError({ styleId, text: e instanceof Error ? e.message : String(e) });
      });
  }, [styleId, request]);

  useEffect(
    () => () => {
      signal.current.cancelled = true;
      revoke();
    },
    [],
  );

  const cancel = () => {
    signal.current.cancelled = true;
    closeExportPanel(null);
  };
  const confirm = () => {
    if (!preview) return;
    void useSettings.getState().update({ exportStyle: styleId });
    closeExportPanel(preview.built);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !preview?.urls.length) return;
    const pageH = el.scrollHeight / preview.urls.length;
    const p = Math.min(preview.urls.length, Math.floor((el.scrollTop + el.clientHeight / 3) / pageH) + 1);
    keepPage.current = p;
    setPage(p);
  };

  // a new preview (another style) opens at the page that was being looked at
  useEffect(() => {
    const el = scroller.current;
    if (!el || !preview?.urls.length) return;
    const target = Math.min(keepPage.current, preview.urls.length);
    const img = el.querySelectorAll("img")[target - 1] as HTMLImageElement | undefined;
    if (!img) return;
    const go = () => (el.scrollTop += img.getBoundingClientRect().top - el.getBoundingClientRect().top - 12);
    if (img.complete) go();
    else img.addEventListener("load", go, { once: true });
  }, [preview]);

  const total = preview?.urls.length ?? 0;
  return (
    <div className="dialog-backdrop">
      <div className="export-panel" role="dialog" aria-modal="true" aria-labelledby="export-panel-title">
        <header className="export-panel-head">
          <h2 id="export-panel-title">Exportar: {FORMAT_LABEL[request.format] ?? request.format}</h2>
          <span className="export-panel-status" aria-live="polite">
            {error ? `Error: ${error}` : preview ? (total ? `Página ${page} de ${total}` : "Vista previa continua (ancho A4)") : progress}
          </span>
        </header>
        <div className="export-panel-body">
          <div className="export-panel-styles" role="radiogroup" aria-label="Estilo de la exportación">
            {options.map((o) => (
              <label key={o.id} className={o.id === styleId ? "selected" : ""}>
                <input
                  type="radio"
                  name="export-style"
                  value={o.id}
                  checked={o.id === styleId}
                  autoFocus={o.id === styleId}
                  onChange={() => setStyleId(o.id)}
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="export-panel-preview" ref={scroller} onScroll={onScroll} tabIndex={0} aria-label="Vista previa">
            {!preview && !error && <div className="export-panel-progress">{progress}</div>}
            {preview && total > 0 &&
              preview.urls.map((u, i) => <img key={i} src={u} alt={`Página ${i + 1} de ${total}`} className="export-page" />)}
            {preview && total === 0 && preview.built.html && (
              <iframe title="Vista previa" className="export-continuous" sandbox="" srcDoc={preview.built.html} />
            )}
          </div>
        </div>
        {request.format === "docx" || request.format === "odt" ? (
          <p className="export-panel-note">Word y OpenDocument reparten las páginas al abrir el archivo: la vista previa muestra el contenido y los colores.</p>
        ) : null}
        <div className="dialog-actions">
          <button onClick={cancel}>Cancelar</button>
          <button className="primary" disabled={!preview} onClick={confirm}>
            Exportar…
          </button>
        </div>
      </div>
    </div>
  );
}
