import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { shell } from "electron";
import type { OAuthDeviceFlow, OAuthPollResult } from "@ride/contracts";
import { credentialService } from "../credential";
import { localAuthStore, type StoredUser } from "./localStore";

export interface AuthProvider {
  id: string;
  name: string;
  displayName: string;
  type: "email" | "oauth" | "passkey";
  config: AuthProviderConfig;
  enabled: boolean;
}

export interface AuthProviderConfig {
  clientId?: string;
  clientSecret?: string;
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  redirectUri?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  provider: string;
  providerId: string;
  emailVerified: boolean;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
  twoFactorEnabled?: boolean;
  passkeysEnabled?: boolean;
  /** Account type: "student", "developer" */
  accountType?: string;
  /** Student verification status */
  studentVerified?: boolean;
  /** Student verification expiry date (ms since epoch) */
  studentVerificationExpiry?: number;
}

/** Billing plans (paise for INR) */
export const BillingPlans = {
  student: {
    id: "student",
    name: "Student",
    price: 4900, // ₹49 in paise
    currency: "INR",
    interval: "one-time" as const,
    description: "₹49 per project",
    features: ["export", "deployment guide"] as const[],
  } as const,
  developer: {
    id: "developer",
    name: "Developer",
    price: 9900, // ₹99 in paise
    currency: "INR",
    interval: "one-time" as const,
    description: "₹99 per project",
    features: ["export", "deployment guide"] as const[],
  } as const,
} as const;

/** Account type identifiers */
export const AccountTypes = {
  student: "student" as const,
  developer: "developer" as const,
} as const;

/** Human-readable plan name for a given AccountStatus */
export const accountStatusToPlanName = (status: AccountStatus): string => {
  switch (status) {
    case AccountStatus.Student:
      return "Student (₹49/project)";
    case AccountStatus.Developer:
      return "Developer (₹99/project)";
    default:
      return "Unverified";
  }
};

export enum AccountStatus {
  Student = "student",
  Developer = "developer",
  Unverified = "unverified",
}

/** Default mapping: unverified users are developers; .edu/.ac.in gives student status */
export const defaultAccountStatus = (email: string): AccountStatus => {
  const lower = email.toLowerCase();
  if (lower.endsWith(".edu") || lower.endsWith(".ac.in") || lower.endsWith(".edu.in")) {
    return AccountStatus.Student;
  }
  return AccountStatus.Developer;
};

/** Result of a login that includes session replacement info */
export interface LoginResult {
  success: boolean;
  user?: UserAccount | null;
  session?: AuthSession | null;
  error?: string | null;
  requiresVerification?: boolean;
  verificationToken?: string | null;
  previousSessionRevoked: boolean;
}

/** Session state */


/** Device information */


/** Login credentials */
interface AuthSession {
  id: string;
  userId: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  createdAt: number;
  lastActivityAt: number;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  revokedAt?: number;
}

interface DeviceInfo {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
  os: string;
  browser: string;
  lastSeen: number;
  trusted: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/** Signup data */
export interface SignupData {
  email: string;
  password: string;
  displayName: string;
  username?: string;
}

/** Auth result */
export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  session?: AuthSession;
  error?: string;
  requiresVerification?: boolean;
  verificationToken?: string;
  /** Locally-generated one-time code (reset/verification) when no email service is available. */
  code?: string;
}

/** Password reset request */
export interface PasswordResetRequest {
  email: string;
}

/** Password reset confirm */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export class AuthService extends EventEmitter {
  private providers = new Map<string, AuthProvider>();
  private currentUser: UserAccount | null = null;
  private currentSession: AuthSession | null = null;
  private sessions = new Map<string, AuthSession>();
  private lastResetEmail = "";
  private lastVerifyEmail = "";
  private oauthFlows = new Map<string, { deviceCode: string; interval: number; expiresAt: number; providerId: string }>();

  constructor() {
    super();
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.providers.set("email", {
      id: "email",
      name: "email",
      displayName: "Email & Password",
      type: "email",
      config: {},
      enabled: true,
    });

    this.providers.set("google", {
      id: "google",
      name: "google",
      displayName: "Google",
      type: "oauth",
      config: {
        clientId: "698792789619-hlck1nvahusgvu5c8lc77sopu1adjr04.apps.googleusercontent.com",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: ["openid", "email", "profile"],
      },
      enabled: true,
    });

    this.providers.set("github", {
      id: "github",
      name: "github",
      displayName: "GitHub",
      type: "oauth",
      config: {
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        scopes: ["read:user", "user:email"],
      },
      enabled: false,
    });

    this.providers.set("passkey", {
      id: "passkey",
      name: "passkey",
      displayName: "Passkey / WebAuthn",
      type: "passkey",
      config: {},
      enabled: false,
    });
  }

  getProviders(): AuthProvider[] {
    return Array.from(this.providers.values()).filter(p => p.enabled);
  }

  getProvider(id: string): AuthProvider | undefined {
    return this.providers.get(id);
  }

  async loadPersistedProviderConfigs(): Promise<void> {
    for (const id of ["email", "google", "github"]) {
      const provider = this.providers.get(id);
      if (!provider) continue;
      const config = await localAuthStore.getProviderConfig(id);
      if (config.clientId || config.clientSecret || config.redirectUri) {
        provider.config = { ...provider.config, ...config };
        this.providers.set(id, provider);
      }
    }
  }

  async configureProvider(id: string, config: Partial<AuthProviderConfig>): Promise<AuthProvider | undefined> {
    const provider = this.providers.get(id);
    if (!provider) return undefined;

    provider.config = { ...provider.config, ...config };
    provider.enabled = true;
    this.providers.set(id, provider);
    await localAuthStore.saveProviderConfig(id, provider.config);
    this.emit("providerConfigured", provider);
    return provider;
  }

  /**
   * Login with one-active-session enforcement.
   * When a new login occurs, all other sessions for this user are revoked,
   * and the previous client receives a sessionRevoked event.
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const user = await this.authenticateWithBackend(credentials);

      if (!user) {
        return {
          success: false,
          error: "Invalid credentials",
          requiresVerification: false,
          previousSessionRevoked: false,
        };
      }

      // Revoke all existing sessions for this user (except the one being created)
      await this.revokeUserSessions(user.id, this.currentSession?.id);

      const session = await this.createSession(user);
      this.currentUser = user;
      this.currentSession = session;

      this.emit("login", { user, session });
      return {
        success: true,
        user,
        session,
        previousSessionRevoked: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
        requiresVerification: false,
        previousSessionRevoked: false,
      };
    }
  }

  /** Revoke all sessions for userId, excluding the sessionId toKeep. */
  private async revokeUserSessions(userId: string, toKeep?: string): Promise<void> {
    const userSessions = Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId,
    );
    for (const session of userSessions) {
      if (session.id === toKeep) continue;
      await this.invalidateSession(session.id);
      this.sessions.delete(session.id);
      this.emit("sessionRevoked", { sessionId: session.id, userId });
    }
  }

  async signup(data: SignupData): Promise<AuthResult> {
    try {
      const user = await this.registerWithBackend(data);

      if (!user) {
        return { success: false, error: "Registration failed" };
      }

      // Set default account type based on email
      if (!user.accountType) {
        user.accountType = defaultAccountStatus(user.email);
      }

      const session = await this.createSession(user);
      this.currentUser = user;
      this.currentSession = session;

      this.emit("signup", { user, session });
      return { success: true, user, session, requiresVerification: !user.emailVerified };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Signup failed" };
    }
  }

  async logout(): Promise<void> {
    if (this.currentSession) {
      await this.invalidateSession(this.currentSession.id);
      this.sessions.delete(this.currentSession.id);
    }

    const previousUser = this.currentUser;
    this.currentUser = null;
    this.currentSession = null;

    this.emit("logout", { user: previousUser });
  }

  async logoutAllDevices(): Promise<void> {
    const userId = this.currentUser?.id;
    if (!userId) return;

    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        await this.invalidateSession(id);
      }
    }
    this.sessions.clear();
    this.currentSession = null;
    this.emit("logoutAll", { userId });
  }

async requestPasswordReset(request: PasswordResetRequest): Promise<AuthResult> {
    try {
      this.lastResetEmail = request.email;
      const code = await this.sendPasswordResetEmail(request.email);
      return { success: true, code };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to send reset code" };
    }
  }

  async confirmPasswordReset(confirm: PasswordResetConfirm): Promise<AuthResult> {
    try {
      const success = await this.resetPasswordWithToken(confirm.token, confirm.newPassword);
      if (success) {
        return { success: true };
      }
      return { success: false, error: "Invalid or expired reset token" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Password reset failed" };
    }
  }

async verifyEmail(token: string): Promise<AuthResult> {
    try {
      const user = await this.verifyEmailWithToken(token);
      if (user) {
        this.currentUser = user;
        this.emit("emailVerified", { user });
        return { success: true, user };
      }
      return { success: false, error: "Invalid or expired verification code" };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Email verification failed" };
    }
  }

  async refreshSession(): Promise<AuthResult> {
    if (!this.currentSession?.refreshToken) {
      return { success: false, error: "No refresh token available" };
    }

    try {
      const session = await this.refreshAccessToken(this.currentSession.refreshToken);
      this.currentSession = session;
      this.sessions.set(session.id, session);
      this.emit("sessionRefreshed", { session });
      return { success: true, session };
    } catch (error) {
      await this.logout();
      return { success: false, error: error instanceof Error ? error.message : "Session refresh failed" };
    }
  }

  getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  getSessions(): AuthSession[] {
    return Array.from(this.sessions.values());
  }

  async revokeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    await this.invalidateSession(sessionId);
    this.sessions.delete(sessionId);

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
      this.currentUser = null;
    }

    this.emit("sessionRevoked", { sessionId });
    return true;
  }

  async updateProfile(updates: Partial<UserAccount>): Promise<UserAccount | null> {
    if (!this.currentUser) return null;

    const updated = { ...this.currentUser, ...updates, updatedAt: Date.now() };
    await this.updateUserInBackend(updated);

    this.currentUser = updated;
    this.emit("profileUpdated", { user: updated });
    return updated;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    if (!this.currentUser) {
      return { success: false, error: "Not logged in" };
    }

    try {
      await this.changePasswordInBackend(this.currentUser.id, currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Password change failed" };
    }
  }

  /** Convenience: check if the current user has active student verification. */
  isStudentVerified(): boolean {
    return !!(this.currentUser?.studentVerified && this.currentUser?.studentVerificationExpiry && this.currentUser.studentVerificationExpiry > Date.now());
  }

  /** Get the account status enum based on verification state. */
  getAccountStatus(): AccountStatus {
    if (!this.currentUser) return AccountStatus.Unverified;
    if (this.isStudentVerified()) return AccountStatus.Student;
    return defaultAccountStatus(this.currentUser.email);
  }

  /** Convenience: returns human-readable plan name for the current user's account type */
  getCurrentPlanName(): string {
    const status = this.getAccountStatus();
    return accountStatusToPlanName(status);
  }

  /** Get the billing plan details for the current user's account type. */
  getCurrentBillingPlan() {
    const status = this.getAccountStatus();
    switch (status) {
      case AccountStatus.Student:
        return BillingPlans.student;
      case AccountStatus.Developer:
        return BillingPlans.developer;
      default:
        return null;
    }
  }

// -------------------------------------------------------------------------
  // Local-first auth backend — users, hashes and codes live in the app data
  // dir (encrypted credential vault stores sessions). No remote server needed.
  // -------------------------------------------------------------------------

  private async authenticateWithBackend(credentials: LoginCredentials): Promise<UserAccount | null> {
    const user = await localAuthStore.findByEmail(credentials.email);
    if (!user || !user.passwordHash || !user.salt) return null;
    const ok = await localAuthStore.verifyPassword(credentials.password, user.passwordHash, user.salt);
    return ok ? this.toAccount(user) : null;
  }

  private async registerWithBackend(data: SignupData): Promise<UserAccount | null> {
    if (await localAuthStore.findByEmail(data.email)) {
      throw new Error("An account with this email already exists. Try signing in instead.");
    }
    const user = await localAuthStore.createUser({
      email: data.email,
      displayName: data.displayName,
      username: data.username,
      password: data.password,
      provider: "email",
      emailVerified: true,
    });
    return this.toAccount(user);
  }

private async createSession(user: UserAccount): Promise<AuthSession> {
    const session: AuthSession = {
      id: randomUUID(),
      userId: user.id,
      provider: user.provider,
      accessToken: randomUUID(),
      refreshToken: randomUUID(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      deviceInfo: this.getDeviceInfo(),
    };

    this.sessions.set(session.id, session);
    await credentialService.set(`session:${session.id}`, JSON.stringify(session));
    await credentialService.set("currentSession", JSON.stringify(session));
    return session;
  }

private async invalidateSession(sessionId: string): Promise<void> {
    await credentialService.delete(`session:${sessionId}`);
    if (this.currentSession?.id === sessionId) {
      await credentialService.delete("currentSession");
    }
  }

private async sendPasswordResetEmail(email: string): Promise<string> {
    return localAuthStore.issueCode(email, "reset");
  }

  private async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    const user = await localAuthStore.findByEmail(this.lastResetEmail ?? "");
    const consumed = localAuthStore.consumeCode(token, this.lastResetEmail ?? "", "reset");
    if (!consumed) return false;
    if (!user) return false;
    await localAuthStore.setPassword(user.id, newPassword);
    return true;
  }

  private async verifyEmailWithToken(token: string): Promise<UserAccount | null> {
    const user = await localAuthStore.findByEmail(this.lastVerifyEmail ?? "");
    const consumed = localAuthStore.consumeCode(token, this.lastVerifyEmail ?? "", "verify");
    if (!consumed) return null;
    if (!user) return null;
    const updated = await localAuthStore.updateUser(user.id, { emailVerified: true });
    return updated ? this.toAccount(updated) : null;
  }

  private async refreshAccessToken(refreshToken: string): Promise<AuthSession> {
    const session = this.currentSession;
    if (!session) throw new Error("No active session");
    session.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await credentialService.set(`session:${session.id}`, JSON.stringify(session));
    return session;
  }

  private async updateUserInBackend(user: UserAccount): Promise<void> {
    await localAuthStore.updateUser(user.id, {
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
    });
  }

  private async changePasswordInBackend(userId: string, current: string, newPassword: string): Promise<void> {
    const user = await localAuthStore.findById(userId);
    if (!user || !user.passwordHash || !user.salt) {
      throw new Error("This account uses a social provider and has no password.");
    }
    const ok = await localAuthStore.verifyPassword(current, user.passwordHash, user.salt);
    if (!ok) throw new Error("Current password is incorrect.");
    await localAuthStore.setPassword(userId, newPassword);
  }

  private toAccount(user: StoredUser): UserAccount {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      providerId: user.providerId,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      metadata: user.metadata,
      twoFactorEnabled: false,
      passkeysEnabled: false,
    };
  }

  // -------------------------------------------------------------------------
  // OAuth device flow (no redirect server needed)
  // -------------------------------------------------------------------------

  async beginOAuth(providerId: string): Promise<OAuthDeviceFlow> {
    const provider = this.providers.get(providerId);
    if (!provider || provider.type !== "oauth") {
      return { success: false, error: "Unknown OAuth provider" };
    }
    const config = await localAuthStore.getProviderConfig(providerId);
    const clientId = config.clientId || provider.config.clientId;
    if (!clientId) {
      return {
        success: false,
        error: `${provider.displayName} OAuth is not configured. Add a client ID for "${provider.displayName}" in Settings → Account, then try again.`,
      };
    }

    try {
      const params = new URLSearchParams({ client_id: clientId, scope: (config.scopes ?? provider.config.scopes ?? []).join(" ") });
      const res = await fetch("https://oauth2.googleapis.com/device/code", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok || !json.device_code || !json.user_code) {
        return { success: false, error: `OAuth setup failed: ${String(json.error_description ?? json.error ?? res.status)}` };
      }
      const flow = {
        deviceCode: String(json.device_code),
        interval: Math.max(Number(json.interval) || 5, 2),
        expiresAt: Date.now() + Number(json.expires_in ?? 1800) * 1000,
        providerId,
      };
      this.oauthFlows.set(providerId, flow);
      const verificationUrl = String(json.verification_url);
      void shell.openExternal(verificationUrl);
      return {
        success: true,
        verificationUrl,
        userCode: String(json.user_code),
        expiresIn: Number(json.expires_in ?? 1800),
        interval: flow.interval,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "OAuth setup failed" };
    }
  }

  async pollOAuth(providerId: string): Promise<OAuthPollResult> {
    const flow = this.oauthFlows.get(providerId);
    if (!flow) return { status: "expired", error: "No active OAuth flow. Start again." };
    if (flow.expiresAt < Date.now()) {
      this.oauthFlows.delete(providerId);
      return { status: "expired", error: "The code expired. Start again." };
    }

    const provider = this.providers.get(providerId);
    const config = await localAuthStore.getProviderConfig(providerId);
    const clientId = config.clientId || provider?.config.clientId;
    if (!clientId) return { status: "error", error: "OAuth provider is not configured." };

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        device_code: flow.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      });
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const error = String(json.error ?? "unknown_error");
        if (error === "authorization_pending" || error === "slow_down") return { status: "pending" };
        if (error === "access_denied") {
          this.oauthFlows.delete(providerId);
          return { status: "denied", error: "You denied the authorization request." };
        }
        if (error === "expired_token") {
          this.oauthFlows.delete(providerId);
          return { status: "expired", error: "The code expired. Start again." };
        }
        return { status: "error", error: String(json.error_description ?? json.error ?? res.status) };
      }

      const accessToken = String(json.access_token);
      const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const info = (await infoRes.json()) as { id?: string; email?: string; name?: string; picture?: string };
      if (!infoRes.ok || !info.email) {
        return { status: "error", error: "Could not fetch your Google profile." };
      }
      const email = String(info.email);

      const stored = await localAuthStore.upsertOAuthUser({
        email,
        displayName: info.name || email.split("@")[0] || "RIDE User",
        provider: providerId,
        providerId: String(info.id ?? email),
        avatarUrl: info.picture,
      });
      const account = this.toAccount(stored);
      const session = await this.createSession(account);
      this.currentUser = account;
      this.currentSession = session;
      this.oauthFlows.delete(providerId);
      this.emit("login", { user: account, session });
      return { status: "success", user: account as import("@ride/contracts").UserAccount };
    } catch (error) {
      return { status: "error", error: error instanceof Error ? error.message : "OAuth check failed" };
    }
  }

  private getDeviceInfo(): DeviceInfo {
    // In Electron, navigator may not be available in the main process;
    // fall back to process info.
    const platform = typeof navigator !== "undefined" ? navigator.platform : process.platform;
    return {
      id: randomUUID(),
      name: `${platform} Device`,
      type: "desktop",
      os: platform,
      browser: "Electron",
      lastSeen: Date.now(),
      trusted: false,
    };
  }

async loadPersistedSession(): Promise<void> {
    try {
      const sessionData = await credentialService.get("currentSession");
      if (sessionData) {
        const session = JSON.parse(sessionData) as AuthSession;
        if (session.expiresAt && session.expiresAt > Date.now()) {
          this.currentSession = session;
          this.sessions.set(session.id, session);
          const storedUser = await localAuthStore.findById(session.userId);
          if (storedUser) this.currentUser = this.toAccount(storedUser);
          this.emit("sessionRestored", { session });
        }
      }
    } catch {
      // No persisted session or corrupted
    }
  }
}

;
export type { AuthSession, DeviceInfo };
export const authService = new AuthService();


