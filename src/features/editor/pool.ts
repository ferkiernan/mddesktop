/**
 * LRU pool of document ids that keep a mounted (hidden) editor.
 * mdwysiwyg is uncontrolled and exposes no cursor/scroll/undo state, so keeping the
 * instance mounted is the only way to preserve them (plan D2, research R2).
 */
export function touchPool(pool: string[], activeId: string | null, max: number, validIds: string[]): string[] {
  const valid = new Set(validIds);
  let next = pool.filter((id) => valid.has(id) && id !== activeId);
  if (activeId && valid.has(activeId)) next = [activeId, ...next];
  return next.slice(0, Math.max(1, max));
}
