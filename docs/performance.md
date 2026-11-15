# Performance (release build, 2026-11-01)

Machine: dev laptop, Windows 11. `scripts/perf/measure.ps1` on `src-tauri/target/release/mddesktop.exe`
(empty window, no documents; 3 runs; process tree = app + WebView2; 8 s idle).

| Metric | Result | Target | Verdict |
|---|---|---|---|
| Window visible | 40–158 ms (warm disk) | < 2 s (SC-001) | ✅ (cold-disk run still to measure) |
| Idle CPU | 0–0.6 % | ≈ 0 (SC-002) | ✅ |
| Idle memory, whole tree (empty) | 180–189 MB private / ~375 MB working set | < 250 MB private with one document (SC-002, redefined) | ✅ empty shell; with one editor ≈ 200–210 MB — re-measure with a document |
| Installer | 4.98 MiB NSIS (5.05 MiB with mdwysiwyg 0.8.0, 2026-11-14) (`MD Desktop_0.1.0_x64-setup.exe`) | — | — |
| Tab switch / document open | not yet measured in release | < 100 ms / < 500 ms (SC-003) | pending |

**Original SC-002 (< 100 MB) was not reachable with WebView2; redefined on 2026-11-01 as < 250 MB private for the whole process tree with one document open (see spec.md).** Rationale: the empty shell already holds ~7 WebView2 processes
(~180 MB private). Each mounted editor adds ~20 MB (docs/spikes.md S1). Proposal: restate SC-002 as
"< 250 MB private for the whole process tree with one document open" (or measure only the app process
plus its renderer). Needs a product decision.

## Timings with real documents (release build, 2026-11-02)

`scripts/perf/measure-ui.mjs` (real WebView2 over CDP; synthetic Markdown with headings, lists, links; 3 tabs open):

| Document | Open in running app | Tab switch (median / max) | Verdict |
|---|---|---|---|
| 100 KB | 367–412 ms | 43–45 ms / 46–58 ms | ✅ SC-003 (< 500 ms open, < 100 ms switch) |
| 300 KB | 1.4 s | 131 ms | open ❌ / switch ❌ |
| 500 KB | 2.9 s | 219 ms | ❌ |
| 1 MB | 8.7 s | 883 ms | ❌ |

Cold start with a 100 KB document passed on the command line (process start -> rendered): 1.8–2.0 s.

Cause: `mdwysiwyg` parses Markdown -> HTML (unified/rehype) and builds a ProseMirror document synchronously, with no
virtualization; cost grows faster than linearly. Decision: the large-file warning threshold (FR-002a) defaults to
**256 KB** (about 1 s to open) instead of 5 MB; it stays a preference (`largeFileWarnBytes`) and is read by Rust on
every open. Typical notes/documentation stay well below it. Improving big-document performance is an upstream concern
(chunked parsing / virtualization in `mdwysiwyg`), not something the app can fix.

## mdwysiwyg 0.8.0 (spec 003, release build with the dev identifier, 2026-11-14)

Editor bundle grew (JS ~122 KB → ~195 KB, CSS ~11 KB → ~19 KB). Version history on (default). Same machine as above.

| Metric | Before (0.3.1) | Now (0.8.0) | Target | Verdict |
|---|---|---|---|---|
| Idle memory, whole tree, one document | ≈ 200–210 MB private (estimate) | 201–210 MB private / ~410 MB working set (3 runs) | < 250 MB private (SC-002) | ✅ |
| Window visible | 40–158 ms | 30–143 ms | < 2 s | ✅ |
| Idle CPU | 0–0.6 % | 0–0.6 % | ≈ 0 | ✅ |
| Open 100 KB in running app | 367–412 ms | 366–380 ms | ≤ +20 % (spec 003 SC-004) | ✅ |
| Tab switch 100 KB (median / max) | 43–45 / 46–58 ms | 55 / 63–65 ms | < 100 ms (SC-003) | ✅ (+~10 ms) |
| Open from process start (3 × 100 KB) | — | 1.85–1.89 s | — | reference |
| Release exe | — | 7.12 MB | — | reference |

Note: measuring with a leftover session (4 restored 100 KB documents) gives ~540 MB private: the budget is for one document; the
pool keeps up to 3 editors mounted.

## Specs 004–011 (release build with the dev identifier, 2026-11-15)

Same machine. Clean session (no restored tabs) before each run; content zoom 110 % in the settings used.

| Metric | Spec 003 | Now | Target | Verdict |
|---|---|---|---|---|
| Idle memory, whole tree, empty | 180–189 MB | 181–191 MB private | — | reference |
| Idle memory, whole tree, one small document | 201–210 MB | 192–203 MB private / ~415 MB working set | < 250 MB private (SC-002) | ✅ |
| Idle memory, whole tree, one 100 KB document | not measured | 469–483 MB private / ~690 MB working set | — | reference (not comparable with earlier rows) |
| Window visible | 30–143 ms | 30–165 ms | < 2 s | ✅ |
| Idle CPU | 0–0.6 % | 0–1.6 % | ≈ 0 | ✅ |
| Open 100 KB in running app | 366–380 ms | 378–386 ms | < 500 ms | ✅ |
| Tab switch 100 KB (median / max) | 55 / 63–65 ms | 54–57 / 64–72 ms | < 100 ms (SC-003) | ✅ |
| Open from process start (3 × 100 KB) | 1.85–1.89 s | 1.85–1.89 s | — | reference |
| Export panel → preview ready, 30 KB (PDF 10 pages / HTML / Word) | — | 0.90–0.94 s / 0.46–0.50 s / 0.47–0.51 s | — | reference (spec 005) |
| Export panel → preview ready, 100 KB (PDF 33 pages / HTML / Word) | — | 4.5–4.7 s / 0.71–0.73 s / 0.68–0.81 s | — | reference (spec 005) |
| Content zoom step (spec 007) | — | 11 ms (two frames) | — | ✅ |
| Release exe | 7.12 MB | 7.34 MB | — | reference |

Notes: one earlier run gave a 105 ms switch median while leftover test processes were still running; the numbers above are
from clean runs. The PDF preview draws every page before "Exportar…" is enabled, so its time grows with the page count.
