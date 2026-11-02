// Builds a debug exe with a different app identifier so automated native tests never collide with
// an installed/running MD Desktop (single-instance and app data are keyed by the identifier).
// Usage: node scripts/build-test-exe.mjs [outFile]
import { execSync } from "node:child_process";
import { copyFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? join(process.env.TEMP, "mddesktop-test.exe");
const config = JSON.stringify({ identifier: "com.ferkiernan.mddesktop.dev" });
execSync(`npm run tauri build -- --debug --no-bundle --config ${JSON.stringify(config)}`, {
  stdio: "inherit",
  env: { ...process.env, VITE_SPIKE_EDITORS: "0", VITE_E2E: "1" },
});
copyFileSync(join("src-tauri", "target", "debug", "mddesktop.exe"), out);
console.log("test exe:", out);
