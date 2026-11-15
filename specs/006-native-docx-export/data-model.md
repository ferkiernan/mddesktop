# Data Model: 006

- **NativeDoc**: `{ title, theme, blocks, warnings }`.
- **Theme**: `fg, bg, dark, font, mono, sizePt, link, codeBg, codeFg, quoteFg, quoteBorder, border, headerBg` (hex sin #).
- **Block**: `heading{level, runs}` · `para{runs}` · `list{ordered, start, items[{checked?, blocks}]}` · `quote{blocks}` · `code{lines: Run[][]}` · `table{align[], rows[{header, cells: Run[][]}]}` · `hr`.
- **Run**: `text | br | pic` + `bold, italic, strike, code, link, color, shade, font, sizePt`.
- **Pic**: `{ data, ext: png|jpeg|gif, width, height (px), alt }`.
