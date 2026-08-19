import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  Globe,
  Key,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  Unplug,
  Wifi,
  XCircle,
} from "lucide-react";
import type {
  HostingerDNSZone,
  HostingerDeployment,
  HostingerDomain,
  HostingerNodeJSBuild,
  HostingerWebsite,
  MyDashboardData,
} from "@ride/contracts";
import type { ShipStatus } from "@ride/contracts";
import { useWorkspace } from "../lib/hooks";

const btnCls = "h-7 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";
const primaryBtnCls = "h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";
const inputCls = "h-7 w-full rounded-sm border border-hairline bg-canvas px-2 text-xs text-ink placeholder:text-mute focus:border-primary ride-focus-ring";
const labelCls = "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-mute";

const REFRESH_MS = 30_000;

type TabId = "overview" | "websites" | "deployments" | "domain";

function statusPill(status: string, okWhen: string[]): React.ReactElement {
  const ok = okWhen.includes(status);
  const cls = ok ? "bg-success/10 text-success" : status === "pending" ? "bg-warning/10 text-warning" : "bg-error/10 text-error";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${cls}`}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : status === "pending" ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {status}
    </span>
  );
}

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statCard(icon: React.ReactNode, label: string, value: number | string): React.ReactElement {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-ember">{icon}</span>
      <div className="min-w-0">
        <p className="text-[16px] font-semibold leading-5 text-ink">{value}</p>
        <p className="truncate text-[10px] leading-3.5 text-mute">{label}</p>
      </div>
    </div>
  );
}

function skeletonCard(icon: React.ReactNode, label: string): React.ReactElement {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mauve/20 text-muted/30 opacity-50 placeholder">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-muted/60 capitalize">{label}</p>
        <p className="text-[11px] text-muted/40 line-through">••••</p>
      </div>
    </div>
  );
}

export function MyDashboard(): React.ReactElement {
  const workspace = useWorkspace();
  const [connected, setConnected] = useState(false);
  const [shipment, setShipment] = useState<ShipStatus>({ shipped: false, shipment: null });
  const [hostingerConnected, setHostingerConnected] = useState(false);
  const [hostingerLoading, setHostingerLoading] = useState(false);
  const [hostingerError, setHostingerError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [data, setData] = useState<MyDashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [dnsZones, setDnsZones] = useState<Record<string, HostingerDNSZone | null>>({});
  const [error, setError] = useState("");
  const busy = useRef(false);

  // Load shipment status first
  const loadShipment = useCallback(async () => {
    try {
      const status = await window.ride.ship.status(workspace.state.root ?? "");
      setShipment(status);
    } catch {
      setShipment({ shipped: false, shipment: null });
    }
  }, [workspace.state.root]);

  // Load Hostinger status
  const loadHostingerStatus = useCallback(async () => {
    setHostingerLoading(true);
    setHostingerError(null);
    try {
      const status = await window.ride.hostinger.getStatus();
      setHostingerConnected(status.connected);
      if (status.connected) {
        const dash = await window.ride.hostinger.getDashboard();
        setData(dash);
        setConnected(dash.connected);
      }
    } catch (e) {
      setHostingerError(e instanceof Error ? e.message : "Failed to load Hostinger status");
    } finally {
      setHostingerLoading(false);
    }
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (busy.current) return;
      busy.current = true;
      if (!silent) setRefreshing(true);
      try {
        if (!shipment.shipped) {
          setError("Ship your project to unlock production analytics, deployments and the dashboard.");
          setData(null);
          setConnected(false);
          return;
        }
        if (!hostingerConnected) {
          setError("Connect your Hostinger account to see live data.");
          setData(null);
          return;
        }
        const d = await window.ride.hostinger.getDashboard();
        setData(d);
        setConnected(d.connected);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        busy.current = false;
        if (!silent) setRefreshing(false);
      }
    },
    [shipment.shipped, hostingerConnected],
  );

  useEffect(() => {
    void loadShipment();
    void loadHostingerStatus();
  }, [loadShipment, loadHostingerStatus]);

  // When shipment changes and is shipped, load hostinger data
  useEffect(() => {
    if (shipment.shipped) {
      void loadHostingerStatus();
    }
  }, [shipment.shipped, loadHostingerStatus]);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => void load(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [connected, load]);

  const connectHostinger = async () => {
    if (!token.trim()) {
      setHostingerError("Enter your Hostinger API token first.");
      return;
    }
    setConnecting(true);
    setHostingerError(null);
    try {
      const r = await window.ride.hostinger.connect(token.trim());
      if (r.connected) {
        setHostingerConnected(true);
        setConnected(true);
        await loadHostingerStatus();
        setToken("");
      } else {
        setHostingerError("Connection failed — check your API token.");
      }
    } catch (e) {
      setHostingerError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setConnecting(true);
    try {
      await window.ride.hostinger.disconnect();
      setConnected(false);
      setHostingerConnected(false);
      setData(null);
      setDnsZones({});
      setSelectedDomain(null);
    } catch (e) {
      setHostingerError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setConnecting(false);
    }
  };

  const toggleDomain = async (domain: string) => {
    const next = selectedDomain === domain ? null : domain;
    setSelectedDomain(next);
    if (!next) return;
    if (dnsZones[next] === undefined) {
      try {
        const zone = await window.ride.hostinger.getDNSZone(next);
        setDnsZones((z) => ({ ...z, [next]: zone }));
      } catch {
        setDnsZones((z) => ({ ...z, [next]: null }));
      }
    }
  };

  const ship = () => {
    window.dispatchEvent(new CustomEvent("ride:open-ship", {
      detail: { projectRoot: workspace.state.root ?? "", projectName: workspace.state.name ?? "RIDE" }
    }));
  };

  // ── State 1: Not shipped → locked dashboard with Connect Hosting + Domain first ──
  if (!shipment.shipped) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-[760px]">
          <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-hairline px-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-critical/10 border border-critical/20">
              <Shield className="h-3.5 w-3.5 text-critical" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-4 text-ink text-critical">My Dashboard</p>
              <p className="truncate text-[10px] leading-3.5 text-mute">Production dashboard — locked</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-semibold text-critical">
              <ShieldCheck className="h-3 w-3" /> Locked
            </span>
          </div>

          <div className="flex flex-col gap-3 p-6">
            {/* Lock card */}
            <div className="rounded-xl border border-critical/20 bg-critical/5 p-6 text-center">
              <div className="h-14 w-14 rounded-xl mx-auto bg-critical/5 flex items-center justify-center mb-4">
                <Shield className="h-7 w-7 text-critical" />
              </div>
              <h3 className="text-lg font-semibold text-critical mb-2">Production Dashboard</h3>
              <p className="text-base text-critical/60 mb-6">
                Ship your project to unlock production analytics, deployments and infrastructure.
              </p>
              <button onClick={ship} className={`${primaryBtnCls} h-9 px-4 text-sm`}>
                Ship for ₹99
              </button>
            </div>

            {/* Connect Hosting card */}
            <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
              <h3 className="font-medium text-body flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Connect Hostinger Hosting
              </h3>
              <p className="text-sm text-mute">
                Link RIDE to your Hostinger hosting to see live website, deployment, domain and DNS data after you
                ship your project. Your API token stays on this device and is only sent to Hostinger's servers.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Key className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-mute" />
                  <input
                    type="password"
                    placeholder="hf_…"
                    className={`${inputCls} pl-7`}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void connectHostinger(); }}
                  />
                </div>
                <button className={primaryBtnCls} disabled={connecting || hostingerLoading} onClick={() => void connectHostinger()}>
                  {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
                </button>
              </div>
              {hostingerError && <p className="text-xs text-error">{hostingerError}</p>}
              <p className="text-xs text-mute">
                Create a token in <a href="https://hpanel.hostinger.com/api" className="text-link hover:underline" target="_blank">hPanel</a>
              </p>
            </div>

            {/* Connect Domain card */}
            <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
              <h3 className="font-medium text-body flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Connect Domain
              </h3>
              <p className="text-sm text-mute">
                Use an existing domain or buy one from Hostinger. RIDE does not control external registrars —
                configure DNS records at your provider.
              </p>
              <div className="flex gap-2">
                <button
                  className={`flex-1 h-10 rounded-lg border font-medium transition-colors bg-canvas text-body border border-hairline hover:bg-canvas-soft`}
                  onClick={() => setSelectedDomain("existing")}
                >
                  Existing Domain
                </button>
                <button
                  className="flex-1 h-10 rounded-lg bg-primary text-on-primary text-sm font-medium flex items-center justify-center gap-2"
                  onClick={() => window.open("https://www.hostinger.com/domains", "_blank")}
                >
                  Buy from Hostinger
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-mute">
                DNS propagation takes 15–30 minutes. After configuring records, click "Verify Domain" in Hostinger
                dashboard.
              </p>
            </div>

            {/* Skeleton previews */}
            <div className="rounded-lg border border-hairline bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-mute">Production Stats</p>
              <div className="grid grid-cols-2 gap-2">
                {["Visitors", "Page Views", "Bandwidth", "Deployments"].map((l) => skeletonCard(<Loader2 className="h-3 w-3" />, l))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── State 2: Shipped but not connected → Connect Hosting + Domain ──
  if (shipment.shipped && !hostingerConnected) {
    return (
      <div className="flex h-full flex-col overflow-y-auto p-6">
        <div className="mx-auto w-full max-w-[760px]">
          <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-hairline px-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-critical/10 border border-critical/20">
              <Shield className="h-3.5 w-3.5 text-critical" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-4 text-ink text-critical">My Dashboard</p>
              <p className="truncate text-[10px] leading-3.5 text-mute">Production dashboard — connecting…</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-semibold text-critical">
              <ShieldCheck className="h-3 w-3" /> Connecting
            </span>
          </div>

          <div className="flex flex-col gap-3 p-6">
            {/* Connect Hosting card */}
            <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
              <h3 className="font-medium text-body flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Connect Hostinger Hosting
              </h3>
              <p className="text-sm text-mute">
                Link RIDE to your Hostinger hosting to see live website, deployment, domain and DNS data.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Key className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-mute" />
                  <input
                    type="password"
                    placeholder="hf_…"
                    className={`${inputCls} pl-7`}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void connectHostinger(); }}
                  />
                </div>
                <button className={primaryBtnCls} disabled={connecting || hostingerLoading} onClick={() => void connectHostinger()}>
                  {connecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Connect"}
                </button>
              </div>
              {hostingerError && <p className="text-xs text-error">{hostingerError}</p>}
              <p className="text-xs text-mute">
                Create a token in <a href="https://hpanel.hostinger.com/api" className="text-link hover:underline" target="_blank">hPanel</a>
              </p>
            </div>

            {/* Connect Domain card */}
            <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
              <h3 className="font-medium text-body flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Connect Domain
              </h3>
              <p className="text-sm text-mute">
                Use an existing domain or buy one from Hostinger. RIDE does not control external registrars —
                configure DNS records at your provider.
              </p>
              <div className="flex gap-2">
                <button
                  className={`flex-1 h-10 rounded-lg border font-medium transition-colors bg-canvas text-body border border-hairline hover:bg-canvas-soft`}
                  onClick={() => setSelectedDomain("existing")}
                >
                  Existing Domain
                </button>
                <button
                  className="flex-1 h-10 rounded-lg bg-primary text-on-primary text-sm font-medium flex items-center justify-center gap-2"
                  onClick={() => window.open("https://www.hostinger.com/domains", "_blank")}
                >
                  Buy from Hostinger
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-mute">
                DNS propagation takes 15–30 minutes. After configuring, click "Verify Domain" in Hostinger dashboard.
              </p>
            </div>

            {/* Skeleton previews */}
            <div className="rounded-lg border border-hairline bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-mute">Production Stats</p>
              <div className="grid grid-cols-2 gap-2">
                {["Visitors", "Page Views", "Bandwidth", "Deployments"].map((l) => skeletonCard(<Loader2 className="h-3 w-3" />, l))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── State 3: Shipped and connected → live dashboard ──
  const websites = data?.websites ?? [];
  const domains = data?.domains ?? [];
  const deployments = data?.deployments ?? [];
  const builds = data?.nodejsBuilds ?? [];

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "websites", label: "Websites", count: websites.length },
    { id: "deployments", label: "Deployments", count: deployments.length },
    { id: "domain", label: "Domain", count: domains.length },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-hairline px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-ember">
          <LayoutDashboard className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold leading-4 text-ink">My Dashboard</p>
          <p className="truncate text-[10px] leading-3.5 text-mute">Hostinger · live</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          Connected
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-b border-hairline px-3 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`rounded-sm px-2.5 py-1.5 text-[11px] font-medium transition-colors ride-focus-ring ${activeTab === t.id ? "bg-primary/15 text-ink" : "text-mute hover:bg-canvas hover:text-ink"}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {typeof t.count === "number" && t.count > 0 && <span className="ml-1 text-[10px] text-mute">({t.count})</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button className={btnCls} onClick={() => void load()} disabled={refreshing} title="Refresh now" aria-label="Refresh">
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button className={btnCls} onClick={() => void disconnect()} disabled={connecting} title="Disconnect Hostinger" aria-label="Disconnect">
            <Unplug className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[900px] flex-1 flex flex-col gap-3 p-3">
        {error && <p className="rounded-sm border border-error/20 bg-error/10 px-2 py-1.5 text-[11px] text-error">{error}</p>}

        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {statCard(<Globe className="h-4 w-4" />, "Websites", websites.length)}
              {statCard(<Server className="h-4 w-4" />, "Domains", domains.length)}
              {statCard(<Rocket className="h-4 w-4" />, "Deployments", deployments.length)}
              {statCard(<Database className="h-4 w-4" />, "Node.js builds", builds.length)}
            </div>

            <div className="rounded-lg border border-hairline bg-canvas p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-mute">Deployment health</p>
              {deployments.length === 0 ? (
                <p className="text-[11.5px] text-mute">No deployments yet — deploy your project to see live status here.</p>
              ) : (
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> {deployments.filter((d) => d.status === "success").length} success</span>
                  <span className="inline-flex items-center gap-1 text-warning"><Clock className="h-3 w-3" /> {deployments.length - deployments.filter((d) => d.status === "success").length - deployments.filter((d) => d.status === "error").length} pending</span>
                  {deployments.filter((d) => d.status === "error").length > 0 && <span className="inline-flex items-center gap-1 text-error"><XCircle className="h-3 w-3" /> {deployments.filter((d) => d.status === "error").length} failed</span>}
                </div>
              )}
            </div>

            {websites.length > 0 && (
              <div className="rounded-lg border border-hairline bg-canvas p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-mute">Websites</p>
                {websites.slice(0, 4).map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink">{w.domain}</p>
                      <p className="truncate text-[10px] text-mute">{w.plan ?? "Hosting"} · {w.datacenter ?? "—"}</p>
                    </div>
                    {statusPill(w.isEnabled ? "active" : "disabled", ["active"])}
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-[10px] text-mute">
              Last sync {data?.lastSync ? fmtTime(new Date(data.lastSync).toISOString()) : "—"} · refreshes automatically every 30s
            </p>
          </>
        )}

        {activeTab === "websites" && (
          <WebsiteList websites={websites} />
        )}

        {activeTab === "deployments" && (
          <DeploymentList deployments={deployments} builds={builds} />
        )}

        {activeTab === "domain" && (
          <DomainList
            domains={domains}
            dnsZones={dnsZones}
            selectedDomain={selectedDomain}
            onToggle={toggleDomain}
          />
        )}
      </div>
    </div>
  );
}

function WebsiteList({ websites }: { websites: HostingerWebsite[] }): React.ReactElement {
  if (websites.length === 0) {
    return <EmptyState icon={<Globe className="h-4 w-4" />} text="No websites found on your Hostinger account yet." />;
  }
  return (
    <div className="flex flex-col gap-2">
      {websites.map((w) => (
        <div key={w.id} className="rounded-lg border border-hairline bg-canvas p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-ink">{w.domain}</p>
              <p className="truncate text-[10.5px] text-mute">{w.name}</p>
            </div>
            {statusPill(w.isEnabled ? "active" : "disabled", ["active"])}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex justify-between"><dt className="text-mute">Plan</dt><dd className="text-ink">{w.plan ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Region</dt><dd className="text-ink">{w.datacenter ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">IP</dt><dd className="text-ink">{w.ipAddress ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Created</dt><dd className="text-ink">{fmtTime(w.createdAt)}</dd></div>
          </dl>
        </div>
      ))}
    </div>
  );
}

function DeploymentList({ deployments, builds }: { deployments: HostingerDeployment[]; builds: HostingerNodeJSBuild[] }): React.ReactElement {
  if (deployments.length === 0 && builds.length === 0) {
    return <EmptyState icon={<Rocket className="h-4 w-4" />} text="No deployments yet. Ship your project from the Deploy center and it will appear here live." />;
  }
  const items: Array<{ id: string; title: string; sub: string; status: string; at: string }> = [
    ...deployments.map((d) => ({
      id: `d-${d.id}`,
      title: `Deployment ${d.version}`,
      sub: `${d.branch ?? "main"}${d.commitHash ? ` · ${d.commitHash.slice(0, 7)}` : ""} · website ${d.websiteId}`,
      status: d.status,
      at: d.createdAt,
    })),
    ...builds.map((b) => ({
      id: `b-${b.id}`,
      title: `Node.js build · ${b.nodeVersion}`,
      sub: b.buildCommand,
      status: b.status,
      at: b.createdAt,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border border-hairline bg-canvas p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-semibold text-ink">{it.title}</p>
            {statusPill(it.status, ["success", "active"])}
          </div>
          <p className="truncate text-[10.5px] text-mute">{it.sub}</p>
          <p className="mt-0.5 text-[10px] text-mute">{fmtTime(it.at)}</p>
        </div>
      ))}
    </div>
  );
}

function DomainList({ domains, dnsZones, selectedDomain, onToggle }: {
  domains: HostingerDomain[];
  dnsZones: Record<string, HostingerDNSZone | null>;
  selectedDomain: string | null;
  onToggle: (domain: string) => void;
}): React.ReactElement {
  if (domains.length === 0) {
    return <EmptyState icon={<Globe className="h-4 w-4" />} text="No domains connected yet. Add a domain on Hostinger and it will appear here." />;
  }
  return (
    <div className="flex flex-col gap-2">
      {domains.map((d) => (
        <div key={d.domain} className="rounded-lg border border-hairline bg-canvas">
          <button className="flex w-full items-center justify-between gap-2 p-3 text-left ride-focus-ring" onClick={() => onToggle(d.domain)}>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-ink">{d.domain}</p>
              <p className="text-[10.5px] text-mute">
                SSL {d.sslStatus} · DNS {d.dnsStatus}{d.expiresAt ? ` · expires ${fmtTime(d.expiresAt)}` : ""}
              </p>
            </div>
            {statusPill(d.sslStatus, ["active"])}
          </button>
          {selectedDomain === d.domain && (
            <div className="border-t border-hairline px-3 py-2">
              {dnsZones[d.domain] === undefined ? (
                <div className="flex items-center gap-2 text-[11px] text-mute"><Loader2 className="h-3 w-3 animate-spin" /> Loading DNS records…</div>
              ) : dnsZones[d.domain] === null ? (
                <p className="text-[11px] text-mute">DNS zone unavailable for this domain.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {dnsZones[d.domain]!.records.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-[11px]">
                      <span className="w-14 shrink-0 rounded-sm bg-brand-orange/10 px-1.5 py-0.5 text-center text-[9.5px] font-semibold uppercase text-brand-ember">{r.type}</span>
                      <span className="truncate text-ink">{r.name}</span>
                      <span className="ml-auto truncate text-mute">{r.value}</span>
                      <span className="shrink-0 text-[9.5px] text-mute">TTL {r.ttl}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-hairline px-4 py-8 text-center">
      <span className="text-mute">{icon}</span>
      <p className="max-w-[240px] text-[11.5px] leading-5 text-mute">{text}</p>
    </div>
  );
}
