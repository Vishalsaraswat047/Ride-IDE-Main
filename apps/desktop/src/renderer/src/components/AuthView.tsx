import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, KeyRound, Loader2, Lock, Mail, ShieldCheck, UserRound, X } from "lucide-react";
import rideLogo from "../assets/ride-logo.png";
import { useAuth } from "../lib/hooks";

type Mode = "signin" | "signup" | "forgot" | "reset" | "verify";

interface OAuthState {
  providerId: string;
  verificationUrl: string;
  userCode: string;
  interval: number;
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Field({
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-9 w-full rounded-md border border-hairline bg-canvas pr-3 pl-8 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
      />
    </div>
  );
}

const inputCls = "h-9 w-full rounded-md border border-hairline bg-canvas px-3 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring";

export function AuthView({ onDone }: { onDone?: () => void }) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeCode, setNoticeCode] = useState<string | null>(null);
  const [oauth, setOauth] = useState<OAuthState | null>(null);
  const [clientId, setClientId] = useState("");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const oauthProviders = auth.providers.filter((p) => p.type === "oauth");

  useEffect(() => {
    if (!oauth) return;
    const tick = async () => {
      const result = await auth.oauthPoll(oauth.providerId);
      if (result.status === "success") {
        setOauth(null);
        onDone?.();
        return;
      }
      if (result.status === "pending") {
        pollTimer.current = setTimeout(tick, oauth.interval * 1000);
        return;
      }
      setOauthError(result.error ?? "Authorization failed.");
      setOauth(null);
    };
    pollTimer.current = setTimeout(tick, 2000);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [oauth]);

  const cancelOAuth = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setOauth(null);
  };

  const startOAuth = async (providerId: string) => {
    setError(null);
    setOauthError(null);
    const flow = await auth.oauthBegin(providerId);
    if (!flow.success) {
      setOauthError(flow.error ?? "OAuth setup failed.");
      return;
    }
    setOauth({
      providerId,
      verificationUrl: flow.verificationUrl ?? "",
      userCode: flow.userCode ?? "",
      interval: flow.interval ?? 5,
    });
  };

  const saveClientId = async (providerId: string) => {
    setError(null);
    const trimmed = clientId.trim();
    if (!trimmed) {
      setError("Enter your OAuth client ID.");
      return;
    }
    const provider = await window.ride.auth.configureProvider(providerId, { clientId: trimmed });
    if (!provider) {
      setError("Could not save the client ID.");
      return;
    }
    setClientId("");
    setOauthError(null);
    setNotice(`Client ID saved for ${provider.displayName}. Continue to sign in.`);
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      if (!displayName.trim()) {
        setError("Display name is required.");
        return;
      }
      void run(async () => {
        const r = await auth.signup({ email: email.trim(), password, displayName: displayName.trim(), username: username.trim() || undefined });
        if (!r.success) throw new Error(r.error ?? "Sign-up failed");
        if (r.requiresVerification) {
          setMode("verify");
          setNotice("Account created. Enter the verification code below to activate it.");
          setNoticeCode(r.code ?? null);
        } else {
          setNotice("Account created — you're signed in.");
          setNoticeCode(null);
          onDone?.();
        }
      });
      return;
    }
    if (mode === "forgot") {
      void run(async () => {
        const r = await auth.requestPasswordReset(email.trim());
        if (!r.success) throw new Error(r.error ?? "Request failed");
        setMode("reset");
        setNotice("Reset code generated for this device.");
        setNoticeCode(r.code ?? null);
      });
      return;
    }
    if (mode === "reset") {
      if (!token.trim()) {
        setError("Enter the reset code from your email.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      void run(async () => {
        const r = await auth.confirmPasswordReset(token.trim(), password);
        if (!r.success) throw new Error(r.error ?? "Reset failed");
        setMode("signin");
        setNotice("Password updated. Sign in with your new password.");
        setToken("");
        setPassword("");
        setConfirm("");
      });
      return;
    }
    if (mode === "verify") {
      if (!token.trim()) {
        setError("Enter the verification code from your email.");
        return;
      }
      void run(async () => {
        const r = await auth.verifyEmail(token.trim());
        if (!r.success) throw new Error(r.error ?? "Verification failed");
        setMode("signin");
        setNotice("Email verified. You can sign in now.");
        setToken("");
      });
      return;
    }
    void run(async () => {
      const r = await auth.login(email.trim(), password);
      if (!r.success) throw new Error(r.error ?? "Sign-in failed");
      onDone?.();
    });
  };

  const back = () => {
    setError(null);
    setNotice(null);
    setMode(mode === "signup" || mode === "forgot" ? "signin" : mode === "reset" ? "forgot" : mode === "verify" ? "signup" : "signin");
  };

  const emailProvider = auth.providers.find((p) => p.type === "email");

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto bg-canvas p-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src={rideLogo} alt="RIDE" className="mx-auto h-12 w-12 rounded-lg ring-1 ring-hairline shadow-level-3" />
          <h1 className="mt-3 font-mono text-lg font-bold text-ink">RIDE</h1>
          <p className="mt-1 text-[11px] text-mute">
            {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : mode === "reset" ? "Choose a new password" : mode === "verify" ? "Verify your email" : "Sign in to sync & personalize"}
          </p>
        </div>

        <div className="rounded-lg border border-hairline bg-canvas-soft/60 p-5 shadow-level-3">
          {mode === "signin" && (
            <div className="mb-4 flex rounded-md border border-hairline bg-canvas p-0.5 text-center text-[11px]">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={`h-7 flex-1 rounded-sm transition-colors ${mode === m ? "bg-canvas-soft-2 font-medium text-ink" : "text-mute hover:text-body"}`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>
          )}

          {mode === "signin" && (
            <div className="space-y-2.5">
              <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
              <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Password" />
              <label className="flex items-center justify-between text-[11px]">
                <span className="text-mute">
                  {auth.providers.length > 0 && emailProvider ? `Sign in with ${emailProvider.name ?? "email & password"}` : "Email & password"}
                </span>
                <button onClick={back} className="text-link hover:underline">
                  Forgot password?
                </button>
              </label>
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-2.5">
              <Field icon={UserRound} value={displayName} onChange={setDisplayName} placeholder="Display name" autoFocus />
              <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              <Field icon={KeyRound} value={username} onChange={setUsername} placeholder="Username (optional)" />
              <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder="Password (min 8 chars)" />
              <Field icon={ShieldCheck} type="password" value={confirm} onChange={setConfirm} placeholder="Confirm password" />
            </div>
          )}

          {mode === "forgot" && (
            <div className="space-y-2.5">
              <div className="rounded-sm border border-hairline bg-canvas px-3 py-2 text-[11px] leading-4 text-mute">
                Enter your email and we'll send a one-time reset code. Codes are stored locally and verified by RIDE.
              </div>
              <Field icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
            </div>
          )}

          {mode === "reset" && (
            <div className="space-y-2.5">
              <Field icon={KeyRound} value={token} onChange={setToken} placeholder="Reset code from email" autoFocus />
              <Field icon={Lock} type="password" value={password} onChange={setPassword} placeholder="New password (min 8 chars)" />
              <Field icon={ShieldCheck} type="password" value={confirm} onChange={setConfirm} placeholder="Confirm new password" />
            </div>
          )}

          {mode === "verify" && (
            <div className="space-y-2.5">
              <div className="rounded-sm border border-hairline bg-canvas px-3 py-2 text-[11px] leading-4 text-mute">
                We sent a verification code to <span className="font-medium text-body">{email || "your email"}</span>. Enter it below to activate your account.
              </div>
              <Field icon={KeyRound} value={token} onChange={setToken} placeholder="Verification code" autoFocus />
              <button onClick={() => void run(async () => auth.requestPasswordReset(email.trim()))} className="text-left text-[11px] text-link hover:underline">
                Resend code
              </button>
            </div>
          )}

          {error && <div className="mt-3 rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-[11px] text-error">{error}</div>}
          {notice && (
            <div className="mt-3 rounded-sm border border-success/30 bg-success/10 px-3 py-2 text-[11px] text-success">
              {notice}
              {noticeCode && (
                <span className="mt-1.5 block font-mono text-sm font-semibold tracking-widest text-success">{noticeCode}</span>
              )}
            </div>
          )}

          {!oauth && (mode === "signin" || mode === "signup") && oauthProviders.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-mute">
                <span className="h-px flex-1 bg-hairline" /> or continue with <span className="h-px flex-1 bg-hairline" />
              </div>
              <div className="mt-2.5 space-y-2">
                {oauthProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => void startOAuth(p.id)}
                    disabled={busy}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-hairline bg-canvas text-xs font-medium text-ink transition-colors hover:bg-canvas-soft disabled:opacity-40 ride-focus-ring"
                  >
                    {p.id === "google" ? <GoogleGlyph /> : <UserRound className="h-3.5 w-3.5 text-mute" />}
                    Continue with {p.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {oauthError && (
            <div className="mt-3 space-y-2 rounded-sm border border-error/30 bg-error/10 px-3 py-2 text-[11px] text-error">
              <div>{oauthError}</div>
              {oauthError.toLowerCase().includes("not configured") && (
                <>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Paste your Google OAuth client ID"
                    className="h-8 w-full rounded-md border border-hairline bg-canvas px-2.5 text-[11px] text-ink outline-none placeholder:text-mute ride-focus-ring"
                  />
                  <button
                    onClick={() => void saveClientId("google")}
                    className="h-7 rounded-md border border-hairline bg-canvas-soft px-3 text-[11px] font-medium text-ink transition-colors hover:bg-canvas-soft-2 ride-focus-ring"
                  >
                    Save client ID
                  </button>
                </>
              )}
            </div>
          )}

          {oauth && (
            <div className="mt-3 rounded-sm border border-hairline bg-canvas px-3 py-3 text-center">
              <p className="text-[11px] text-mute">Authorize RIDE in your browser</p>
              {oauth.verificationUrl && (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    void window.ride.app.openExternal(oauth.verificationUrl);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-link hover:underline"
                >
                  Open {oauth.verificationUrl} <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <p className="mt-2 text-[10px] uppercase tracking-wide text-mute">and enter this code</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-[0.2em] text-ink">{oauth.userCode}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-mute">
                <Loader2 className="h-3 w-3 animate-spin" /> Waiting for authorization…
              </p>
              <button
                onClick={cancelOAuth}
                className="mt-2 flex h-6 items-center gap-1 text-[10px] text-mute hover:text-body ride-focus-ring"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset code" : mode === "reset" ? "Update password" : "Verify email"}
          </button>

          {mode !== "signin" && (
            <button onClick={back} className="mt-3 flex h-7 items-center gap-1.5 text-[11px] text-mute hover:text-body ride-focus-ring">
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] leading-4 text-mute">
          Your session is stored locally in the RIDE credential vault (OS keychain when available).{" "}
          {!!emailProvider && <>Two-factor and passkeys can be enabled from Security after sign-in.</>}
        </p>
      </div>
    </div>
  );
}