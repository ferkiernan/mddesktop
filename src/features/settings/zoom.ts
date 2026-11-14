// Content zoom and bar size (spec 007). The content zoom scales only the document area of the visible editors
// (mdwysiwyg `--mdw-content-zoom`); the bar size scales the tab bar and the editor toolbar together
// (`--mdd-bar-scale`, mdwysiwyg `--mdw-toolbar-scale`). Neither reaches the hidden export viewer, which lives
// outside `.editor-slot` and pins `--mdw-content-zoom: 1` (spec 005).
import { toast } from "../../ui/Toast";
import { useSettings } from "./store";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.05;
export const BAR_MIN = 0.75;
export const BAR_MAX = 2;

const STYLE_EL_ID = "mdd-zoom-styles";
const round5 = (n: number) => Math.round(n * 20) / 20;
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, round5(z)));
export const clampBar = (b: number) => Math.min(BAR_MAX, Math.max(BAR_MIN, round5(b)));
export const percent = (f: number) => `${Math.round(f * 100)} %`;

export function zoomCss(contentZoom: number, barScale: number): string {
  return (
    `:root{--mdd-bar-scale:${barScale}}` +
    `.editor-slot .mdd-editor{--mdw-content-zoom:${contentZoom};--mdw-toolbar-scale:${barScale}}`
  );
}

export function applyZoom(contentZoom: number, barScale: number) {
  let el = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_EL_ID;
    document.head.appendChild(el);
  }
  el.textContent = zoomCss(contentZoom, barScale);
}

/** Scroll container of the active editor's content (rendered or Markdown view). */
function activeScroller(): HTMLElement | null {
  const slot = document.querySelector(".editor-slot:not([hidden])");
  if (!slot) return null;
  const candidates = Array.from(slot.querySelectorAll<HTMLElement>("*")).filter(
    (el) => el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY),
  );
  return candidates[0] ?? null;
}

/** Sets the content zoom, keeping the visible text near the same place, and shows the new value. */
export async function setContentZoom(next: number): Promise<void> {
  const prefs = useSettings.getState().prefs;
  const target = clampZoom(next);
  if (target === prefs.contentZoom) {
    toast(next > prefs.contentZoom ? `Zoom máximo: ${percent(ZOOM_MAX)}` : `Zoom mínimo: ${percent(ZOOM_MIN)}`, 1500);
    return;
  }
  const scroller = activeScroller();
  const ratio = scroller && scroller.scrollHeight ? scroller.scrollTop / scroller.scrollHeight : 0;
  await useSettings.getState().update({ contentZoom: target });
  if (scroller) requestAnimationFrame(() => (scroller.scrollTop = ratio * scroller.scrollHeight));
  if (!useSettings.getState().prefs.statusBarVisible) toast(`Zoom del contenido: ${percent(target)}`, 1200);
}

export const zoomIn = () => setContentZoom(useSettings.getState().prefs.contentZoom + ZOOM_STEP);
export const zoomOut = () => setContentZoom(useSettings.getState().prefs.contentZoom - ZOOM_STEP);
export const zoomReset = () => setContentZoom(1);

export const setBarScale = (b: number) => useSettings.getState().update({ barScale: clampBar(b) });

/** True when `target` is inside the document area of a visible editor (not its toolbar, menus or dialogs). */
export function isContentArea(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  if (!el || !el.closest(".editor-slot:not([hidden])")) return false;
  if (el.closest("[class*=MarkdownEditor_toolbar], [role=menu], [role=dialog]")) return false;
  return !!el.closest(".ProseMirror, textarea, [class*=MarkdownEditor_content], [class*=MarkdownEditor_source]");
}

/**
 * Ctrl + wheel over the content zooms it in 5 % steps (accumulating fine-grained wheels and touchpads);
 * Ctrl + wheel anywhere never triggers the WebView's own page zoom.
 */
export function startWheelZoom(): () => void {
  let acc = 0;
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); // no page zoom, no scrolling
    if (!isContentArea(e.target)) return;
    const px = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
    acc += px;
    while (Math.abs(acc) >= 100) {
      const dir = acc < 0 ? 1 : -1; // wheel forward (negative delta) zooms in
      acc -= -dir * 100;
      void setContentZoom(useSettings.getState().prefs.contentZoom + dir * ZOOM_STEP);
    }
  };
  window.addEventListener("wheel", onWheel, { passive: false, capture: true });
  return () => window.removeEventListener("wheel", onWheel, { capture: true });
}
