import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/unit/**/*.spec.{ts,tsx}", "tests/components/**/*.spec.{ts,tsx}"],
  },
});
