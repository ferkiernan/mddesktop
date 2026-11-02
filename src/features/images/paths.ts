// Pure path helpers for local images (Windows and POSIX separators).

const SEP = /[/\\]/;

export const dirSegments = (filePath: string) => filePath.split(SEP).slice(0, -1);

/** Relative path (forward slashes) from the document's folder to the image, or null when they
 *  live on different drives/roots and no relative path exists. */
export function relativeFromDoc(docPath: string, imagePath: string): string | null {
  const dir = dirSegments(docPath);
  const img = imagePath.split(SEP);
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  if (!dir.length || !img.length || !same(dir[0], img[0])) return null;
  let i = 0;
  while (i < dir.length && i < img.length - 1 && same(dir[i], img[i])) i++;
  const ups = dir.length - i;
  return [...Array<string>(ups).fill(".."), ...img.slice(i)].join("/");
}

/** Markdown image syntax with a URL-safe path (spaces and parentheses escaped). */
export function markdownImage(relPath: string, alt: string): string {
  const url = relPath
    .split("/")
    .map((s) => (s === ".." ? s : encodeURIComponent(s)))
    .join("/")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
  return `![${alt.replace(/[[\]]/g, "")}](${url})`;
}

export const altFromFile = (p: string) => (p.split(SEP).pop() ?? p).replace(/\.[^.]+$/, "");

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Absolute path for a relative image reference of a document, or null for URLs/data/absolute refs. */
export function absoluteImagePath(docPath: string, src: string): string | null {
  if (SCHEME.test(src) || src.startsWith("//") || src.startsWith("#")) return null;
  let decoded = src;
  try {
    decoded = decodeURIComponent(src);
  } catch {
    /* keep raw */
  }
  const out = dirSegments(docPath);
  for (const seg of decoded.split(SEP)) {
    if (seg === "" || seg === ".") continue;
    if (seg !== "..") out.push(seg);
    else if (out.length > 1) out.pop();
  }
  const sep = docPath.includes("\\") ? "\\" : "/";
  return out.join(sep);
}
