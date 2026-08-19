import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.RIDE_DATA_DIR ??= join(
  dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "backend", "data",
);

const backend = await import("@ride/backend/db");
export const db = backend.db;
export const genId = backend.genId;
export const now = backend.now;
export const randToken = backend.randToken;
export type { Row } from "@ride/backend/db";

db.exec("PRAGMA wal_autocheckpoint = 1");
db.exec("PRAGMA wal_checkpoint(TRUNCATE)");