import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleSlash,
  Download,
  KeyRound,
  Loader2,
  Package,
  PackagePlus,
  Plug,
  PlugZap,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import type { CapabilityAnalysis, PluginInstallation, PluginManifest } from "@ride/plugins";
import type { MarketplaceListing } from "@ride/marketplace";

const btnCls =
  "h-7 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";
const primaryBtnCls =
  "h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";

const inputCls =
  "h-7 w-full rounded-sm border border-hairline bg-canvas px-2 text-xs text-ink placeholder:text-mute focus:border-primary ride-focus-ring";

const KIND_LABEL: Record<string, string> = {
  plugin: "Plugin",
  template: "Template",
  component: "Component",
  integration: "Integration",
  "starter-kit": "Starter Kit",
};

function priceLabel(l: MarketplaceListing): string {
  if (l.pricePaise === 0) return "Free";
  return `₹${(l.pricePaise / 100).toLocaleString("en-IN")}`;
}

interface InstalledMap {
  [manifestId: string]: PluginInstallation;
}

export function PluginsPane() {
  const [tab, setTab] = useState<"browse" | "installed" | "recommend">("browse");
  const [catalog, setCatalog] = useState<PluginManifest[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [installed, setInstalled] = useState<PluginInstallation[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [buyerId, setBuyerId] = useState("local");

  const installedMap = useMemo<InstalledMap>(() => {
    const m: InstalledMap = {};
    for (const i of installed) m[i.manifestId] = i;
    return m;
  }, [installed]);

  const refresh = useCallback(async () => {
    const [cat, lst, inst] = await Promise.all([
      window.ride.plugins.catalog(),
      window.ride.plugins.browse(),
      window.ride.plugins.installed(),
    ]);
    setCatalog(cat);
    setListings(lst);
    setInstalled(inst);
  }, []);

  useEffect(() => {
    void refresh();
    return window.ride.plugins.onChange(() => void refresh());
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return listings.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (q && !`${l.title} ${l.description} ${l.tags.join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listings, query, category]);

  const installedFiltered = useMemo(() => {
    const byId = new Map(listings.map((l) => [l.manifestId, l] as const).filter(([, l]) => Boolean(l)));
    return catalog
      .filter((m) => installedMap[m.id])
      .map((m) => ({ manifest: m, listing: m ? byId.get(m.id) : undefined, installation: installedMap[m.id]! }))
      .sort((a, b) => b.installation.updatedAt - a.installation.updatedAt);
  }, [catalog, listings, installedMap]);

  const categories = useMemo(() => {
    const set = new Set(listings.map((l) => l.category));
    return ["all", ...set];
  }, [listings]);

  async function doInstall(listing: MarketplaceListing) {
    setBusy(true);
    setMsg(null);
    try {
      if (listing.manifestId) {
        const res = await window.ride.plugins.install(listing.manifestId);
        if (listing.pricePaise === 0) await window.ride.plugins.purchase(listing.id, buyerId);
        const missing = res.checklist.filter((c) => !c.ok);
        setMsg({
          kind: "ok",
          text: `${listing.title} installed — ${missing.length ? `${missing.length} optional step${missing.length > 1 ? "s" : ""} pending` : "ready to connect"}`,
        });
      } else {
        const rec = await window.ride.plugins.purchase(listing.id, buyerId);
        setMsg({ kind: "ok", text: rec ? `${listing.title} purchased (30% RIDE / 70% creator)` : "Already purchased" });
      }
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Install failed" });
    } finally {
      setBusy(false);
    }
  }

  function doUninstall(manifestId: string) {
    void window.ride.plugins.uninstall(manifestId).then(() => {
      setMsg({ kind: "ok", text: "Plugin uninstalled" });
      void refresh();
    });
  }

  function doToggle(manifestId: string, enabled: boolean) {
    void (enabled ? window.ride.plugins.enable(manifestId) : window.ride.plugins.disable(manifestId)).then(() => void refresh());
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-hairline px-3 pb-2 pt-2">
        {(["browse", "installed", "recommend"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`ride-tab ${tab === t ? "ride-tab--active" : ""}`}>
            {t === "browse" ? "Marketplace" : t === "installed" ? "Installed" : "Recommend"}
          </button>
        ))}
        <button
          className={`ml-auto h-7 w-7 rounded-sm border border-hairline p-1 text-mute hover:text-ink`}
          title="Open the plugin marketplace in the browser"
          onClick={() => void window.ride.app.openExternal("https://ride.dev/marketplace")}
        >
          <Store className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {msg && (
          <div className={`mb-2 rounded-sm px-2.5 py-1.5 text-[11px] ${msg.kind === "ok" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
            {msg.text}
          </div>
        )}

        {tab === "browse" && (
          <>
            <div className="mb-2 flex gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2 h-3 w-3 text-mute" />
                <input className={`${inputCls} pl-6`} placeholder="Search plugins, templates…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <select className="h-7 rounded-sm border border-hairline bg-canvas px-1.5 text-[11px] text-body" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-2 flex items-center gap-1 text-[10px] text-mute">
              <ShoppingBag className="h-3 w-3" />
              {filtered.length} items
            </div>

            <div className="space-y-1.5">
              {filtered.map((l) => {
                const inst = l.manifestId ? installedMap[l.manifestId] : undefined;
                const connected = inst?.connections.some((c) => c.status === "connected");
                return (
                  <div key={l.id} className="rounded-sm border border-hairline bg-canvas p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-ink">{l.title}</span>
                          {l.verified && (
                            <span className="rounded-full bg-success/10 px-1.5 py-px text-[9px] text-success">verified</span>
                          )}
                          {l.pricePaise === 0 && (
                            <span className="rounded-full bg-canvas-soft-2 px-1.5 py-px text-[9px] text-mute">official</span>
                          )}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-body">{l.description}</div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-mute">
                          <span className="rounded-sm bg-canvas-soft px-1 py-px">{KIND_LABEL[l.kind] ?? l.kind}</span>
                          <span className="flex items-center gap-0.5">
                            <Star className="h-2.5 w-2.5 text-warning" /> {l.rating.toFixed(1)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Download className="h-2.5 w-2.5" /> {l.installCount.toLocaleString()}
                          </span>
                          <span>{l.creatorName}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-ink">{priceLabel(l)}</span>
                        {inst ? (
                          <span className={`flex items-center gap-1 text-[10px] ${connected ? "text-success" : "text-warning"}`}>
                            <Plug className="h-3 w-3" />
                            {connected ? "connected" : inst.status === "disabled" ? "disabled" : "installed"}
                          </span>
                        ) : (
                          <button className={primaryBtnCls} disabled={busy} onClick={() => void doInstall(l)}>
                            {l.pricePaise === 0 ? "Install" : "Buy"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!filtered.length && <p className="py-6 text-center text-[11px] text-mute">Nothing matches your search.</p>}
            </div>
          </>
        )}

        {tab === "installed" && (
          <div className="space-y-1.5">
            {installedFiltered.map(({ manifest, installation }) => (
              <div key={manifest.id} className="rounded-sm border border-hairline bg-canvas p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-ink">{manifest.displayName}</span>
                      {installation.status === "active" ? (
                        <span className="flex items-center gap-0.5 rounded-full bg-success/10 px-1.5 py-px text-[9px] text-success">
                          <PlugZap className="h-2.5 w-2.5" /> active
                        </span>
                      ) : (
                        <span className="rounded-full bg-canvas-soft-2 px-1.5 py-px text-[9px] text-mute">disabled</span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-body">{manifest.description}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {manifest.providers.map((pid) => {
                        const conn = installation.connections.find((c) => c.providerId === pid);
                        const color =
                          conn?.status === "connected" ? "text-success bg-success/10" : conn?.status === "configured" ? "text-warning bg-warning/10" : "text-mute bg-canvas-soft";
                        return (
                          <ConnectChip
                            key={pid}
                            pid={pid}
                            status={conn?.status ?? "pending"}
                            color={color}
                            installation={installation}
                            onChanged={() => void refresh()}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button className={btnCls} onClick={() => doToggle(manifest.id, installation.status !== "active")} title={installation.status === "active" ? "Disable" : "Enable"}>
                      {installation.status === "active" ? "Disable" : "Enable"}
                    </button>
                    <button className={`${btnCls} hover:text-error`} onClick={() => doUninstall(manifest.id)} title="Uninstall">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!installedFiltered.length && (
              <p className="py-8 text-center text-[11px] text-mute">
                No plugins installed. Browse the marketplace to add payments, auth, email…
              </p>
            )}
          </div>
        )}

        {tab === "recommend" && <RecommendTab />}
      </div>
    </div>
  );
}

// ── Connect chip + secret form ──────────────────────────────────────────────

function ConnectChip(props: {
  pid: string;
  status: string;
  color: string;
  installation: PluginInstallation;
  onChanged: () => void;
}) {
  const { pid, status, color, installation, onChanged } = props;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const openForm = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    const res = await window.ride.plugins.verify(installation.manifestId, pid);
    setMissing(res.missing);
    setValues({});
    setOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      await window.ride.plugins.connect(installation.manifestId, pid, values);
      setOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  if (open) {
    return (
      <div className="w-full rounded-sm border border-hairline bg-canvas-soft p-2">
        <div className="mb-1.5 flex items-center gap-1 text-[10px] text-mute">
          <KeyRound className="h-3 w-3" /> Connect {pid} — keys are stored in the OS keychain
        </div>
        {missing.length ? (
          missing.map((env) => (
            <input
              key={env}
              className={`${inputCls} mb-1`}
              placeholder={env}
              type={env.toLowerCase().includes("secret") || env.toLowerCase().includes("key") ? "password" : "text"}
              value={values[env] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [env]: e.target.value }))}
            />
          ))
        ) : (
          <p className="mb-1.5 text-[10px] text-success">All keys already configured — re-save to rotate.</p>
        )}
        <div className="flex gap-1">
          <button className={primaryBtnCls} disabled={saving} onClick={() => void submit()}>
            Save keys
          </button>
          <button className={btnCls} onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      className={`flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] ${props.color}`}
      onClick={() => void openForm()}
      title={`Connect ${pid}`}
    >
      {status === "connected" ? <Check className="h-2.5 w-2.5" /> : status === "configured" ? <Plug className="h-2.5 w-2.5" /> : <CircleSlash className="h-2.5 w-2.5" />}
      {pid}
    </button>
  );
}

// ── Recommend tab ───────────────────────────────────────────────────────────

function RecommendTab() {
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<CapabilityAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const [a, inst] = await Promise.all([window.ride.plugins.recommend(prompt), window.ride.plugins.installed()]);
      setAnalysis(a);
      setInstalled(inst.map((i) => i.manifestId));
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Analysis failed" });
    } finally {
      setBusy(false);
    }
  };

  const installAll = async () => {
    if (!analysis) return;
    for (const rec of analysis.recommendations) {
      if (installed.includes(rec.manifestId)) continue;
      try {
        await window.ride.plugins.install(rec.manifestId);
      } catch {
        /* continue */
      }
    }
    setMsg({ kind: "ok", text: "Recommended plugins installed" });
    setInstalled((await window.ride.plugins.installed()).map((i) => i.manifestId));
  };

  const samples = [
    "Build an online course platform with subscriptions",
    "Add a ₹999 subscription to my SaaS",
    "Users should be able to upload profile pictures",
    "Send WhatsApp confirmation after payment",
    "Whenever someone submits the contact form, create a lead",
    "Add fast product search to my store",
  ];

  return (
    <div>
      <p className="mb-2 text-[11px] leading-4 text-body">
        Tell RIDE what your product needs — it detects the required capabilities and recommends the verified integrations to
        install.
      </p>
      <textarea
        className="h-20 w-full resize-none rounded-sm border border-hairline bg-canvas p-2 text-xs text-ink placeholder:text-mute focus:border-primary ride-focus-ring"
        placeholder='e.g. "Build an e-commerce site with login, payments, emails and analytics"'
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button className={`${primaryBtnCls} mb-2 w-full`} disabled={busy || !prompt.trim()} onClick={() => void run()}>
        {busy ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Wand2 className="mr-1 inline h-3 w-3" />}
        Detect integrations
      </button>
      <div className="mb-2 flex flex-wrap gap-1">
        {samples.map((s) => (
          <button key={s} className={`${btnCls} h-5 px-1.5 text-[10px]`} onClick={() => setPrompt(s)}>
            {s}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-2 rounded-sm px-2.5 py-1.5 text-[11px] ${msg.kind === "ok" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
          {msg.text}
        </div>
      )}

      {analysis && (
        <div className="space-y-2">
          {analysis.capabilities.length > 0 && (
            <div className="rounded-sm border border-hairline bg-canvas p-2">
              <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-mute">
                <Sparkles className="h-3 w-3" /> Required capabilities
              </div>
              <div className="flex flex-wrap gap-1">
                {analysis.capabilities.map((c) => (
                  <span key={c.id} className="rounded-full bg-canvas-soft px-2 py-0.5 text-[10px] text-body">
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="rounded-sm border border-hairline bg-canvas p-2">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-mute">
                <PackagePlus className="h-3 w-3" /> Recommended integrations
              </div>
              <div className="space-y-1.5">
                {analysis.recommendations.map((r) => {
                  const done = installed.includes(r.manifestId);
                  return (
                    <div key={r.manifestId} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-xs text-ink">
                          {done ? <Check className="h-3 w-3 text-success" /> : <Package className="h-3 w-3 text-mute" />}
                          {r.displayName}
                        </div>
                        <div className="text-[10px] text-mute">
                          {r.reason}
                          {r.alternatives.length ? ` · alt: ${r.alternatives.join(", ")}` : ""}
                        </div>
                      </div>
                      {done ? (
                        <span className="shrink-0 text-[10px] text-success">installed</span>
                      ) : (
                        <button className={`${primaryBtnCls} shrink-0`} onClick={() => void window.ride.plugins.install(r.manifestId).then(() => void refreshState(setInstalled))}>
                          Install
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {analysis.recommendations.some((r) => !installed.includes(r.manifestId)) && (
                <button className={`${btnCls} mt-2 w-full`} onClick={() => void installAll()}>
                  Install all recommended
                </button>
              )}
            </div>
          )}

          {analysis.instructionBlock && (
            <details className="rounded-sm border border-hairline bg-canvas-soft p-2">
              <summary className="cursor-pointer text-[10px] font-medium text-body">AI implementation rules the agent will follow</summary>
              <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-body">{analysis.instructionBlock}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

async function refreshState(setInstalled: (v: string[]) => void): Promise<void> {
  setInstalled((await window.ride.plugins.installed()).map((i) => i.manifestId));
}