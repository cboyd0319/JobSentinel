import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import packageJson from "./package.json";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    environment: "jsdom",
    globals: true,
    maxWorkers: 4,
    setupFiles: ["./src/test-support/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test-support/",
        "src-tauri/",
        "e2e/",
      ],
    },
  },
});
