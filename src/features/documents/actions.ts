import type { FileFingerprint } from "../../services/contracts";
import { documents } from "../../services/ipc";
import { toAppError } from "../../services/errors";
import { ask } from "../../ui/dialogs";
import { toast } from "../../ui/Toast";
import { useDocuments } from "./store";

const fmtMB = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

function showError(title: string, e: unknown) {
  const err = toAppError(e);
  return ask({ title, message: err.message, buttons: [{ label: "Aceptar", value: "ok", primary: true }] });
}

export function newDocument(): string {
  return useDocuments.getState().newDocument();
}

/** Opens the given paths, or shows the native picker when none are given. */
export async function openFiles(paths?: string[]): Promise<void> {
  let list: string[];
  try {
    list = paths ?? (await documents.pickOpenFiles());
  } catch (e) {
    await showError("No se pudo abrir", e);
    return;
  }
  for (const path of list) {
    const store = useDocuments.getState();
    const existing = store.findByPath(path);
    if (existing) {
      store.setActive(existing.id);
      continue;
    }
    try {
      let result;
      try {
        result = await documents.read(path);
      } catch (e) {
        const err = toAppError(e);
        if (!err.is("TOO_LARGE")) throw err;
        const size = Number((err.details as { size?: number } | undefined)?.size ?? 0);
        const choice = await ask({
          title: "Archivo grande",
          message: `El archivo pesa ${fmtMB(size)} y podría tardar en abrirse. ¿Abrirlo igualmente?`,
          buttons: [
            { label: "Cancelar", value: "cancel" },
            { label: "Abrir", value: "open", primary: true },
          ],
        });
        if (choice !== "open") continue;
        result = await documents.read(path, true);
      }
      useDocuments.getState().addOpened(result);
    } catch (e) {
      await showError("No se pudo abrir el archivo", e);
    }
  }
}

/** Saves the document; documents without a path go through Save As. Returns true when saved. */
export async function save(id: string): Promise<boolean> {
  const doc = useDocuments.getState().docs[id];
  if (!doc) return false;
  if (!doc.filePath) return saveAs(id);
  return writeTo(id, doc.filePath, { expected: doc.fingerprint, overwriteExternal: false });
}

export async function saveAs(id: string): Promise<boolean> {
  const doc = useDocuments.getState().docs[id];
  if (!doc) return false;
  let target: string | null;
  try {
    target = await documents.pickSavePath(doc.fileName);
  } catch (e) {
    await showError("No se pudo guardar", e);
    return false;
  }
  if (!target) return false;
  const other = useDocuments.getState().findByPath(target);
  if (other && other.id !== id) {
    await ask({
      title: "Archivo ya abierto",
      message: `"${other.fileName}" está abierto en otra pestaña. Ciérrala o elige otro nombre.`,
      buttons: [{ label: "Aceptar", value: "ok", primary: true }],
    });
    return false;
  }
  // the native dialog already confirmed overwriting an existing file
  return writeTo(id, target, { expected: null, overwriteExternal: true });
}

async function writeTo(
  id: string,
  path: string,
  opts: { expected: FileFingerprint | null; overwriteExternal: boolean },
  convertToUtf8 = false,
): Promise<boolean> {
  const doc = useDocuments.getState().docs[id];
  if (!doc) return false;
  const content = doc.content;
  try {
    const { fingerprint } = await documents.write({
      path,
      content,
      eol: doc.eol,
      bom: doc.bom,
      encoding: doc.encoding,
      convertToUtf8,
      expectedFingerprint: opts.expected,
      overwriteExternal: opts.overwriteExternal,
    });
    useDocuments.getState().markSaved(id, {
      content,
      fingerprint,
      filePath: path,
      ...(convertToUtf8 ? { encoding: "utf-8", bom: false } : {}),
    });
    toast("Guardado");
    return true;
  } catch (e) {
    const err = toAppError(e);
    if (err.is("ENCODING_CONVERSION_REQUIRED") && !convertToUtf8) {
      const choice = await ask({
        title: "Convertir a UTF-8",
        message: `El archivo está en ${doc.encoding}. Al guardar se convertirá a UTF-8.`,
        buttons: [
          { label: "Cancelar", value: "cancel" },
          { label: "Convertir y guardar", value: "convert", primary: true },
        ],
      });
      return choice === "convert" ? writeTo(id, path, opts, true) : false;
    }
    await showError("No se pudo guardar", err);
    return false;
  }
}
