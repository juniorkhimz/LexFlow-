import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// Deliberately separate from vite.config.ts rather than adding a `test`
// block to it: keeps the app's own build config untouched by test-only
// concerns (jsdom environment, setup files), and Vitest reads this file
// automatically without needing --config on every command.
export default defineConfig({
  plugins: [tsConfigPaths({ projects: ["./tsconfig.json"] }), tailwindcss(), viteReact()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    css: false,
  },
});
