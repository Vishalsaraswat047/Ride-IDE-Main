import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const JWT_SECRET = process.env.RIDE_JWT_SECRET ?? "ride-dev-secret-change-me";
const TOKEN_TTL_S = 60 * 60 * 24 * 7;

export interface Claims {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function b64url(data: Buffer | string): string {
  return Buffer.from(data).toString("base64url");
}

export function signToken(claims: Omit<Claims, "iat" | "exp">): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ ...claims, iat: nowSec, exp: nowSec + TOKEN_TTL_S }));
  const sig = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifyToken(token: string): Claims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts as [string, string, string];
  const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Claims;
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Tiny in-memory rate limiter (per key, per window). */
export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string): { allowed: boolean; retryAfterSec: number } {
      const t = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt < t) {
        hits.set(key, { count: 1, resetAt: t + windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      entry.count += 1;
      if (entry.count > limit) {
        return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - t) / 1000) };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

export const authLimiter = rateLimiter(10, 60_000);
export const apiLimiter = rateLimiter(120, 60_000);