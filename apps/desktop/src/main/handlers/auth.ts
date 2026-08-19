import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import { authService } from "../services/auth";
import { accountService } from "../services/account";
import { sendToRenderer } from "../index";

export function wireAuthBroadcasts(): void {
  authService.on("login", (payload) => sendToRenderer(IpcChannel.auth.authChanged, { type: "login", ...payload }));
  authService.on("logout", (payload) => sendToRenderer(IpcChannel.auth.authChanged, { type: "logout", ...payload }));
  authService.on("signup", (payload) => sendToRenderer(IpcChannel.auth.authChanged, { type: "signup", ...payload }));
  authService.on("profileUpdated", (payload) => sendToRenderer(IpcChannel.auth.authChanged, { type: "profile-updated", ...payload }));
  authService.on("sessionRefreshed", (payload) => sendToRenderer(IpcChannel.auth.authChanged, { type: "session-refreshed", ...payload }));
  authService.on("sessionRevoked", (payload) => sendToRenderer(IpcChannel.auth.authChanged, { type: "session-revoked", ...payload }));
}

export function registerAuthHandlers(): void {
  wireAuthBroadcasts();

  ipcMain.handle(IpcChannel.auth.getProviders, () => authService.getProviders());

  ipcMain.handle(IpcChannel.auth.configureProvider, async (_e, id: string, config: Record<string, unknown>) => {
    return authService.configureProvider(id, config);
  });

  ipcMain.handle(IpcChannel.auth.login, (_e, credentials: { email: string; password: string }) =>
    authService.login(credentials),
  );

  ipcMain.handle(IpcChannel.auth.signup, (_e, data: { email: string; password: string; displayName: string; username?: string }) =>
    authService.signup(data),
  );

  ipcMain.handle(IpcChannel.auth.logout, () => authService.logout());

  ipcMain.handle(IpcChannel.auth.logoutAll, () => authService.logoutAllDevices());

  ipcMain.handle(IpcChannel.auth.requestPasswordReset, (_e, request: { email: string }) =>
    authService.requestPasswordReset(request),
  );

  ipcMain.handle(IpcChannel.auth.confirmPasswordReset, (_e, confirm: { token: string; newPassword: string }) =>
    authService.confirmPasswordReset(confirm),
  );

  ipcMain.handle(IpcChannel.auth.verifyEmail, (_e, token: string) => authService.verifyEmail(token));

  ipcMain.handle(IpcChannel.auth.getCurrentUser, () => authService.getCurrentUser());

  ipcMain.handle(IpcChannel.auth.getSession, () => authService.getCurrentSession());

  ipcMain.handle(IpcChannel.auth.getSessions, () => authService.getSessions());

  ipcMain.handle(IpcChannel.auth.revokeSession, (_e, sessionId: string) => authService.revokeSession(sessionId));

  ipcMain.handle(IpcChannel.auth.updateProfile, (_e, updates: Record<string, unknown>) =>
    authService.updateProfile(updates),
  );

  ipcMain.handle(IpcChannel.auth.changePassword, (_e, current: string, next: string) =>
    authService.changePassword(current, next),
  );



ipcMain.handle(IpcChannel.auth.refreshSession, () => authService.refreshSession());

  ipcMain.handle(IpcChannel.auth.oauthBegin, (_e, providerId: string) => authService.beginOAuth(providerId));

  ipcMain.handle(IpcChannel.auth.oauthPoll, (_e, providerId: string) => authService.pollOAuth(providerId));

  ipcMain.handle(IpcChannel.auth.getCurrentPlanName, () => authService.getCurrentPlanName());

  ipcMain.handle(IpcChannel.auth.getCurrentBillingPlan, () => authService.getCurrentBillingPlan());

  // Account services
  ipcMain.handle(IpcChannel.account.getProfile, () => accountService.getProfile());
  ipcMain.handle(IpcChannel.account.saveProfile, (_e, profile: Record<string, unknown>) => accountService.saveProfile(profile));
  ipcMain.handle(IpcChannel.account.getPrivacy, () => accountService.getPrivacy());
  ipcMain.handle(IpcChannel.account.savePrivacy, (_e, privacy: Record<string, unknown>) => accountService.savePrivacy(privacy));
  ipcMain.handle(IpcChannel.account.getSecurity, () => accountService.getSecuritySettings());
  ipcMain.handle(IpcChannel.account.getConnectedAccounts, () => accountService.getConnectedAccounts());
  ipcMain.handle(IpcChannel.account.connectAccount, (_e, provider: string, email?: string, username?: string) =>
    accountService.connectAccount(provider, email, username),
  );
  ipcMain.handle(IpcChannel.account.disconnectAccount, (_e, accountId: string) => accountService.disconnectAccount(accountId));
  ipcMain.handle(IpcChannel.account.exportData, () => accountService.exportAccountData());
  ipcMain.handle(IpcChannel.account.downloadSettings, () => accountService.downloadSettings());
  ipcMain.handle(IpcChannel.account.deleteAccount, (_e, confirmation: string) => accountService.deleteAccount(confirmation));
}

