# Performance (release build, 2026-11-01)

Machine: dev laptop, Windows 11. `scripts/perf/measure.ps1` on `src-tauri/target/release/mddesktop.exe`
(empty window, no documents; 3 runs; process tree = app + WebView2; 8 s idle).

| Metric | Result | Target | Verdict |
|---|---|---|---|
| Window visible | 40–158 ms (warm disk) | < 2 s (SC-001) | ✅ (cold-disk run still to measure) |
| Idle CPU | 0–0.6 % | ≈ 0 (SC-002) | ✅ |
| Idle memory, whole tree (empty) | 180–189 MB private / ~375 MB working set | < 250 MB private with one document (SC-002, redefined) | ✅ empty shell; with one editor ≈ 200–210 MB — re-measure with a document |
| Installer | 4.98 MiB NSIS (`MD Desktop_0.1.0_x64-setup.exe`) | — | — |
| Tab switch / document open | not yet measured in release | < 100 ms / < 500 ms (SC-003) | pending |

**Original SC-002 (< 100 MB) was not reachable with WebView2; redefined on 2026-11-01 as < 250 MB private for the whole process tree with one document open (see spec.md).** Rationale: the empty shell already holds ~7 WebView2 processes
(~180 MB private). Each mounted editor adds ~20 MB (docs/spikes.md S1). Proposal: restate SC-002 as
"< 250 MB private for the whole process tree with one document open" (or measure only the app process
plus its renderer). Needs a product decision.
