import { app } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes, randomInt, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);

const AUTH_DIR = join(app.getPath("userData"), "auth");
const USERS_FILE = join(AUTH_DIR, "users.json");
const PROVIDERS_FILE = join(AUTH_DIR, "providers.json");

export interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  provider: string;
  providerId: string;
  emailVerified: boolean;
  passwordHash?: string;
  salt?: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface StoredProviderConfig {
  clientId?: string;
  clientSecret?: string;
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  redirectUri?: string;
}

interface OneTimeCode {
  code: string;
  email: string;
  purpose: "reset" | "verify";
  expiresAt: number;
}

const CODE_TTL_MS = 15 * 60 * 1000;

class LocalAuthStore {
  private users: StoredUser[] = [];
  private providerConfigs = new Map<string, StoredProviderConfig>();
  private codes = new Map<string, OneTimeCode>();
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await mkdir(AUTH_DIR, { recursive: true });
    try {
      this.users = JSON.parse(await readFile(USERS_FILE, "utf8")) as StoredUser[];
    } catch {
      this.users = [];
    }
    try {
      const providers = JSON.parse(await readFile(PROVIDERS_FILE, "utf8")) as Record<string, StoredProviderConfig>;
      this.providerConfigs = new Map(Object.entries(providers));
    } catch {
      this.providerConfigs = new Map();
    }
    this.loaded = true;
  }

  private async persistUsers(): Promise<void> {
    await writeFile(USERS_FILE, JSON.stringify(this.users, null, 2), "utf8");
  }

  private async persistProviders(): Promise<void> {
    await writeFile(PROVIDERS_FILE, JSON.stringify(Object.fromEntries(this.providerConfigs), null, 2), "utf8");
  }

  async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = randomBytes(16).toString("hex");
    const hash = (await scrypt(password, salt, 64)) as Buffer;
    return { hash: hash.toString("hex"), salt };
  }

  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    const candidate = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  }

  async createUser(input: {
    email: string;
    displayName: string;
    username?: string;
    password?: string;
    provider: string;
    providerId?: string;
    emailVerified?: boolean;
    avatarUrl?: string;
  }): Promise<StoredUser> {
    await this.ensureLoaded();
    const now = Date.now();
    const user: StoredUser = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      username: input.username,
      avatarUrl: input.avatarUrl,
      provider: input.provider,
      providerId: input.providerId ?? input.email.toLowerCase(),
      emailVerified: input.emailVerified ?? false,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    if (input.password) {
      const { hash, salt } = await this.hashPassword(input.password);
      user.passwordHash = hash;
      user.salt = salt;
    }
    this.users.push(user);
    await this.persistUsers();
    return user;
  }

  async findByEmail(email: string): Promise<StoredUser | null> {
    await this.ensureLoaded();
    const lower = email.toLowerCase();
    return this.users.find((u) => u.email === lower) ?? null;
  }

  async findById(id: string): Promise<StoredUser | null> {
    await this.ensureLoaded();
    return this.users.find((u) => u.id === id) ?? null;
  }

  async upsertOAuthUser(input: {
    email: string;
    displayName: string;
    provider: string;
    providerId: string;
    avatarUrl?: string;
  }): Promise<StoredUser> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      existing.displayName = existing.displayName || input.displayName;
      existing.avatarUrl = input.avatarUrl || existing.avatarUrl;
      existing.providerId = input.providerId;
      existing.emailVerified = true;
      existing.updatedAt = Date.now();
      await this.persistUsers();
      return existing;
    }
    return this.createUser({ ...input, emailVerified: true });
  }

  async updateUser(id: string, updates: Partial<StoredUser>): Promise<StoredUser | null> {
    await this.ensureLoaded();
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    Object.assign(user, updates, { updatedAt: Date.now() });
    await this.persistUsers();
    return user;
  }

  async setPassword(id: string, password: string): Promise<boolean> {
    const { hash, salt } = await this.hashPassword(password);
    const user = await this.updateUser(id, { passwordHash: hash, salt });
    return !!user;
  }

  issueCode(email: string, purpose: "reset" | "verify"): string {
    const code = String(randomInt(100000, 1000000));
    this.codes.set(code, { code, email: email.toLowerCase(), purpose, expiresAt: Date.now() + CODE_TTL_MS });
    return code;
  }

  consumeCode(code: string, email: string, purpose: "reset" | "verify"): boolean {
    const entry = this.codes.get(code);
    if (!entry || entry.email !== email.toLowerCase() || entry.purpose !== purpose) return false;
    if (entry.expiresAt < Date.now()) {
      this.codes.delete(code);
      return false;
    }
    this.codes.delete(code);
    return true;
  }

  async getProviderConfig(id: string): Promise<StoredProviderConfig> {
    await this.ensureLoaded();
    return this.providerConfigs.get(id) ?? {};
  }

  async saveProviderConfig(id: string, config: StoredProviderConfig): Promise<void> {
    await this.ensureLoaded();
    this.providerConfigs.set(id, config);
    await this.persistProviders();
  }
}

export const localAuthStore = new LocalAuthStore();