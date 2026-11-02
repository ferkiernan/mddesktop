import { app } from "../../services/ipc";
import { events } from "../../services/events";
import { ask } from "../../ui/dialogs";
import { openFiles } from "./actions";

const fileName = (p: string) => p.split(/[/\\]/).pop() ?? p;

/** Opens files that arrive from the OS (argv, second instance, drop) and reports rejected ones. */
export function startOpenFilesHandler(): () => void {
  const unlisteners: (() => void)[] = [];
  let stopped = false;
  const keep = (p: Promise<() => void>) =>
    p
      .then((u) => (stopped ? u() : unlisteners.push(u)))
      .catch(() => undefined); // not inside Tauri

  keep(events.onOpenFiles(({ paths }) => void openFiles(paths)));
  keep(
    events.onRejectedFiles(({ paths }) => {
      void ask({
        title: "Archivo no compatible",
        message: `Solo se abren archivos .md y .markdown. Rechazados: ${paths.map(fileName).join(", ")}`,
        buttons: [{ label: "Aceptar", value: "ok", primary: true }],
      });
    }),
  );
  app
    .getLaunchFiles()
    .then((paths) => (paths.length ? openFiles(paths) : undefined))
    .catch(() => undefined);

  return () => {
    stopped = true;
    unlisteners.forEach((u) => u());
  };
}
