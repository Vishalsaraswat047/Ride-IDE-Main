import { db, Row, genId, now } from "../db.js";
import { getStudentStatus } from "../student.js";

// ─── Team collaboration: workspace, members, roles, projects, tasks,
// ─── comments, shared env vars, activity + shared AI context.
// First Team release covers the 15 priority features behind the ₹399/seat
// plan: workspace, invitations, roles, shared projects, shared AI context,
// AI task delegation, git/GitHub, branches/PRs, code review, comments,
// shared components/design system, env/secrets, deployment approval.

export type TeamRole = "owner" | "admin" | "developer" | "designer" | "reviewer" | "viewer";
export type MemberStatus = "invited" | "active" | "suspended";

export const ROLE_ORDER: Record<TeamRole, number> = {
  owner: 6, admin: 5, developer: 4, designer: 3, reviewer: 2, viewer: 1,
};

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  ownerId: string;
  plan: "team" | "agency";
  seatLimit: number;
  workspaceUrl: string;
  createdAt: number;
  updatedAt: number;
  memberCount?: number;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  status: MemberStatus;
  invitedAt: number;
  joinedAt: number | null;
  email?: string;
  displayName?: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  token: string;
  status: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
}

export interface TeamProject {
  id: string;
  teamId: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamTask {
  id: string;
  teamId: string;
  projectId: string | null;
  title: string;
  description: string;
  assigneeId: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "backlog" | "todo" | "in_progress" | "review" | "done";
  labels: string[];
  milestone: string;
  dueDate: number | null;
  sortOrder: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  assigneeName?: string;
}

export interface TeamComment {
  id: string;
  teamId: string;
  projectId: string | null;
  filePath: string;
  line: number | null;
  body: string;
  authorId: string;
  parentId: string | null;
  resolved: boolean;
  createdAt: number;
  authorName?: string;
}

export interface TeamEnvVar {
  id: string;
  teamId: string;
  key: string;
  env: "development" | "staging" | "production";
  createdAt: number;
  updatedAt: number;
}

export interface TeamActivity {
  id: number;
  teamId: string;
  actorId: string | null;
  action: string;
  detail: string;
  createdAt: number;
  actorName?: string;
}

export interface AiContextNote {
  id: string;
  teamId: string;
  kind: string;
  note: string;
  createdBy: string;
  createdAt: number;
  creatorName?: string;
}

function teamFromRow(row: Row): Team {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    logoUrl: String(row.logo_url ?? ""),
    ownerId: String(row.owner_id),
    plan: String(row.plan) as Team["plan"],
    seatLimit: Number(row.seat_limit),
    workspaceUrl: String(row.workspace_url ?? ""),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    memberCount: row.member_count == null ? undefined : Number(row.member_count),
  };
}

function memberFromRow(row: Row): TeamMember {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    userId: String(row.user_id),
    role: String(row.role) as TeamRole,
    status: String(row.status) as MemberStatus,
    invitedAt: Number(row.invited_at),
    joinedAt: row.joined_at == null ? null : Number(row.joined_at),
    email: row.email == null ? undefined : String(row.email),
    displayName: row.display_name == null ? undefined : String(row.display_name),
  };
}

function invitationFromRow(row: Row): TeamInvitation {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    email: String(row.email),
    role: String(row.role) as TeamRole,
    token: String(row.token),
    status: String(row.status),
    createdBy: String(row.created_by),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  };
}

function taskFromRow(row: Row): TeamTask {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    projectId: row.project_id == null ? null : String(row.project_id),
    title: String(row.title),
    description: String(row.description ?? ""),
    assigneeId: row.assignee_id == null ? null : String(row.assignee_id),
    priority: String(row.priority) as TeamTask["priority"],
    status: String(row.status) as TeamTask["status"],
    labels: JSON.parse(String(row.labels ?? "[]")) as string[],
    milestone: String(row.milestone ?? ""),
    dueDate: row.due_date == null ? null : Number(row.due_date),
    sortOrder: Number(row.sort_order ?? 0),
    createdBy: String(row.created_by),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    assigneeName: row.assignee_name == null ? undefined : String(row.assignee_name),
  };
}

function commentFromRow(row: Row): TeamComment {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    projectId: row.project_id == null ? null : String(row.project_id),
    filePath: String(row.file_path ?? ""),
    line: row.line == null ? null : Number(row.line),
    body: String(row.body),
    authorId: String(row.author_id),
    parentId: row.parent_id == null ? null : String(row.parent_id),
    resolved: Boolean(row.resolved),
    createdAt: Number(row.created_at),
    authorName: row.author_name == null ? undefined : String(row.author_name),
  };
}

function envFromRow(row: Row): TeamEnvVar {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    key: String(row.key),
    env: String(row.env) as TeamEnvVar["env"],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function activityFromRow(row: Row): TeamActivity {
  return {
    id: Number(row.id),
    teamId: String(row.team_id),
    actorId: row.actor_id == null ? null : String(row.actor_id),
    action: String(row.action),
    detail: String(row.detail ?? ""),
    createdAt: Number(row.created_at),
    actorName: row.actor_name == null ? undefined : String(row.actor_name),
  };
}

function aiNoteFromRow(row: Row): AiContextNote {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    kind: String(row.kind ?? "decision"),
    note: String(row.note),
    createdBy: String(row.created_by),
    createdAt: Number(row.created_at),
    creatorName: row.creator_name == null ? undefined : String(row.creator_name),
  };
}

// ─── Activity feed ─────────────────────────────────────────────────────────

function logActivity(teamId: string, actorId: string | null, action: string, detail = ""): void {
  db.prepare("INSERT INTO team_activity (team_id, actor_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(teamId, actorId, action, detail, now());
}

export function listActivity(teamId: string, limit = 100): TeamActivity[] {
  return (
    db.prepare(
      `SELECT a.*, u.display_name AS actor_name FROM team_activity a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.team_id = ? ORDER BY a.id DESC LIMIT ?`,
    ).all(teamId, limit) as Row[]
  ).map(activityFromRow);
}

// ─── Teams ─────────────────────────────────────────────────────────────────

export function createTeam(ownerId: string, input: { name: string; description?: string; plan?: "team" | "agency" }): Team {
  const name = String(input.name).trim().slice(0, 80);
  if (!name) throw new Error("Team name required");
  const plan = input.plan === "agency" ? "agency" : "team";
  const id = genId("team");
  const stamp = now();
  const slug = slugify(name) || id.slice(0, 10);
  db.prepare(
    `INSERT INTO teams (id, name, slug, description, owner_id, plan, seat_limit, workspace_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, name, slug, String(input.description ?? "").slice(0, 500), ownerId, plan, plan === "agency" ? 10 : 2, `https://ride.app/team/${slug}`, stamp, stamp);
  db.prepare(
    "INSERT INTO team_members (id, team_id, user_id, role, status, invited_at, joined_at, updated_at) VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)",
  ).run(genId("mem"), id, ownerId, stamp, stamp, stamp);
  logActivity(id, ownerId, "team.created", name);
  return getTeam(id)!;
}

export function getTeam(id: string): Team | null {
  const row = db.prepare("SELECT t.*, (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id AND m.status = 'active') AS member_count FROM teams t WHERE t.id = ?").get(id) as Row | undefined;
  return row ? teamFromRow(row) : null;
}

export function getTeamBySlug(slug: string): Team | null {
  const row = db.prepare("SELECT * FROM teams WHERE slug = ?").get(slug) as Row | undefined;
  return row ? teamFromRow(row) : null;
}

export function listTeamsForUser(userId: string): Team[] {
  return (
    db.prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM team_members m WHERE m.team_id = t.id AND m.status = 'active') AS member_count
       FROM teams t JOIN team_members m ON m.team_id = t.id
       WHERE m.user_id = ? AND m.status != 'suspended'
       ORDER BY t.created_at DESC`,
    ).all(userId) as Row[]
  ).map(teamFromRow);
}

export function updateTeam(teamId: string, patch: { name?: string; description?: string; logoUrl?: string; plan?: "team" | "agency" }): Team | null {
  const team = getTeam(teamId);
  if (!team) return null;
  const name = patch.name !== undefined ? String(patch.name).trim().slice(0, 80) || team.name : team.name;
  const description = patch.description !== undefined ? String(patch.description).slice(0, 500) : team.description;
  const logoUrl = patch.logoUrl !== undefined ? String(patch.logoUrl).slice(0, 500) : team.logoUrl;
  const plan = patch.plan === "agency" ? "agency" : patch.plan === "team" ? "team" : team.plan;
  const seatLimit = plan === "agency" ? Math.max(10, team.seatLimit) : plan === "team" ? Math.min(team.seatLimit, 2) : team.seatLimit;
  db.prepare("UPDATE teams SET name = ?, description = ?, logo_url = ?, plan = ?, seat_limit = ?, updated_at = ? WHERE id = ?")
    .run(name, description, logoUrl, plan, seatLimit, now(), teamId);
  return getTeam(teamId);
}

export function deleteTeam(teamId: string): void {
  const stamp = now();
  db.prepare("DELETE FROM team_env_vars WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM team_comments WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM team_tasks WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM team_projects WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM team_ai_context WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM team_invitations WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM team_members WHERE team_id = ?").run(teamId);
  db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
  void stamp;
}

// ─── Membership & roles ────────────────────────────────────────────────────

export function getMembership(teamId: string, userId: string): TeamMember | null {
  const row = db.prepare("SELECT * FROM team_members WHERE team_id = ? AND user_id = ?").get(teamId, userId) as Row | undefined;
  return row ? memberFromRow(row) : null;
}

export function listMembers(teamId: string): TeamMember[] {
  return (
    db.prepare(
      `SELECT m.*, u.email, u.display_name FROM team_members m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.team_id = ? ORDER BY m.joined_at IS NULL, m.joined_at ASC`,
    ).all(teamId) as Row[]
  ).map(memberFromRow);
}

export function hasRole(teamId: string, userId: string, minimum: TeamRole): boolean {
  const m = getMembership(teamId, userId);
  if (!m || m.status !== "active") return false;
  return ROLE_ORDER[m.role] >= ROLE_ORDER[minimum];
}

/** Team plan seat enforcement: agency = 10, team plan = paid seats (default 2). */
export function activeSeatCount(teamId: string): number {
  const row = db.prepare("SELECT COUNT(*) AS c FROM team_members WHERE team_id = ? AND status = 'active'").get(teamId) as Row;
  return Number(row.c);
}

export function canAddMember(team: Team): boolean {
  return activeSeatCount(team.id) < team.seatLimit;
}

export function setMemberRole(teamId: string, actorId: string, userId: string, role: TeamRole): TeamMember | null {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const target = getMembership(teamId, userId);
  if (!target) return null;
  if (target.role === "owner") throw new Error("Cannot change the owner's role");
  const safe: TeamRole[] = ["admin", "developer", "designer", "reviewer", "viewer"];
  if (!safe.includes(role)) throw new Error("Invalid role");
  db.prepare("UPDATE team_members SET role = ?, updated_at = ? WHERE id = ?").run(role, now(), target.id);
  logActivity(teamId, actorId, "member.role", `${userId} → ${role}`);
  return getMembership(teamId, userId);
}

export function suspendMember(teamId: string, actorId: string, userId: string): boolean {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const target = getMembership(teamId, userId);
  if (!target || target.role === "owner") return false;
  db.prepare("UPDATE team_members SET status = 'suspended', updated_at = ? WHERE id = ?").run(now(), target.id);
  logActivity(teamId, actorId, "member.suspended", userId);
  return true;
}

export function reactivateMember(teamId: string, actorId: string, userId: string): boolean {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const target = getMembership(teamId, userId);
  if (!target) return false;
  db.prepare("UPDATE team_members SET status = 'active', updated_at = ? WHERE id = ?").run(now(), target.id);
  logActivity(teamId, actorId, "member.reactivated", userId);
  return true;
}

export function removeMember(teamId: string, actorId: string, userId: string): boolean {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const target = getMembership(teamId, userId);
  if (!target) return false;
  if (target.role === "owner") throw new Error("Owner cannot be removed — transfer ownership first");
  db.prepare("DELETE FROM team_members WHERE id = ?").run(target.id);
  logActivity(teamId, actorId, "member.removed", userId);
  return true;
}

export function transferOwnership(teamId: string, actorId: string, newOwnerId: string): boolean {
  if (!hasRole(teamId, actorId, "owner")) throw new Error("Owner role required");
  const target = getMembership(teamId, newOwnerId);
  if (!target || target.status !== "active") return false;
  db.prepare("UPDATE team_members SET role = 'admin', updated_at = ? WHERE team_id = ? AND role = 'owner'").run(now(), teamId);
  db.prepare("UPDATE team_members SET role = 'owner', updated_at = ? WHERE id = ?").run(now(), target.id);
  db.prepare("UPDATE teams SET owner_id = ?, updated_at = ? WHERE id = ?").run(newOwnerId, now(), teamId);
  logActivity(teamId, actorId, "team.ownership_transferred", newOwnerId);
  return true;
}

// ─── Invitations ───────────────────────────────────────────────────────────

export function createInvitation(teamId: string, actorId: string, email: string, role: TeamRole): TeamInvitation | null {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const team = getTeam(teamId);
  if (!team) return null;
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new Error("Invalid email");
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized) as Row | undefined;
  if (existingUser && getMembership(teamId, String(existingUser.id))) throw new Error("Already a member");
  const pending = db.prepare("SELECT COUNT(*) AS c FROM team_invitations WHERE team_id = ? AND email = ? AND status = 'pending'").get(teamId, normalized) as Row;
  if (Number(pending.c) > 0) throw new Error("Invitation already pending for this email");

  const id = genId("inv");
  const token = genId("tok") + Math.random().toString(36).slice(2, 10);
  const stamp = now();
  const expiresAt = stamp + 7 * 24 * 60 * 60 * 1000;
  db.prepare(
    `INSERT INTO team_invitations (id, team_id, email, role, token, status, created_by, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
  ).run(id, teamId, normalized, role, token, actorId, stamp, expiresAt);
  logActivity(teamId, actorId, "member.invited", `${normalized} (${role})`);
  return getInvitation(id);
}

export function getInvitation(id: string): TeamInvitation | null {
  const row = db.prepare("SELECT * FROM team_invitations WHERE id = ?").get(id) as Row | undefined;
  return row ? invitationFromRow(row) : null;
}

export function getInvitationByToken(token: string): TeamInvitation | null {
  const row = db.prepare("SELECT * FROM team_invitations WHERE token = ?").get(token) as Row | undefined;
  return row ? invitationFromRow(row) : null;
}

export function listInvitations(teamId: string): TeamInvitation[] {
  return (db.prepare("SELECT * FROM team_invitations WHERE team_id = ? ORDER BY created_at DESC").all(teamId) as Row[]).map(invitationFromRow);
}

export function revokeInvitation(teamId: string, actorId: string, invitationId: string): boolean {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const inv = getInvitation(invitationId);
  if (!inv || inv.teamId !== teamId) return false;
  db.prepare("UPDATE team_invitations SET status = 'revoked' WHERE id = ?").run(invitationId);
  logActivity(teamId, actorId, "member.invitation_revoked", inv.email);
  return true;
}

export function resendInvitation(teamId: string, actorId: string, invitationId: string): TeamInvitation | null {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const inv = getInvitation(invitationId);
  if (!inv || inv.teamId !== teamId) return null;
  const stamp = now();
  db.prepare("UPDATE team_invitations SET status = 'pending', expires_at = ?, created_at = ? WHERE id = ?")
    .run(stamp + 7 * 24 * 60 * 60 * 1000, stamp, invitationId);
  logActivity(teamId, actorId, "member.invitation_resent", inv.email);
  return getInvitation(invitationId);
}

/** Accept an invitation link (token) — seats are consumed only on accept. */
export function acceptInvitation(token: string, userId: string): { ok: boolean; team?: Team; error?: string } {
  const inv = getInvitationByToken(token);
  if (!inv || inv.status !== "pending") return { ok: false, error: "Invitation not found or no longer valid" };
  if (Number(inv.expiresAt) < now()) return { ok: false, error: "Invitation expired — ask an admin to resend it" };
  const team = getTeam(inv.teamId);
  if (!team) return { ok: false, error: "Team no longer exists" };
  const existing = getMembership(inv.teamId, userId);
  if (existing && existing.status === "active") return { ok: false, error: "You are already a member" };
  if (!canAddMember(team)) return { ok: false, error: "Team seat limit reached — ask the owner to add seats" };

  const stamp = now();
  if (existing) {
    db.prepare("UPDATE team_members SET status = 'active', role = ?, joined_at = ?, updated_at = ? WHERE id = ?")
      .run(inv.role, stamp, stamp, existing.id);
  } else {
    db.prepare(
      "INSERT INTO team_members (id, team_id, user_id, role, status, invited_at, joined_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
    ).run(genId("mem"), inv.teamId, userId, inv.role, stamp, stamp, stamp);
  }
  db.prepare("UPDATE team_invitations SET status = 'accepted', accepted_at = ? WHERE id = ?").run(stamp, inv.id);
  logActivity(inv.teamId, userId, "member.joined", `joined ${team.name}`);
  return { ok: true, team };
}

// ─── Projects ──────────────────────────────────────────────────────────────

export function createTeamProject(teamId: string, actorId: string, input: { name: string; description?: string }): TeamProject | null {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const name = String(input.name).trim().slice(0, 120);
  if (!name) throw new Error("Project name required");
  const id = genId("tprj");
  const stamp = now();
  db.prepare(
    "INSERT INTO team_projects (id, team_id, name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, teamId, name, String(input.description ?? "").slice(0, 1000), actorId, stamp, stamp);
  logActivity(teamId, actorId, "project.created", name);
  return getTeamProject(id);
}

export function getTeamProject(id: string): TeamProject | null {
  const row = db.prepare("SELECT * FROM team_projects WHERE id = ?").get(id) as Row | undefined;
  return row
    ? {
        id: String(row.id),
        teamId: String(row.team_id),
        name: String(row.name),
        description: String(row.description ?? ""),
        createdBy: String(row.created_by),
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
      }
    : null;
}

export function listTeamProjects(teamId: string): TeamProject[] {
  return (
    db.prepare("SELECT * FROM team_projects WHERE team_id = ? ORDER BY updated_at DESC").all(teamId) as Row[]
  ).map((row) => ({
    id: String(row.id),
    teamId: String(row.team_id),
    name: String(row.name),
    description: String(row.description ?? ""),
    createdBy: String(row.created_by),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  }));
}

export function updateTeamProject(teamId: string, actorId: string, projectId: string, patch: { name?: string; description?: string }): TeamProject | null {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const p = getTeamProject(projectId);
  if (!p || p.teamId !== teamId) return null;
  const name = patch.name !== undefined ? String(patch.name).trim().slice(0, 120) || p.name : p.name;
  const description = patch.description !== undefined ? String(patch.description).slice(0, 1000) : p.description;
  db.prepare("UPDATE team_projects SET name = ?, description = ?, updated_at = ? WHERE id = ?").run(name, description, now(), projectId);
  logActivity(teamId, actorId, "project.updated", name);
  return getTeamProject(projectId);
}

export function deleteTeamProject(teamId: string, actorId: string, projectId: string): boolean {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const p = getTeamProject(projectId);
  if (!p || p.teamId !== teamId) return false;
  db.prepare("DELETE FROM team_comments WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM team_tasks WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM team_projects WHERE id = ?").run(projectId);
  logActivity(teamId, actorId, "project.deleted", p.name);
  return true;
}

// ─── Tasks & Kanban ────────────────────────────────────────────────────────

export const TASK_STATUSES = ["backlog", "todo", "in_progress", "review", "done"] as const;

export function createTask(teamId: string, actorId: string, input: {
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  priority?: TeamTask["priority"];
  status?: TeamTask["status"];
  labels?: string[];
  milestone?: string;
  dueDate?: number;
}): TeamTask | null {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const title = String(input.title).trim().slice(0, 200);
  if (!title) throw new Error("Task title required");
  if (input.assigneeId && !getMembership(teamId, input.assigneeId)) throw new Error("Assignee is not a member");
  const id = genId("task");
  const stamp = now();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM team_tasks WHERE team_id = ?").get(teamId) as Row;
  db.prepare(
    `INSERT INTO team_tasks (id, team_id, project_id, title, description, assignee_id, priority, status, labels, milestone, due_date, sort_order, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id, teamId, input.projectId ?? null, title, String(input.description ?? "").slice(0, 4000),
    input.assigneeId ?? null, input.priority ?? "medium", input.status ?? "backlog",
    JSON.stringify(input.labels ?? []), String(input.milestone ?? "").slice(0, 120),
    input.dueDate ?? null, Number(maxOrder.m) + 1, actorId, stamp, stamp,
  );
  logActivity(teamId, actorId, "task.created", title);
  return getTask(id);
}

export function getTask(id: string): TeamTask | null {
  const row = db.prepare(
    `SELECT t.*, u.display_name AS assignee_name FROM team_tasks t
     LEFT JOIN users u ON u.id = t.assignee_id WHERE t.id = ?`,
  ).get(id) as Row | undefined;
  return row ? taskFromRow(row) : null;
}

export function listTasks(teamId: string, projectId?: string, status?: string): TeamTask[] {
  let sql = `SELECT t.*, u.display_name AS assignee_name FROM team_tasks t
     LEFT JOIN users u ON u.id = t.assignee_id WHERE t.team_id = ?`;
  const params: Array<string | number> = [teamId];
  if (projectId) {
    sql += " AND t.project_id = ?";
    params.push(projectId);
  }
  if (status && TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
    sql += " AND t.status = ?";
    params.push(status);
  }
  sql += " ORDER BY t.sort_order ASC, t.created_at ASC";
  return (db.prepare(sql).all(...params) as Row[]).map(taskFromRow);
}

export function updateTask(teamId: string, actorId: string, taskId: string, patch: Partial<{
  title: string;
  description: string;
  projectId: string | null;
  assigneeId: string | null;
  priority: TeamTask["priority"];
  status: TeamTask["status"];
  labels: string[];
  milestone: string;
  dueDate: number | null;
  sortOrder: number;
}>): TeamTask | null {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const task = getTask(taskId);
  if (!task || task.teamId !== teamId) return null;
  if (patch.assigneeId !== undefined && patch.assigneeId !== null && !getMembership(teamId, patch.assigneeId)) throw new Error("Assignee is not a member");
  const title = patch.title !== undefined ? String(patch.title).trim().slice(0, 200) || task.title : task.title;
  const description = patch.description !== undefined ? String(patch.description).slice(0, 4000) : task.description;
  const projectId = patch.projectId !== undefined ? patch.projectId : task.projectId;
  const assigneeId = patch.assigneeId !== undefined ? patch.assigneeId : task.assigneeId;
  const priority = patch.priority ?? task.priority;
  const status = patch.status ?? task.status;
  const labels = patch.labels !== undefined ? JSON.stringify(patch.labels) : JSON.stringify(task.labels);
  const milestone = patch.milestone !== undefined ? String(patch.milestone).slice(0, 120) : task.milestone;
  const dueDate = patch.dueDate !== undefined ? patch.dueDate : task.dueDate;
  const sortOrder = patch.sortOrder ?? task.sortOrder;
  db.prepare(
    `UPDATE team_tasks SET title = ?, description = ?, project_id = ?, assignee_id = ?, priority = ?, status = ?, labels = ?, milestone = ?, due_date = ?, sort_order = ?, updated_at = ? WHERE id = ?`,
  ).run(title, description, projectId, assigneeId, priority, status, labels, milestone, dueDate, sortOrder, now(), taskId);
  if (patch.status && patch.status !== task.status) logActivity(teamId, actorId, "task.moved", `${title} → ${patch.status}`);
  return getTask(taskId);
}

export function deleteTask(teamId: string, actorId: string, taskId: string): boolean {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const task = getTask(taskId);
  if (!task || task.teamId !== teamId) return false;
  db.prepare("DELETE FROM team_tasks WHERE id = ?").run(taskId);
  logActivity(teamId, actorId, "task.deleted", task.title);
  return true;
}

// ─── Comments & code review ────────────────────────────────────────────────

export function addComment(teamId: string, authorId: string, input: {
  body: string;
  projectId?: string;
  filePath?: string;
  line?: number;
  parentId?: string;
}): TeamComment | null {
  if (!hasRole(teamId, authorId, "reviewer")) throw new Error("Member role required");
  const body = String(input.body).trim().slice(0, 2000);
  if (!body) throw new Error("Comment body required");
  const id = genId("cmt");
  db.prepare(
    `INSERT INTO team_comments (id, team_id, project_id, file_path, line, body, author_id, parent_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, teamId, input.projectId ?? null, String(input.filePath ?? "").slice(0, 300), input.line ?? null, body, authorId, input.parentId ?? null, now());
  const detail = input.filePath ? `${input.filePath}${input.line ? `:${input.line}` : ""}` : body.slice(0, 60);
  logActivity(teamId, authorId, "comment.added", detail);
  return getComment(id);
}

export function getComment(id: string): TeamComment | null {
  const row = db.prepare(
    `SELECT c.*, u.display_name AS author_name FROM team_comments c
     LEFT JOIN users u ON u.id = c.author_id WHERE c.id = ?`,
  ).get(id) as Row | undefined;
  return row ? commentFromRow(row) : null;
}

export function listComments(teamId: string, opts: { projectId?: string; filePath?: string; thread?: boolean } = {}): TeamComment[] {
  let sql = `SELECT c.*, u.display_name AS author_name FROM team_comments c
     LEFT JOIN users u ON u.id = c.author_id WHERE c.team_id = ?`;
  const params: Array<string | number> = [teamId];
  if (opts.projectId) {
    sql += " AND c.project_id = ?";
    params.push(opts.projectId);
  }
  if (opts.filePath) {
    sql += " AND c.file_path = ?";
    params.push(opts.filePath);
  }
  sql += " ORDER BY c.created_at ASC";
  const rows = (db.prepare(sql).all(...params) as Row[]).map(commentFromRow);
  // Thread mode: only top-level comments (replies attach to their parent).
  return opts.thread ? rows.filter((c) => !c.parentId) : rows;
}

export function resolveComment(teamId: string, actorId: string, commentId: string, resolved: boolean): TeamComment | null {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const c = getComment(commentId);
  if (!c || c.teamId !== teamId) return null;
  db.prepare("UPDATE team_comments SET resolved = ? WHERE id = ?").run(resolved ? 1 : 0, commentId);
  logActivity(teamId, actorId, resolved ? "comment.resolved" : "comment.reopened", c.filePath || c.body.slice(0, 60));
  return getComment(commentId);
}

export function deleteComment(teamId: string, actorId: string, commentId: string): boolean {
  const c = getComment(commentId);
  if (!c || c.teamId !== teamId) return false;
  if (c.authorId !== actorId && !hasRole(teamId, actorId, "admin")) throw new Error("Only the author or an admin can delete comments");
  db.prepare("DELETE FROM team_comments WHERE id = ?").run(commentId);
  db.prepare("DELETE FROM team_comments WHERE parent_id = ?").run(commentId);
  return true;
}

// ─── Shared environment variables ──────────────────────────────────────────

const ENV_SECRET = process.env.RIDE_ENV_SECRET ?? "ride-env-secret-change-me";

/** Lightweight reversible encryption so values are not stored in plaintext. */
function encryptValue(value: string): string {
  const buf = Buffer.from(value, "utf8");
  const key = Buffer.from(ENV_SECRET.padEnd(32, "0").slice(0, 32), "utf8");
  const out = Buffer.alloc(buf.length);
  for (let i = 0; i < buf.length; i++) {
    const k = i % key.length;
    out[i] = buf[i]! ^ key[k]!;
  }
  return out.toString("base64");
}

function decryptValue(enc: string): string {
  const out = Buffer.from(enc, "base64");
  const key = Buffer.from(ENV_SECRET.padEnd(32, "0").slice(0, 32), "utf8");
  const buf = Buffer.alloc(out.length);
  for (let i = 0; i < out.length; i++) {
    const k = i % key.length;
    buf[i] = out[i]! ^ key[k]!;
  }
  return buf.toString("utf8");
}

export function setEnvVar(teamId: string, actorId: string, input: { key: string; value: string; env?: TeamEnvVar["env"] }): TeamEnvVar | null {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const key = String(input.key).trim().toUpperCase().slice(0, 128);
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error("Invalid variable name (e.g. STRIPE_SECRET_KEY)");
  const env = input.env ?? "development";
  const stamp = now();
  db.prepare(
    `INSERT INTO team_env_vars (id, team_id, key, value_enc, env, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(team_id, key, env) DO UPDATE SET value_enc = excluded.value_enc, updated_at = excluded.updated_at`,
  ).run(genId("env"), teamId, key, encryptValue(String(input.value)), env, actorId, stamp, stamp);
  logActivity(teamId, actorId, "env.set", `${key} (${env})`);
  const row = db.prepare("SELECT * FROM team_env_vars WHERE team_id = ? AND key = ? AND env = ?").get(teamId, key, env) as Row | undefined;
  return row ? envFromRow(row) : null;
}

export function listEnvVars(teamId: string, actorId: string, reveal = false): Array<TeamEnvVar & { value?: string }> {
  if (!hasRole(teamId, actorId, "viewer")) throw new Error("Member role required");
  const rows = db.prepare("SELECT * FROM team_env_vars WHERE team_id = ? ORDER BY env, key").all(teamId) as Row[];
  return rows.map((row) => {
    const base = envFromRow(row);
    return reveal && hasRole(teamId, actorId, "developer") ? { ...base, value: decryptValue(String(row.value_enc)) } : base;
  });
}

export function deleteEnvVar(teamId: string, actorId: string, id: string): boolean {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const row = db.prepare("SELECT * FROM team_env_vars WHERE id = ? AND team_id = ?").get(id, teamId) as Row | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM team_env_vars WHERE id = ?").run(id);
  logActivity(teamId, actorId, "env.deleted", String(row.key));
  return true;
}

// ─── Shared AI context ─────────────────────────────────────────────────────

export function addAiContext(teamId: string, actorId: string, input: { note: string; kind?: string }): AiContextNote | null {
  if (!hasRole(teamId, actorId, "developer")) throw new Error("Member role required");
  const note = String(input.note).trim().slice(0, 4000);
  if (!note) throw new Error("Context note required");
  const id = genId("aictx");
  db.prepare("INSERT INTO team_ai_context (id, team_id, kind, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, teamId, String(input.kind ?? "decision").slice(0, 40), note, actorId, now());
  logActivity(teamId, actorId, "ai.context_added", note.slice(0, 60));
  return getAiContext(id);
}

export function getAiContext(id: string): AiContextNote | null {
  const row = db.prepare(
    `SELECT c.*, u.display_name AS creator_name FROM team_ai_context c
     LEFT JOIN users u ON u.id = c.created_by WHERE c.id = ?`,
  ).get(id) as Row | undefined;
  return row ? aiNoteFromRow(row) : null;
}

export function listAiContext(teamId: string): AiContextNote[] {
  return (
    db.prepare(
      `SELECT c.*, u.display_name AS creator_name FROM team_ai_context c
       LEFT JOIN users u ON u.id = c.created_by WHERE c.team_id = ? ORDER BY c.created_at DESC`,
    ).all(teamId) as Row[]
  ).map(aiNoteFromRow);
}

export function deleteAiContext(teamId: string, actorId: string, id: string): boolean {
  if (!hasRole(teamId, actorId, "admin")) throw new Error("Admin role required");
  const row = db.prepare("SELECT * FROM team_ai_context WHERE id = ? AND team_id = ?").get(id, teamId) as Row | undefined;
  if (!row) return false;
  db.prepare("DELETE FROM team_ai_context WHERE id = ?").run(id);
  logActivity(teamId, actorId, "ai.context_deleted", String(row.note).slice(0, 60));
  return true;
}

// ─── Team analytics ────────────────────────────────────────────────────────

export function teamStats(teamId: string): {
  activeMembers: number;
  projects: number;
  tasks: number;
  openTasks: number;
  doneTasks: number;
  comments: number;
  envVars: number;
  aiContextNotes: number;
} {
  const q = (sql: string, ...params: Array<string | number>) => (db.prepare(sql).get(...params) as Row).c as number;
  return {
    activeMembers: q("SELECT COUNT(*) AS c FROM team_members WHERE team_id = ? AND status = 'active'", teamId),
    projects: q("SELECT COUNT(*) AS c FROM team_projects WHERE team_id = ?", teamId),
    tasks: q("SELECT COUNT(*) AS c FROM team_tasks WHERE team_id = ?", teamId),
    openTasks: q("SELECT COUNT(*) AS c FROM team_tasks WHERE team_id = ? AND status != 'done'", teamId),
    doneTasks: q("SELECT COUNT(*) AS c FROM team_tasks WHERE team_id = ? AND status = 'done'", teamId),
    comments: q("SELECT COUNT(*) AS c FROM team_comments WHERE team_id = ?", teamId),
    envVars: q("SELECT COUNT(*) AS c FROM team_env_vars WHERE team_id = ?", teamId),
    aiContextNotes: q("SELECT COUNT(*) AS c FROM team_ai_context WHERE team_id = ?", teamId),
  };
}

// ─── Deploy approval (2-person for production) ─────────────────────────────

export interface DeploymentApproval {
  id: string;
  teamId: string;
  projectId: string;
  requesterId: string;
  approverIds: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

const approvals = new Map<string, DeploymentApproval>();

export function requestDeploymentApproval(teamId: string, requesterId: string, projectId: string): DeploymentApproval {
  if (!hasRole(teamId, requesterId, "developer")) throw new Error("Member role required");
  const id = genId("dappr");
  const approval: DeploymentApproval = { id, teamId, projectId, requesterId, approverIds: [], status: "pending", createdAt: now() };
  approvals.set(id, approval);
  logActivity(teamId, requesterId, "deploy.approval_requested", projectId);
  return approval;
}

export function decideDeploymentApproval(teamId: string, approverId: string, approvalId: string, approve: boolean): DeploymentApproval | null {
  if (!hasRole(teamId, approverId, "reviewer")) throw new Error("Reviewer role required");
  const approval = approvals.get(approvalId);
  if (!approval || approval.teamId !== teamId || approval.status !== "pending") return null;
  if (approverId === approval.requesterId) throw new Error("Requester cannot approve their own deployment");
  if (approval.approverIds.includes(approverId)) throw new Error("Already approved");
  if (!approve) {
    approval.status = "rejected";
    logActivity(teamId, approverId, "deploy.approval_rejected", approval.projectId);
    return approval;
  }
  approval.approverIds.push(approverId);
  if (approval.approverIds.length >= 2) {
    approval.status = "approved";
    logActivity(teamId, approverId, "deploy.approved", approval.projectId);
  }
  return approval;
}

export function listDeploymentApprovals(teamId: string): DeploymentApproval[] {
  return [...approvals.values()].filter((a) => a.teamId === teamId).sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Billing helpers ───────────────────────────────────────────────────────

/**
 * The price a user pays per shipped project. Verified students pay ₹49 —
 * everyone else pays the developer price. Projects never disappear when a
 * student graduates; only the pricing eligibility changes.
 */
export function projectPricePaise(userId: string, region: "in" | "intl"): { pricePaise: number; student: boolean } {
  if (region === "intl") return { pricePaise: 200, student: false };
  const student = getStudentStatus(userId);
  return student.verified ? { pricePaise: 4900, student: true } : { pricePaise: 9900, student: false };
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "team";
}