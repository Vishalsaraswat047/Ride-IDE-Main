import { useEffect, useState } from "react";
import { Download, KeyRound, Link2, Loader2, LogOut, RefreshCw, ShieldCheck, Trash2, Unlink } from "lucide-react";
import type { UserAccount } from "@ride/contracts";
import { useAccountData, useAuth } from "../lib/hooks";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hairline py-2.5 last:border-0">
      <div>
        <div className="text-xs text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-mute">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "h-7 w-56 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body outline-none ride-focus-ring";
const btnCls =
  "h-7 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";
const primaryBtnCls =
  "h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";

export function AccountPane({ onOpenAuth }: { onOpenAuth: () => void }) {
  const auth = useAuth();
  const account = useAccountData();
  const [tab, setTab] = useState<"profile" | "security" | "connections" | "privacy" | "data">("profile");

  const [draft, setDraft] = useState({ displayName: "", username: "", bio: "", country: "", timezone: "", language: "", avatarUrl: "" });
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [twoFa, setTwoFa] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFaToken, setTwoFaToken] = useState("");
  const [sessions, setSessions] = useState<import("@ride/contracts").AuthSession[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [privacyDraft, setPrivacyDraft] = useState<import("@ride/contracts").PrivacyData | null>(null);
  const [connectPrompt, setConnectPrompt] = useState(false);
  const [connectEmail, setConnectEmail] = useState("");

  useEffect(() => {
    if (account.privacy) setPrivacyDraft({ ...account.privacy });
  }, [account.privacy]);

  useEffect(() => {
    if (!auth.user) return;
    void account.refresh();
    void window.ride.auth.getSessions().then(setSessions).catch(() => undefined);
    const p = account.profile;
    if (p) setDraft({ displayName: p.displayName, username: p.username ?? "", bio: p.bio ?? "", country: p.country ?? "", timezone: p.timezone ?? "", language: p.language ?? "", avatarUrl: p.avatarUrl ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, account.profile?.displayName]);

  if (auth.loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-mute">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-canvas-soft">
          <ShieldCheck className="h-5 w-5 text-link" />
        </div>
        <div>
          <div className="text-sm font-medium text-ink">Not signed in</div>
          <p className="mx-auto mt-1 max-w-xs text-[11px] leading-4 text-mute">
            Sign in to manage your profile, connected accounts, security and data exports. Sessions are stored
            locally in the RIDE credential vault.
          </p>
        </div>
        <button onClick={onOpenAuth} className={primaryBtnCls + " h-8 px-3"}>
          Sign in
        </button>
      </div>
    );
  }

  const user: UserAccount = auth.user;

  const saveProfile = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await window.ride.account.saveProfile(draft as Record<string, unknown>);
      await account.refresh();
      setMsg({ kind: "ok", text: "Profile saved." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (pwd.next.length < 8) {
      setMsg({ kind: "err", text: "New password must be at least 8 characters." });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setMsg({ kind: "err", text: "Passwords do not match." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await window.ride.auth.changePassword(pwd.current, pwd.next);
      if (!r.success) throw new Error(r.error ?? "Password change failed");
      setPwd({ current: "", next: "", confirm: "" });
      setMsg({ kind: "ok", text: "Password updated." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const enable2FA = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await window.ride.auth.enableTwoFactor();
      if (!r) throw new Error("Two-factor setup failed");
      setTwoFa(r);
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const confirm2FA = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = await window.ride.auth.verifyTwoFactor(twoFaToken.trim());
      if (!ok) throw new Error("Wrong code — try again.");
      setTwoFa(null);
      setTwoFaToken("");
      setMsg({ kind: "ok", text: "Two-factor authentication enabled." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const savePrivacy = async () => {
    if (!privacyDraft) return;
    setBusy(true);
    setMsg(null);
    try {
      await window.ride.account.savePrivacy(privacyDraft as Record<string, unknown>);
      setMsg({ kind: "ok", text: "Privacy preferences saved." });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const exportData = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const data = await window.ride.account.exportData();
      setExported(JSON.stringify(data, null, 2));
      setMsg({ kind: "ok", text: "Export ready — saving a copy to disk…" });
      await window.ride.account.downloadSettings();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirm.trim() !== user.email) {
      setMsg({ kind: "err", text: "Type your email exactly to confirm deletion." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const ok = await window.ride.account.deleteAccount(deleteConfirm);
      if (!ok) throw new Error("Account deletion failed");
      await auth.logout();
      auth.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
      setBusy(false);
    }
  };

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "connections", label: "Connected accounts" },
    { id: "privacy", label: "Privacy" },
    { id: "data", label: "Data & deletion" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-1 py-1.5">
        <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-hairline bg-canvas-soft">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[11px] font-semibold text-link">{(user.displayName || user.email)[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="ml-1.5 min-w-0">
          <div className="truncate text-xs font-medium text-ink">{user.displayName || user.email}</div>
          <div className="truncate text-[10px] text-mute">{user.email}</div>
        </div>
        <button onClick={() => void auth.logout()} className={btnCls + " ml-auto flex items-center gap-1"} title="Sign out">
          <LogOut className="h-3 w-3" /> Sign out
        </button>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-hairline px-2 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-6 rounded-sm px-2.5 text-[11px] transition-colors ${
              tab === t.id ? "bg-canvas-soft-2 font-medium text-ink" : "text-mute hover:text-body"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {msg && (
          <div className={`mb-3 rounded-sm border px-3 py-2 text-[11px] ${msg.kind === "ok" ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error"}`}>
            {msg.text}
          </div>
        )}

        {tab === "profile" && (
          <div>
            <Row label="Display name" hint="Shown in collaboration, exports and commit metadata">
              <input className={inputCls} value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} placeholder="Your name" />
            </Row>
            <Row label="Username" hint="Optional handle, defaults to the email local part">
              <input className={inputCls} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} placeholder="@handle" />
            </Row>
            <Row label="Bio">
              <input className={inputCls} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="A few words about you" />
            </Row>
            <Row label="Avatar URL">
              <input className={inputCls} value={draft.avatarUrl} onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })} placeholder="https://…" />
            </Row>
            <Row label="Country">
              <input className={inputCls} value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} placeholder="Country / region" />
            </Row>
            <Row label="Timezone">
              <input className={inputCls} value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} placeholder="e.g. UTC+2" />
            </Row>
            <Row label="Language">
              <input className={inputCls} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })} placeholder="English" />
            </Row>
            <div className="pt-3">
              <button onClick={saveProfile} disabled={busy} className={primaryBtnCls}>
                {busy ? "Saving…" : "Save profile"}
              </button>
            </div>
          </div>
        )}

        {tab === "security" && (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold text-mute uppercase">Password</div>
            <Row label="Current password">
              <input type="password" className={inputCls} value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} placeholder="••••••••" />
            </Row>
            <Row label="New password" hint="At least 8 characters">
              <input type="password" className={inputCls} value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="••••••••" />
            </Row>
            <Row label="Confirm new password">
              <input type="password" className={inputCls} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="••••••••" />
            </Row>
            <div className="pt-3 pb-4">
              <button onClick={changePassword} disabled={busy} className={primaryBtnCls}>
                Update password
              </button>
            </div>

            <div className="mb-1.5 text-[11px] font-semibold text-mute uppercase">Two-factor authentication</div>
            {twoFa ? (
              <div className="rounded-md border border-hairline bg-canvas-soft p-3">
                <div className="text-xs font-medium text-ink">Scan the QR code with your authenticator app</div>
                {twoFa.qrCode ? (
                  <img src={twoFa.qrCode} alt="2FA setup QR code" className="mt-2 h-36 w-36 rounded-sm border border-hairline bg-white" />
                ) : (
                  <code className="mt-2 block break-all rounded-sm border border-hairline bg-canvas px-2 py-1.5 font-mono text-[11px] text-ink">{twoFa.secret}</code>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <input className={inputCls} value={twoFaToken} onChange={(e) => setTwoFaToken(e.target.value)} placeholder="6-digit code" />
                  <button onClick={confirm2FA} disabled={busy} className={primaryBtnCls}>
                    Verify & enable
                  </button>
                </div>
              </div>
            ) : (
              <Row label="Authenticator app" hint={user.twoFactorEnabled ? "Two-factor is currently enabled" : "Protect your account with time-based codes"}>
                <button onClick={enable2FA} disabled={busy} className={btnCls + " flex items-center gap-1"}>
                  <KeyRound className="h-3 w-3" /> {user.twoFactorEnabled ? "Regenerate setup" : "Set up 2FA"}
                </button>
              </Row>
            )}

            <div className="mb-1.5 mt-4 text-[11px] font-semibold text-mute uppercase">Active sessions</div>
            <div className="overflow-hidden rounded-md border border-hairline">
              {sessions.length === 0 && <div className="px-3 py-2 text-[11px] text-mute">No other sessions.</div>}
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-t border-hairline px-3 py-1.5 text-xs first:border-0">
                  <div>
                    <div className="text-body">{s.deviceInfo?.name ?? "This device"}</div>
                    <div className="text-[10px] text-mute">
                      {s.createdAt ? new Date(s.createdAt).toLocaleString() : ""} · {s.deviceInfo?.browser ?? "unknown client"}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await window.ride.auth.revokeSession(s.id);
                      if (ok) await window.ride.auth.getSessions().then(setSessions);
                    }}
                    className="text-[11px] text-mute hover:text-error"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "connections" && (
          <div className="flex flex-col gap-2">
            {account.connected.length === 0 && (
              <div className="rounded-md border border-hairline bg-canvas-soft px-3 py-4 text-center text-[11px] text-mute">
                No connected accounts. Connect GitHub, Google or GitLab to auto-fill identity and SSH keys.
              </div>
            )}
            {account.connected.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-hairline px-3 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas-soft">
                    <Link2 className="h-3.5 w-3.5 text-link" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium text-ink">{c.provider}</div>
                    <div className="truncate text-[10px] text-mute">{c.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.scopes.length > 0 && <span className="hidden text-[10px] text-mute sm:block">{c.scopes.join(", ")}</span>}
                  <button onClick={() => void window.ride.account.disconnectAccount(c.id).then(() => account.refresh())} className={btnCls + " flex items-center gap-1"}>
                    <Unlink className="h-3 w-3" /> Disconnect
                  </button>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <button
                onClick={() => {
                  setConnectEmail(user.email);
                  setConnectPrompt(true);
                }}
                disabled={busy || account.connected.some((c) => c.provider.toLowerCase().includes("github"))}
                className={btnCls + " flex items-center gap-1.5"}
              >
                <Link2 className="h-3 w-3" /> Connect GitHub
              </button>
              {connectPrompt && (
                <div className="mt-2 rounded-md border border-hairline bg-canvas-soft p-3">
                  <div className="text-xs font-medium text-ink">Link your GitHub account</div>
                  <p className="mt-1 text-[11px] leading-4 text-mute">
                    Local-first linking: RIDE stores the identity email you provide here. No OAuth traffic leaves your
                    machine.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input className={inputCls + " flex-1"} value={connectEmail} onChange={(e) => setConnectEmail(e.target.value)} placeholder="github email" />
                    <button
                      onClick={async () => {
                        setBusy(true);
                        setMsg(null);
                        try {
                          const r = await window.ride.account.connectAccount("github", connectEmail.trim() || undefined);
                          if (!r) throw new Error("Connect failed");
                          await account.refresh();
                          setConnectPrompt(false);
                          setMsg({ kind: "ok", text: `Connected ${r.email}.` });
                        } catch (e) {
                          setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy || !connectEmail.trim()}
                      className={primaryBtnCls}
                    >
                      Link account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "privacy" && privacyDraft && (
          <div>
            {(
              [
                ["telemetry", "Send anonymous crash & usage telemetry"],
                ["crashReports", "Share crash reports with RIDE"],
                ["usageAnalytics", "Usage analytics"],
                ["aiInteractionData", "Allow AI interaction data for model improvements"],
                ["codeIndexing", "Index code locally for AI features"],
                ["cloudSync", "Sync data to RIDE Cloud"],
              ] as const
            ).map(([key, label]) => (
              <Row key={key} label={label}>
                <button
                  role="switch"
                  aria-checked={Boolean(privacyDraft[key])}
                  onClick={() => setPrivacyDraft({ ...privacyDraft, [key]: !privacyDraft[key] })}
                  className={`h-5 w-9 shrink-0 rounded-full border transition-colors ${
                    privacyDraft[key] ? "border-link bg-link" : "border-hairline-strong bg-canvas-soft-2"
                  }`}
                >
                  <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${privacyDraft[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </Row>
            ))}
            <div className="pt-3">
              <button onClick={savePrivacy} disabled={busy} className={primaryBtnCls}>
                Save privacy preferences
              </button>
            </div>
          </div>
        )}

        {tab === "data" && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-hairline bg-canvas-soft p-3">
              <div className="text-xs font-medium text-ink">Export all your data</div>
              <p className="mt-1 text-[11px] leading-4 text-mute">
                Downloads a JSON archive of your profile, privacy preferences, connected accounts and settings, then
                saves it to disk.
              </p>
              <button onClick={exportData} disabled={busy} className={btnCls + " mt-2 flex items-center gap-1.5"}>
                <Download className="h-3 w-3" /> Export & download
              </button>
              {exported && (
                <pre className="mt-2 max-h-40 overflow-auto rounded-sm border border-hairline bg-canvas p-2 font-mono text-[10px] text-body">
                  {exported.slice(0, 4000)}
                </pre>
              )}
            </div>

            <div className="rounded-md border border-error/30 bg-error/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-error">
                <Trash2 className="h-3.5 w-3.5" /> Delete account
              </div>
              <p className="mt-1 text-[11px] leading-4 text-mute">
                Permanently removes your local RIDE account, sessions and persisted profile data. This cannot be
                undone.
              </p>
              <input
                className={inputCls + " mt-2 w-full"}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={`Type ${user.email} to confirm`}
              />
              <button
                onClick={deleteAccount}
                disabled={busy || deleteConfirm.trim() !== user.email}
                className="mt-2 flex h-7 items-center gap-1.5 rounded-sm border border-error/40 bg-error/10 px-2.5 text-xs text-error transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring"
              >
                <RefreshCw className="h-3 w-3" /> Delete my account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}