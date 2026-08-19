import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
process.env.RIDE_DATA_DIR ??= join(here, "..", "backend", "data");

await import("./dist/server/index.js");