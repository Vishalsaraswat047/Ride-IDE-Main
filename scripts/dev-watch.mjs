import { spawn, spawnSync } from "node:child_process";
import { watch } from "node:fs";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PACKAGES = [
  "contracts",
  "theme",
  "ui",
  "ide-core",
  "terminal",
  "git",
  "agent-bridge",
  "model-router",
  "permissions",
  "project-db",
];

const tsc =
  [join(root, "node_modules", ".bin", "tsc.cmd"), join(root, "node_modules", ".bin", "tsc")].find(
    (p) => existsSync(p),
  ) ?? "tsc";

function start(cmd, args, cwd = root) {
  const child = spawn(cmd, args, {
    cwd,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[dev-watch] ${cmd} ${args.join(" ")} exited with code ${code}`);
    }
  });
  return child;
}

for (const p of PACKAGES) {
  start(tsc, ["-p", join("packages", p, "tsconfig.json"), "--watch"]);
}

const stylesDir = join(root, "packages", "ui", "src", "styles");
let stylesTimer = null;
try {
  watch(stylesDir, { recursive: true }, () => {
    clearTimeout(stylesTimer);
    stylesTimer = setTimeout(() => {
      const res = spawnSync(process.execPath, [join(root, "packages", "ui", "scripts", "build-styles.mjs")], {
        cwd: root,
        stdio: "inherit",
      });
      if (res.status) {
        console.error("[dev-watch] ui styles rebuild failed");
      }
    }, 150);
  });
  console.log("[dev-watch] watching ui styles");
} catch (e) {
  console.error(`[dev-watch] cannot watch ${stylesDir}: ${e.message}`);
}

start("pnpm", ["exec", "electron-vite", "dev"], join(root, "apps", "desktop"));

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));