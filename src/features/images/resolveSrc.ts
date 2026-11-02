import { convertFileSrc } from "@tauri-apps/api/core";
import { useDocuments } from "../documents/store";
import { absoluteImagePath } from "./paths";

/** `resolveImageSrc` for mdwysiwyg (upstream U3): maps relative image refs to asset: URLs. */
export function makeImageResolver(documentId: string) {
  return (src: string): string => {
    const doc = useDocuments.getState().docs[documentId];
    if (!doc?.filePath) return src;
    const abs = absoluteImagePath(doc.filePath, src);
    return abs ? convertFileSrc(abs) : src;
  };
}
