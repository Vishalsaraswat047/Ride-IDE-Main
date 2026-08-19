import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { authService, type UserAccount, type AuthSession, type DeviceInfo } from "../auth";
import { credentialService } from "../credential";

export interface ProfileData {
  displayName: string;
  username?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  language?: string;
  avatarUrl?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passkeysEnabled: boolean;
  activeSessions: AuthSession[];
  loginHistory: LoginEvent[];
  connectedDevices: DeviceInfo[];
}

export interface LoginEvent {
  id: string;
  timestamp: number;
  ipAddress?: string;
  deviceInfo?: DeviceInfo;
  success: boolean;
  provider: string;
}

export interface ConnectedAccount {
  id: string;
  provider: string;
  providerId: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  connectedAt: number;
  scopes: string[];
}

export interface PrivacySettings {
  telemetry: boolean;
  crashReports: boolean;
  usageAnalytics: boolean;
  aiInteractionData: boolean;
  codeIndexing: boolean;
  cloudSync: boolean;
}

export interface AccountDataExport {
  profile: ProfileData;
  settings: Record<string, unknown>;
  sessions: AuthSession[];
  devices: DeviceInfo[];
  connectedAccounts: ConnectedAccount[];
  loginHistory: LoginEvent[];
  exportedAt: number;
}

export class AccountService extends EventEmitter {
  private profile: ProfileData = {
    displayName: "",
    username: "",
    bio: "",
    country: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator?.language ?? "en-US",
    avatarUrl: "",
  };

  private privacy: PrivacySettings = {
    telemetry: false,
    crashReports: false,
    usageAnalytics: false,
    aiInteractionData: false,
    codeIndexing: false,
    cloudSync: false,
  };

  private connectedAccounts = new Map<string, ConnectedAccount>();
  private loginHistory: LoginEvent[] = [];

  constructor() {
    super();
    void this.loadPersistedData();
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const profileData = await credentialService.get("account:profile");
      if (profileData) {
        this.profile = JSON.parse(profileData);
      }
    } catch {
      // Ignore
    }

    try {
      const privacyData = await credentialService.get("account:privacy");
      if (privacyData) {
        this.privacy = JSON.parse(privacyData);
      }
    } catch {
      // Ignore
    }

    try {
      const connectedData = await credentialService.get("account:connected");
      if (connectedData) {
        const parsed = JSON.parse(connectedData) as ConnectedAccount[];
        if (Array.isArray(parsed)) {
          this.connectedAccounts.clear();
          for (const account of parsed) this.connectedAccounts.set(account.id, account);
        }
      }
    } catch {
      // Ignore
    }
  }

  async init(): Promise<void> {
    await this.loadPersistedData();
  }

  async saveProfile(profile: Partial<ProfileData>): Promise<ProfileData> {
    this.profile = { ...this.profile, ...profile };
    await credentialService.set("account:profile", JSON.stringify(this.profile));
    this.emit("profileSaved", this.profile);
    return this.profile;
  }

  getProfile(): ProfileData {
    return { ...this.profile };
  }

  async savePrivacy(privacy: Partial<PrivacySettings>): Promise<PrivacySettings> {
    this.privacy = { ...this.privacy, ...privacy };
    await credentialService.set("account:privacy", JSON.stringify(this.privacy));
    this.emit("privacySaved", this.privacy);
    return this.privacy;
  }

  getPrivacy(): PrivacySettings {
    return { ...this.privacy };
  }

  getSecuritySettings(): SecuritySettings {
    const user = authService.getCurrentUser();
    const sessions = authService.getSessions();
    
    return {
      twoFactorEnabled: Boolean(user?.metadata?.twoFactorEnabled),
      passkeysEnabled: Boolean(user?.metadata?.passkeysEnabled),
      activeSessions: sessions,
      loginHistory: [...this.loginHistory].slice(-50),
      connectedDevices: sessions.map(s => s.deviceInfo).filter((d): d is DeviceInfo => d !== undefined),
    };
  }

  async connectAccount(provider: string, email?: string, username?: string): Promise<ConnectedAccount | null> {
    const user = authService.getCurrentUser();
    if (!user) return null;

    const existing = Array.from(this.connectedAccounts.values()).find(
      (a) => a.provider.toLowerCase() === provider.toLowerCase(),
    );
    if (existing) return existing;

    const connected: ConnectedAccount = {
      id: randomUUID(),
      provider,
      providerId: `${provider}:${email ?? user.email}`,
      email: email ?? user.email,
      username: username ?? user.username ?? user.displayName,
      connectedAt: Date.now(),
      scopes: ["profile", "email"],
    };
    this.connectedAccounts.set(connected.id, connected);
    await this.persistConnectedAccounts();
    this.emit("accountConnected", connected);
    return connected;
  }

  private async persistConnectedAccounts(): Promise<void> {
    await credentialService.set("account:connected", JSON.stringify(Array.from(this.connectedAccounts.values())));
  }

  async disconnectAccount(accountId: string): Promise<boolean> {
    const account = this.connectedAccounts.get(accountId);
    if (!account) return false;

    this.connectedAccounts.delete(accountId);
    await this.persistConnectedAccounts();
    this.emit("accountDisconnected", { accountId });
    return true;
  }

  getConnectedAccounts(): ConnectedAccount[] {
    return Array.from(this.connectedAccounts.values());
  }

  async exportAccountData(): Promise<AccountDataExport> {
    const user = authService.getCurrentUser();
    const sessions = authService.getSessions();
    
    return {
      profile: this.profile,
      settings: {
        privacy: this.privacy,
      },
      sessions,
      devices: sessions.map(s => s.deviceInfo).filter((d): d is DeviceInfo => d !== undefined),
      connectedAccounts: this.getConnectedAccounts(),
      loginHistory: this.loginHistory,
      exportedAt: Date.now(),
    };
  }

  async downloadSettings(): Promise<string> {
    const exportData = await this.exportAccountData();
    return JSON.stringify(exportData, null, 2);
  }

  async deleteAccount(confirmation: string): Promise<boolean> {
    const user = authService.getCurrentUser();
    if (!user) return false;

    if (confirmation !== "DELETE") {
      throw new Error("Invalid confirmation. Type 'DELETE' to confirm.");
    }

    // TODO: Call backend to delete account
    await this.wipeLocalData();
    await authService.logout();
    
    this.emit("accountDeleted", { userId: user.id });
    return true;
  }

  private async wipeLocalData(): Promise<void> {
    await credentialService.clear();
    this.profile = {
      displayName: "",
      username: "",
      bio: "",
      country: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator?.language ?? "en-US",
      avatarUrl: "",
    };
    this.privacy = {
      telemetry: false,
      crashReports: false,
      usageAnalytics: false,
      aiInteractionData: false,
      codeIndexing: false,
      cloudSync: false,
    };
    this.connectedAccounts.clear();
    this.loginHistory = [];
  }

  addLoginEvent(event: Omit<LoginEvent, "id">): void {
    const loginEvent: LoginEvent = {
      ...event,
      id: randomUUID(),
    };
    this.loginHistory.push(loginEvent);
    if (this.loginHistory.length > 100) {
      this.loginHistory = this.loginHistory.slice(-100);
    }
    this.emit("loginEvent", loginEvent);
  }

  async updateAvatar(file: File): Promise<string | null> {
    // TODO: Upload to backend/storage
    console.log("[AccountService] updateAvatar", file.name);
    return null;
  }
}

export const accountService = new AccountService();