import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
await mkdir(join(root, "dist"), { recursive: true });
await cp(join(root, "src", "styles", "styles.css"), join(root, "dist", "styles.css"));
console.log("styles.css copied to dist");
