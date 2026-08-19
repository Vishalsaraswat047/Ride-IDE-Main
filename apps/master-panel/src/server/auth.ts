import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db, genId, now, randToken, type Row } from "./dbenv.js";
import { hashPassword, verifyPassword } from "@ride/backend/security";

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const COOKIE_NAME = "ride_master";

export interface Admin extends Row {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

export function listAdmins(): Row[] {
  return db.prepare("SELECT id, email, display_name, role, created_at, last_login_at FROM admins ORDER BY created_at").all() as Row[];
}

export function bootstrapAdmin(): void {
  const count = db.prepare("SELECT COUNT(*) AS c FROM admins").get() as Row;
  if (Number(count.c) > 0) return;
  const email = (process.env.RIDE_ADMIN_EMAIL ?? "admin@ride.local").trim().toLowerCase();
  const generated = !process.env.RIDE_ADMIN_PASSWORD;
  const password = process.env.RIDE_ADMIN_PASSWORD ?? randomBytes(6).toString("hex");
  db.prepare(
    "INSERT INTO admins (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, 'Super Admin', 'super_admin', ?)",
  ).run(genId("adm"), email, hashPassword(password), now());
if (generated) {
    console.log("");
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║  RIDE MASTER PANEL — first-run admin created                 ║");
    console.log(`║  Email   : ${email}`);
    console.log(`║  Password: ${password}`);
    console.log("║  Change it from Settings → Security.                         ║");
    console.log("╚═══════════════════════════════════════════════════════════════╝");
    console.log("");
  }
}

export function createSession(adminId: string, ip: string, userAgent: string): string {
  const token = randToken(48);
  db.prepare(
    "INSERT INTO admin_sessions (token, admin_id, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(token, adminId, now(), now() + SESSION_TTL_MS, ip, userAgent);
  db.prepare("UPDATE admins SET last_login_at = ? WHERE id = ?").run(now(), adminId);
  return token;
}

export function destroySession(token: string): void {
  db.prepare("UPDATE admin_sessions SET revoked = 1 WHERE token = ?").run(token);
}

export function getAdminByToken(token: string): Admin | null {
  if (!token) return null;
  const session = db.prepare(
    "SELECT * FROM admin_sessions WHERE token = ? AND revoked = 0 AND expires_at > ?",
  ).get(token, now()) as Row | undefined;
  if (!session) return null;
  return (db.prepare("SELECT * FROM admins WHERE id = ?").get(String(session.admin_id)) as Row | undefined) as Admin | null;
}

export function currentAdmin(req: FastifyRequest): Admin | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return getAdminByToken(header.slice(7));
  const raw = req.headers.cookie ?? "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE_NAME && rest.length) return getAdminByToken(decodeURIComponent(rest.join("=")));
  }
  return null;
}

export function requireAdmin(req: FastifyRequest, reply: FastifyReply): Admin | null {
  if (req.method !== "GET") {
    const guard = req.headers["x-ride-master"];
    if (guard !== "1") {
      reply.code(403).send({ error: "CSRF guard: missing X-RIDE-Master header" });
      return null;
    }
  }
  const admin = currentAdmin(req);
  if (!admin) {
    reply.code(401).send({ error: "Not authenticated as admin" });
    return null;
  }
  return admin;
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.header(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  );
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.header("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
}

export function listSessions(): Row[] {
  return db.prepare(
    "SELECT s.token, s.admin_id, a.email, a.display_name, s.created_at, s.expires_at, s.ip, s.revoked FROM admin_sessions s JOIN admins a ON a.id = s.admin_id ORDER BY s.created_at DESC LIMIT 50",
  ).all() as Row[];
}
