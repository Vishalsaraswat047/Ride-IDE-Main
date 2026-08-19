import { db, Row, genId, now } from "./db.js";
import { createHash } from "node:crypto";

export const STUDENT_VERIFICATION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

export type VerificationMethod = "email" | "sso" | "id" | "campus";

export interface Institution {
  id: string;
  name: string;
  country: string;
  verifiedDomains: string[];
  ssoProvider: string;
  verificationMethod: string;
  status: string;
}

export interface StudentStatus {
  verified: boolean;
  institutionId: string | null;
  institutionName: string | null;
  verificationMethod: VerificationMethod | null;
  institutionEmail: string | null;
  verifiedAt: number | null;
  expiresAt: number | null;
  status: "none" | "active" | "expired" | "revoked";
}

export function institutionFromRow(row: Row): Institution {
  return {
    id: String(row.id),
    name: String(row.name),
    country: String(row.country),
    verifiedDomains: JSON.parse(String(row.verified_domains ?? "[]")) as string[],
    ssoProvider: String(row.sso_provider ?? ""),
    verificationMethod: String(row.verification_method ?? "email"),
    status: String(row.status ?? "verified"),
  };
}

/**
 * Seed the verified-institution database. RIDE only accepts domains that
 * were manually registered and validated here — never arbitrary ".edu".
 * Extend this list as universities onboard (or via admin endpoints).
 */
export function seedInstitutions(): void {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM institutions").get() as Row).c as number;
  if (count > 0) return;

  const stamp = now();
  const insert = db.prepare(
    `INSERT INTO institutions (id, name, country, verified_domains, sso_provider, verification_method, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'email', 'verified', ?, ?)`,
  );
  const campuses = db.prepare(
    `INSERT INTO campuses (id, institution_id, name, code, active, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
  );
  const seed: Array<[string, string, string, string[], string, [string, string, string]?]> = [
    ["inst-galgotias", "Galgotias University", "IN", ["galgotiasuniversity.edu.in", "galgotiasuniversity.ac.in"], "saml", ["campus-galgotias", "GU-RIDE-2026", "Galgotias University Workshop"]],
    ["inst-iit-delhi", "IIT Delhi", "IN", ["iitd.ac.in", "iitd.ernet.in"], "", undefined],
    ["inst-iit-bombay", "IIT Bombay", "IN", ["iitb.ac.in"], "", undefined],
    ["inst-iit-madras", "IIT Madras", "IN", ["iitm.ac.in", "smail.iitm.ac.in"], "", undefined],
    ["inst-iit-kharagpur", "IIT Kharagpur", "IN", ["iitkgp.ac.in", "iitkgp.ernet.in"], "", undefined],
    ["inst-iit-kanpur", "IIT Kanpur", "IN", ["iitk.ac.in"], "", undefined],
    ["inst-nits", "NITs (National Institutes of Technology)", "IN", ["nitc.ac.in", "nitk.ac.in", "nitw.ac.in", "nitrkl.ac.in", "nitj.ac.in", "mnit.ac.in", "nitdgp.ac.in", "nitp.ac.in"], "", undefined],
    ["inst-iiit-hyd", "IIIT Hyderabad", "IN", ["iiit.ac.in"], "", undefined],
    ["inst-delhi-univ", "University of Delhi", "IN", ["du.ac.in"], "", undefined],
    ["inst-bits-pilani", "BITS Pilani", "IN", ["pilani.bits-pilani.ac.in", "bits-pilani.ac.in"], "", undefined],
    ["inst-vit", "VIT Vellore", "IN", ["vit.ac.in", "vitstudent.ac.in"], "", undefined],
    ["inst-srm", "SRM Institute of Science and Technology", "IN", ["srmist.edu.in", "srmuniv.ac.in"], "", undefined],
    ["inst-amity", "Amity University", "IN", ["amity.edu"], "", undefined],
    ["inst-lpu", "Lovely Professional University", "IN", ["lpu.in", "lpu.co.in"], "", undefined],
    ["inst-anna", "Anna University", "IN", ["annauniv.edu", "auist.net"], "", undefined],
    ["inst-jadavpur", "Jadavpur University", "IN", ["jadavpuruniversity.in"], "", undefined],
    ["inst-pune", "University of Pune (SPPU)", "IN", ["unipune.ac.in"], "", undefined],
    ["inst-mit", "MIT (Massachusetts Institute of Technology)", "US", ["mit.edu"], "", undefined],
    ["inst-stanford", "Stanford University", "US", ["stanford.edu"], "", undefined],
    ["inst-berkeley", "UC Berkeley", "US", ["berkeley.edu"], "", undefined],
    ["inst-oxford", "University of Oxford", "GB", ["ox.ac.uk"], "", undefined],
    ["inst-cambridge", "University of Cambridge", "GB", ["cam.ac.uk"], "", undefined],
    ["inst-toronto", "University of Toronto", "CA", ["utoronto.ca"], "", undefined],
    ["inst-ntu", "NTU Singapore", "SG", ["ntu.edu.sg"], "", undefined],
    ["inst-nus", "NUS Singapore", "SG", ["nus.edu.sg"], "", undefined],
    ["inst-tum", "TU Munich", "DE", ["tum.de"], "", undefined],
    ["inst-kth", "KTH Royal Institute of Technology", "SE", ["kth.se"], "", undefined],
    ["inst-tokyo", "University of Tokyo", "JP", ["u-tokyo.ac.jp"], "", undefined],
  ];
  for (const [id, name, country, domains, sso, campus] of seed) {
    insert.run(id, name, country, JSON.stringify(domains), sso, stamp, stamp);
    if (campus) campuses.run(campus[0], id, campus[1], campus[2], stamp);
  }
}

export function listInstitutions(): Institution[] {
  return (db.prepare("SELECT * FROM institutions WHERE status = 'verified' ORDER BY name").all() as Row[]).map(institutionFromRow);
}

/** Find the institution owning an email domain. Domain match is exact + subdomain. */
export function findInstitutionByEmail(email: string): Institution | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return null;
  const rows = db.prepare("SELECT * FROM institutions WHERE status = 'verified'").all() as Row[];
  for (const row of rows) {
    const inst = institutionFromRow(row);
    for (const d of inst.verifiedDomains) {
      const dLower = d.toLowerCase();
      if (domain === dLower || domain.endsWith(`.${dLower}`) || domain.endsWith(`@${dLower}`)) return inst;
    }
  }
  return null;
}

export function getInstitution(id: string): Institution | null {
  const row = db.prepare("SELECT * FROM institutions WHERE id = ?").get(id) as Row | undefined;
  return row ? institutionFromRow(row) : null;
}

/** Hash an OTP so the DB never holds the plaintext code. */
function codeHash(code: string): string {
  return createHash("sha256").update(`ride-otp:${code}`).digest("hex");
}

/** Level 1 — university email: issue a 6-digit OTP for a recognized institution domain. */
export function sendStudentCode(email: string): { ok: boolean; institution?: Institution; error?: string; devCode?: string } {
  const normalized = email.trim().toLowerCase();
  const institution = findInstitutionByEmail(normalized);
  if (!institution) {
    return { ok: false, error: "This email domain is not a verified university. Contact support@ride.app to register your institution." };
  }
  // One live code per email at a time.
  db.prepare("DELETE FROM verification_codes WHERE email = ? AND purpose = 'student'").run(normalized);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.prepare(
    "INSERT INTO verification_codes (id, email, code, purpose, expires_at, created_at) VALUES (?, ?, ?, 'student', ?, ?)",
  ).run(genId("otp"), normalized, codeHash(code), now() + 10 * 60 * 1000, now());
  audit(null, "student.otp.send", `email=${normalized} institution=${institution.id}`);
  // Dev short-circuit: no mail server yet — print to the backend console.
  console.log(`[ride-student] OTP for ${normalized}: ${code} (institution: ${institution.name})`);
  return { ok: true, institution, devCode: code };
}

/** Verify the OTP and activate student status for 12 months. */
export function verifyStudentCode(userId: string, email: string, code: string): { ok: boolean; status?: StudentStatus; error?: string } {
  const normalized = email.trim().toLowerCase();
  const institution = findInstitutionByEmail(normalized);
  if (!institution) return { ok: false, error: "Email domain is not a verified institution." };
  const row = db.prepare(
    "SELECT * FROM verification_codes WHERE email = ? AND purpose = 'student' AND used = 0 ORDER BY created_at DESC LIMIT 1",
  ).get(normalized) as Row | undefined;
  if (!row) return { ok: false, error: "No pending verification for this email — request a code first." };
  if (Number(row.expires_at) < now()) return { ok: false, error: "Code expired — request a new one." };
  if (codeHash(code.trim()) !== String(row.code)) return { ok: false, error: "Wrong code." };

  db.prepare("UPDATE verification_codes SET used = 1 WHERE id = ?").run(String(row.id));
  activateStudent(userId, institution.id, "email", normalized);
  audit(userId, "student.verified.email", `institution=${institution.id} email=${normalized}`);
  return { ok: true, status: getStudentStatus(userId) };
}

/** Level 4 — campus/workshop code. The code must match a real campus AND the email must belong to that institution. */
export function verifyCampusCode(userId: string, email: string, code: string): { ok: boolean; status?: StudentStatus; error?: string } {
  const normalized = email.trim().toLowerCase();
  const campus = db.prepare("SELECT * FROM campuses WHERE code = ? AND active = 1").get(code.trim().toUpperCase()) as Row | undefined;
  if (!campus) return { ok: false, error: "Unknown campus code. Codes are issued at RIDE university workshops." };
  const institution = getInstitution(String(campus.institution_id));
  if (!institution) return { ok: false, error: "Campus has no registered institution." };

  const domain = normalized.split("@")[1]?.toLowerCase() ?? "";
  const domainOk = institution.verifiedDomains.some((d) => {
    const dLower = d.toLowerCase();
    return domain === dLower || domain.endsWith(`.${dLower}`);
  });
  if (!domainOk) {
    return { ok: false, error: `Campus code ${code} belongs to ${institution.name}, but your email isn't from ${institution.name}.` };
  }

  activateStudent(userId, institution.id, "campus", normalized);
  audit(userId, "student.verified.campus", `institution=${institution.id} campus=${code}`);
  return { ok: true, status: getStudentStatus(userId) };
}

/**
 * Level 3 — student ID verification (document). RIDE does not store the ID.
 * Only verification metadata is persisted: method, institution, dates.
 * Automated OCR comes later; for now an admin/verification service marks
 * `ok=true` and the raw upload is discarded immediately.
 */
export function verifyWithStudentId(
  userId: string,
  institutionId: string,
  documentMeta: { name?: string; academicYear?: string },
): { ok: boolean; status?: StudentStatus; error?: string } {
  const institution = getInstitution(institutionId);
  if (!institution) return { ok: false, error: "Unknown institution." };
  if (!String(documentMeta.name ?? "").trim()) return { ok: false, error: "Document name is required for verification." };
  // NOTE: the uploaded document is NOT retained. Only metadata is stored.
  activateStudent(userId, institution.id, "id", "");
  audit(userId, "student.verified.id", `institution=${institution.id} academicYear=${documentMeta.academicYear ?? ""}`);
  return { ok: true, status: getStudentStatus(userId) };
}

/** Shared activation path — stores only metadata, expires in 12 months. */
export function activateStudent(userId: string, institutionId: string, method: VerificationMethod, institutionEmail: string): StudentStatus {
  const verifiedAt = now();
  const expiresAt = verifiedAt + STUDENT_VERIFICATION_TTL_MS;
  db.prepare(
    `INSERT INTO student_verifications (user_id, institution_id, verification_method, institution_email, verified_at, expires_at, status, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
     ON CONFLICT(user_id) DO UPDATE SET
       institution_id = excluded.institution_id,
       verification_method = excluded.verification_method,
       institution_email = excluded.institution_email,
       verified_at = excluded.verified_at,
       expires_at = excluded.expires_at,
       status = 'active',
       updated_at = excluded.updated_at`,
  ).run(userId, institutionId, method, institutionEmail, verifiedAt, expiresAt, verifiedAt);
  return getStudentStatus(userId);
}

/** Current student status — auto-expires when the 12-month window passes. */
export function getStudentStatus(userId: string): StudentStatus {
  const row = db.prepare("SELECT * FROM student_verifications WHERE user_id = ?").get(userId) as Row | undefined;
  if (!row) {
    return { verified: false, institutionId: null, institutionName: null, verificationMethod: null, institutionEmail: null, verifiedAt: null, expiresAt: null, status: "none" };
  }
  const status = String(row.status);
  const expiresAt = Number(row.expires_at);
  const expired = status === "active" && expiresAt < now();
  if (expired) {
    db.prepare("UPDATE student_verifications SET status = 'expired', updated_at = ? WHERE user_id = ?").run(now(), userId);
  }
  const institution = row.institution_id ? getInstitution(String(row.institution_id)) : null;
  const final = expired ? "expired" : status;
  return {
    verified: final === "active",
    institutionId: row.institution_id ? String(row.institution_id) : null,
    institutionName: institution?.name ?? null,
    verificationMethod: row.verification_method ? (String(row.verification_method) as VerificationMethod) : null,
    institutionEmail: row.institution_email ? String(row.institution_email) : null,
    verifiedAt: Number(row.verified_at),
    expiresAt,
    status: final as StudentStatus["status"],
  };
}

/** Remaining validity in days (0 when not verified/expired). */
export function studentDaysRemaining(userId: string): number {
  const s = getStudentStatus(userId);
  if (!s.verified || !s.expiresAt) return 0;
  return Math.max(0, Math.ceil((s.expiresAt - now()) / (24 * 60 * 60 * 1000)));
}

/** Re-verification deadline helper — used for the "expires soon" notice. */
export function studentExpiresSoon(userId: string): boolean {
  const s = getStudentStatus(userId);
  if (!s.verified || !s.expiresAt) return false;
  return s.expiresAt - now() < 30 * 24 * 60 * 60 * 1000;
}

export function revokeStudentStatus(userId: string): void {
  db.prepare("UPDATE student_verifications SET status = 'revoked', updated_at = ? WHERE user_id = ?").run(now(), userId);
}

function audit(userId: string | null, action: string, detail = ""): void {
  db.prepare("INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)").run(userId, action, detail, now());
}