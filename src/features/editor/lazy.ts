import { lazy } from "react";

// mdwysiwyg pulls Tiptap + unified; keep it out of the initial chunk (plan R15).
export const LazyMarkdownEditor = lazy(async () => {
  const [{ MarkdownEditor }] = await Promise.all([
    import("mdwysiwyg"),
    import("mdwysiwyg/styles.css"),
  ]);
  return { default: MarkdownEditor };
});
