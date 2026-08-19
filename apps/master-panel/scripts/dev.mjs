import { spawn } from "node:child_process";

const children = [
  ["tsx", ["watch", "src/server/index.ts"]],
  ["vite", []],
];

for (const [cmd, args] of children) {
  const child = spawn("npx", [cmd, ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));