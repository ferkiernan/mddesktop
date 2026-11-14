import { images } from "../../services/ipc";
import { toAppError } from "../../services/errors";
import { ask } from "../../ui/dialogs";
import { toast } from "../../ui/Toast";
import { saveAs } from "../documents/actions";
import { useDocuments } from "../documents/store";
import { getEditor } from "../editor/handles";
import { altFromFile, markdownImage, relativeFromDoc } from "./paths";

const ok = [{ label: "Aceptar", value: "ok", primary: true }];

/**
 * Menu "Insertar > Imagen…" (US7). Order matters: nothing is copied until we know the
 * image can actually be inserted into the editor.
 */
export async function insertImage(): Promise<void> {
  const store = useDocuments.getState();
  const id = store.activeId;
  const doc = id ? store.docs[id] : null;
  if (!id || !doc) return;

  const editor = getEditor(id);
  if (!editor?.insertMarkdown) { // only while the lazy editor is still mounting
    await ask({
      title: "Insertar imagen no disponible",
      message: "El editor todavía se está cargando. Vuelve a intentarlo en un momento.",
      buttons: ok,
    });
    return;
  }

  // relative paths need a place on disk: save first (FR-025a)
  if (!doc.filePath) {
    const choice = await ask({
      title: "Guardar documento",
      message: "Para usar rutas relativas, guarda primero el documento.",
      buttons: [
        { label: "Cancelar", value: "cancel" },
        { label: "Guardar como…", value: "save", primary: true },
      ],
    });
    if (choice !== "save" || !(await saveAs(id))) return;
  }
  const docPath = useDocuments.getState().docs[id]?.filePath;
  if (!docPath) return;

  try {
    const source = await images.pick();
    if (!source) return;

    const how = await ask({
      title: "Insertar imagen",
      message: "¿Copiar la imagen a la carpeta assets junto al documento? Así el documento sigue siendo portable.",
      buttons: [
        { label: "Cancelar", value: "cancel" },
        { label: "Usar ruta original", value: "link" },
        { label: "Copiar a assets", value: "copy", primary: true },
      ],
    });
    if (how === "cancel") return;

    let rel: string | null;
    if (how === "copy") {
      let r = await images.import(docPath, source);
      if (r.existedBefore && !r.copied) {
        const c = await ask({
          title: "Ya existe un archivo con ese nombre",
          message: `assets/${r.relativePath.split("/").pop()} ya existe y es distinto.`,
          buttons: [
            { label: "Cancelar", value: "cancel" },
            { label: "Usar el existente", value: "keep" },
            { label: "Sobrescribir", value: "overwrite" },
          ],
        });
        if (c === "cancel") return;
        if (c === "overwrite") r = await images.import(docPath, source, true);
      }
      rel = r.relativePath;
    } else {
      rel = relativeFromDoc(docPath, source) ?? source.replace(/\\/g, "/");
    }

    editor.insertMarkdown(markdownImage(rel, altFromFile(source)));
    toast("Imagen insertada");
  } catch (e) {
    await ask({ title: "No se pudo insertar la imagen", message: toAppError(e).message, buttons: ok });
  }
}
