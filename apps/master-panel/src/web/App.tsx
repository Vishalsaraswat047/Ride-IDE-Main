import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { api } from "./api";
import { useHashRoute } from "./ui";
import { Shell } from "./Shell";
import { DashboardPage } from "./pages/Dashboard";
import { UsersPage } from "./pages/Users";
import { VerificationPage } from "./pages/Verification";
import { LoginsPage } from "./pages/Logins";
import { ProjectsPage } from "./pages/Projects";
import { AIPage } from "./pages/AI";
import { TransactionsPage } from "./pages/Transactions";
import { PlansPage } from "./pages/Plans";
import { ShipmentsPage } from "./pages/Shipments";
import { DeploymentsPage } from "./pages/Deployments";
import { HostingPage, DomainsPage } from "./pages/Hosting";
import { MarketplacePage } from "./pages/Marketplace";
import { AnalyticsPage } from "./pages/Analytics";
import { FeedbackPage } from "./pages/Feedback";
import { ReleasesPage, DownloadsPage } from "./pages/Releases";
import { HealthPage } from "./pages/Health";
import { CommunicationsPage } from "./pages/Communications";
import { AuditPage } from "./pages/Audit";
import { SettingsPage } from "./pages/Settings";

const ROUTES: Record<string, () => ReactNode> = {
  dashboard: DashboardPage,
  users: UsersPage,
  verification: VerificationPage,
  logins: LoginsPage,
  projects: ProjectsPage,
  ai: AIPage,
  transactions: TransactionsPage,
  plans: PlansPage,
  shipments: ShipmentsPage,
  deployments: DeploymentsPage,
  hosting: HostingPage,
  domains: DomainsPage,
  marketplace: MarketplacePage,
  creators: MarketplacePage,
  wallets: MarketplacePage,
  analytics: AnalyticsPage,
  feedback: FeedbackPage,
  releases: ReleasesPage,
  downloads: DownloadsPage,
  health: HealthPage,
  communications: CommunicationsPage,
  audit: AuditPage,
  settings: SettingsPage,
};

type AuthState = "loading" | "login" | "app";

export function App(): ReactNode {
  const [auth, setAuth] = useState<AuthState>("loading");
  const route = useHashRoute();
  const top = (route.split("/")[0] ?? "dashboard") as keyof typeof ROUTES;
  const Page = ROUTES[top] ?? DashboardPage;

  useEffect(() => {
    void api
      .get("/api/master/auth/me")
      .then(() => setAuth("app"))
      .catch(() => setAuth("login"));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setAuth("login");
    window.addEventListener("ride-master:unauthorized", onUnauthorized);
    return () => window.removeEventListener("ride-master:unauthorized", onUnauthorized);
  }, []);

  if (auth === "loading") {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-mute">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-[12px]">Checking admin session…</span>
      </div>
    );
  }

  if (auth === "login") return <LoginScreen onDone={() => setAuth("app")} />;

  return (
    <Shell route={route} onLogout={() => void doLogout(() => setAuth("login"))}>
      <Page />
    </Shell>
  );
}

async function doLogout(onDone: () => void): Promise<void> {
  try {
    await api.post("/api/master/auth/logout");
  } catch {
    /* session already gone */
  }
  onDone();
}

function LoginScreen({ onDone }: { onDone: () => void }): ReactNode {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/api/master/auth/login", { email, password });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[340px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-ember/30 to-brand-magenta/25 text-[18px] font-bold text-ember ring-1 ring-ember/25">
            R
          </span>
          <div>
            <h1 className="text-[18px] font-semibold text-ink">RIDE Master Panel</h1>
            <p className="mt-0.5 text-[12px] text-mute">Business control center · admin access only</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-xl border border-hairline bg-canvas-soft p-5">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-mute">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="mb-3 h-9 w-full rounded-md border border-hairline bg-canvas-soft2 px-3 text-[13px] text-ink placeholder:text-mute focus:border-hairline-strong"
            placeholder="admin@ride.local"
          />
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-mute">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mb-4 h-9 w-full rounded-md border border-hairline bg-canvas-soft2 px-3 text-[13px] text-ink placeholder:text-mute focus:border-hairline-strong"
            placeholder="••••••••"
          />
          {error && <p className="mb-3 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-[12px] text-error">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-[13px] font-semibold text-on-primary transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Sign in
          </button>
        </form>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-mute">
          <ShieldCheck className="h-3.5 w-3.5" />
          Credentials are printed to the terminal on first run. Sessions expire after 12 hours.
        </p>
      </div>
    </div>
  );
}