import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  projects: [
    {
      name: "ui",
      testMatch: "ui/**/*.spec.ts",
      use: { baseURL: "http://localhost:1420" },
    },
    { name: "native", testMatch: "native/**/*.spec.ts" },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:1420", reuseExistingServer: true },
});
