import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          "@ride/contracts",
          "@ride/terminal",
          "@ride/git",
          "@ride/agent-bridge",
          "@ride/model-router",
          "@ride/permissions",
          "@ride/project-db",
        ],
      }),
    ],
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ["@ride/contracts"],
      }),
    ],
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    server: {
      watch: {
        ignored: ["**/node_modules/**", "!**/node_modules/@ride/**"],
      },
    },
  },
});
