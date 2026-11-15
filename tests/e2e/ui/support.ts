import type { Page } from "@playwright/test";

export const FP = { mtimeMs: 1, size: 3, hash: "h1" };
export const PREFS = {
  version: 1, theme: "light", uiZoom: 1, statusBarVisible: true,
  lastDirectory: null, editorPoolSize: 3, largeFileWarnBytes: 262144, editorStyle: "default",
  editorToolbarVisible: true, editorHistory: true, spellcheckDisabled: false, exportStyle: "screen", contentZoom: 1, barScale: 1,
};

export type Responses = Record<string, unknown>;

/**
 * Replaces the Tauri bridge with an in-page stub (UI layer of the E2E suite).
 * `responses` maps command -> JSON response (or `{ __reject: AppError }` to fail).
 * Tests drive Rust->frontend events with `emit()` and inspect `calls()`.
 */
export async function installTauri(page: Page, responses: Responses) {
  await page.addInitScript((initial) => {
    const w = window as unknown as Record<string, unknown>;
    const calls: { cmd: string; args: unknown }[] = [];
    const callbacks = new Map<number, (e: unknown) => void>();
    const listeners = new Map<string, { eventId: number; handler: number }[]>();
    let nextId = 1;
    w.__responses = initial;
    w.__calls = calls;
    w.__TAURI_INTERNALS__ = {
      metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
      transformCallback(cb: (e: unknown) => void) {
        const id = nextId++;
        callbacks.set(id, cb);
        return id;
      },
      convertFileSrc: (p: string) => `asset://${p}`,
      async invoke(cmd: string, args: Record<string, unknown>) {
        calls.push({ cmd, args });
        if (cmd === "plugin:event|listen") {
          const list = listeners.get(args.event as string) ?? [];
          const eventId = nextId++;
          list.push({ eventId, handler: args.handler as number });
          listeners.set(args.event as string, list);
          return eventId;
        }
        if (cmd.startsWith("plugin:event|")) return null;
        const r = (w.__responses as Record<string, unknown>)[cmd];
        if (r && typeof r === "object" && "__reject" in (r as object)) throw (r as { __reject: unknown }).__reject;
        // { __echoArg: "name" } answers with that argument (e.g. commands that store and return a list)
        if (r && typeof r === "object" && "__echoArg" in (r as object)) return args[(r as { __echoArg: string }).__echoArg];
        return r === undefined ? null : r;
      },
    };
    // like the real bridge: unlistening really removes the listener (React StrictMode mounts twice in dev)
    w.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener(event: string, eventId: number) {
        listeners.set(event, (listeners.get(event) ?? []).filter((l) => l.eventId !== eventId));
      },
    };
    w.__emit = (event: string, payload: unknown) => {
      for (const l of listeners.get(event) ?? []) callbacks.get(l.handler)?.({ event, id: l.eventId, payload });
    };
  }, responses);
}

export const emit = (page: Page, event: string, payload: unknown = {}) =>
  page.evaluate(([e, p]) => (window as unknown as { __emit(e: string, p: unknown): void }).__emit(e as string, p), [event, payload]);

export const menu = (page: Page, id: string) => emit(page, "menu://action", { id });

export const calls = (page: Page, cmd: string) =>
  page.evaluate(
    (c) => (window as unknown as { __calls: { cmd: string; args: unknown }[] }).__calls.filter((x) => x.cmd === c).map((x) => x.args),
    cmd,
  );

export const setResponse = (page: Page, cmd: string, value: unknown) =>
  page.evaluate(([c, v]) => ((window as unknown as { __responses: Record<string, unknown> }).__responses[c as string] = v), [cmd, value]);

export const baseResponses = (extra: Responses = {}): Responses => ({
  session_load: null, recovery_list: [], settings_load: PREFS, settings_save: PREFS,
  get_launch_files: [], watch_documents: null, recovery_write: null, recovery_delete: null,
  session_save: null, ...extra,
});

export const diskDoc = (path: string, content: string, hash = "h1") => ({
  path, content, encoding: "utf-8", bom: false, eol: "lf", fingerprint: { ...FP, hash },
});

/** Loads the app and waits until startup registered its listeners (shortcuts start before settings load). */
export async function gotoApp(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() =>
    (window as unknown as { __calls: { cmd: string }[] }).__calls.some((c) => c.cmd === "settings_load"),
  );
}
