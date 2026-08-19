import { app, safeStorage } from "electron";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes, createCipheriv, createDecipheriv, randomUUID } from "node:crypto";

const CREDENTIALS_DIR = join(app.getPath("userData"), "credentials");
const MASTER_KEY_FILE = join(CREDENTIALS_DIR, ".master");
const CREDENTIAL_PREFIX = "cred_";

export interface StoredCredential {
  id: string;
  key: string;
  value: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface CredentialVault {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, metadata?: Record<string, unknown>): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<StoredCredential[]>;
  clear(): Promise<void>;
}

class ElectronCredentialVault implements CredentialVault {
  private masterKey: Buffer | null = null;
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    await mkdir(CREDENTIALS_DIR, { recursive: true });
    
    try {
      const keyData = await readFile(MASTER_KEY_FILE, "utf8");
      this.masterKey = Buffer.from(keyData, "base64");
    } catch {
      this.masterKey = randomBytes(32);
      await writeFile(MASTER_KEY_FILE, this.masterKey.toString("base64"), "utf8");
    }
    
    this.initialized = true;
  }

  private getCredentialPath(key: string): string {
    const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, "_");
    return join(CREDENTIALS_DIR, `${CREDENTIAL_PREFIX}${sanitized}.enc`);
  }

  private encrypt(data: string): string {
    if (!this.masterKey) throw new Error("Vault not initialized");
    
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-gcm", this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  private decrypt(encryptedData: string): string {
    if (!this.masterKey) throw new Error("Vault not initialized");
    
    const data = Buffer.from(encryptedData, "base64");
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    
    const decipher = createDecipheriv("aes-256-gcm", this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }

  async get(key: string): Promise<string | null> {
    await this.ensureInitialized();
    
    const path = this.getCredentialPath(key);
    try {
      const encrypted = await readFile(path, "utf8");
      return this.decrypt(encrypted);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, metadata: Record<string, unknown> = {}): Promise<void> {
    await this.ensureInitialized();
    
    const path = this.getCredentialPath(key);
    const encrypted = this.encrypt(value);
    await writeFile(path, encrypted, "utf8");
  }

  async delete(key: string): Promise<void> {
    await this.ensureInitialized();
    
    const path = this.getCredentialPath(key);
    try {
      await unlink(path);
    } catch {
      // Ignore if not found
    }
  }

  async list(): Promise<StoredCredential[]> {
    await this.ensureInitialized();
    
    const { readdir } = await import("node:fs/promises");
    try {
      const files = await readdir(CREDENTIALS_DIR);
      const credentials: StoredCredential[] = [];
      
      for (const file of files) {
        if (!file.startsWith(CREDENTIAL_PREFIX) || !file.endsWith(".enc")) continue;
        
        const key = file.slice(CREDENTIAL_PREFIX.length, -4);
        const value = await this.get(key);
        
        if (value !== null) {
          credentials.push({
            id: randomUUID(),
            key,
            value,
            metadata: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
      
      return credentials;
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();
    
    const { readdir, unlink } = await import("node:fs/promises");
    try {
      const files = await readdir(CREDENTIALS_DIR);
      for (const file of files) {
        if (file.startsWith(CREDENTIAL_PREFIX) && file.endsWith(".enc")) {
          await unlink(join(CREDENTIALS_DIR, file));
        }
      }
    } catch {
      // Ignore
    }
  }
}

class OSKeychainVault implements CredentialVault {
  private service = "RIDE";

  async get(key: string): Promise<string | null> {
    try {
      const { execSync } = await import("node:child_process");
      
      if (process.platform === "darwin") {
        const result = execSync(
          `security find-generic-password -a ${process.env.USER} -s "${this.service}:${key}" -w`,
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
        ).trim();
        return result || null;
      }
      
      if (process.platform === "win32") {
        const result = execSync(
          `powershell -Command "[System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR((Get-Credential -UserName '${process.env.USERNAME}' -Message '${this.service}:${key}' -ErrorAction SilentlyContinue).Password))"`,
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
        ).trim();
        return result || null;
      }
      
      if (process.platform === "linux") {
        const result = execSync(
          `secret-tool lookup service "${this.service}" key "${key}"`,
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
        ).trim();
        return result || null;
      }
    } catch {
      // OS keychain not available or key not found
    }
    
    return null;
  }

  async set(key: string, value: string, metadata: Record<string, unknown> = {}): Promise<void> {
    try {
      const { execSync } = await import("node:child_process");
      
      if (process.platform === "darwin") {
        execSync(
          `security add-generic-password -a ${process.env.USER} -s "${this.service}:${key}" -w "${value}" -U`,
          { stdio: "ignore" }
        );
        return;
      }
      
      if (process.platform === "win32") {
        // Windows Credential Manager via PowerShell
        execSync(
          `powershell -Command "$cred = New-Object System.Management.Automation.PSCredential('${process.env.USERNAME}', (ConvertTo-SecureString '${value}' -AsPlainText -Force)); $cred | Export-Clixml -Path \"$env:APPDATA\\RIDE\\credentials\\${key}.xml\" -Force"`,
          { stdio: "ignore" }
        );
        return;
      }
      
      if (process.platform === "linux") {
        execSync(
          `secret-tool store --label="RIDE ${key}" service "${this.service}" key "${key}" <<< "${value}"`,
          { stdio: "ignore" }
        );
        return;
      }
    } catch (error) {
      console.warn(`[CredentialVault] OS keychain unavailable, falling back to encrypted storage:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const { execSync } = await import("node:child_process");
      
      if (process.platform === "darwin") {
        execSync(
          `security delete-generic-password -a ${process.env.USER} -s "${this.service}:${key}"`,
          { stdio: "ignore" }
        );
        return;
      }
      
      if (process.platform === "win32") {
        execSync(
          `powershell -Command "Remove-Item -Path \"$env:APPDATA\\RIDE\\credentials\\${key}.xml\" -ErrorAction SilentlyContinue"`,
          { stdio: "ignore" }
        );
        return;
      }
      
      if (process.platform === "linux") {
        execSync(
          `secret-tool clear service "${this.service}" key "${key}"`,
          { stdio: "ignore" }
        );
        return;
      }
    } catch {
      // Ignore
    }
  }

  async list(): Promise<StoredCredential[]> {
    // OS keychain doesn't support listing easily
    return [];
  }

  async clear(): Promise<void> {
    // Not implemented for OS keychain
  }
}

export class CredentialService {
  private vault: CredentialVault;
  private useOSKeychain: boolean;

  constructor() {
    this.useOSKeychain = safeStorage.isEncryptionAvailable();
    this.vault = this.useOSKeychain ? new OSKeychainVault() : new ElectronCredentialVault();
  }

  async get(key: string): Promise<string | null> {
    return this.vault.get(key);
  }

  async set(key: string, value: string, metadata?: Record<string, unknown>): Promise<void> {
    return this.vault.set(key, value, metadata);
  }

  async delete(key: string): Promise<void> {
    return this.vault.delete(key);
  }

  async list(): Promise<StoredCredential[]> {
    return this.vault.list();
  }

  async testConnection(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null && value.length > 0;
  }

  getVaultType(): "os" | "electron" {
    return this.useOSKeychain ? "os" : "electron";
  }

  async clear(): Promise<void> {
    await this.vault.clear();
  }
}

export const credentialService = new CredentialService();