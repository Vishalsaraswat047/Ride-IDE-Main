import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Package, PackagePlus, Puzzle, Search, Star, Upload, X } from "lucide-react";
import type { CompatibilityIssue, ExtensionCompatibility, InstalledExtension, MarketplaceExtension, MarketplaceSearchResult } from "@ride/contracts";

const btnCls =
  "h-7 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";
const primaryBtnCls =
  "h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";

type BadgeState = "compatible" | "partial" | "incompatible" | "unknown";

function Badge({ state }: { state: BadgeState }) {
  if (state === "compatible") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[9px] text-success" title="Fully compatible with the RIDE extension host">
        <Check className="h-2.5 w-2.5" /> compatible
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[9px] text-warning" title="Partially compatible — some VS Code API calls are unsupported">
        partial
      </span>
    );
  }
  if (state === "incompatible") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-[9px] text-error" title="Incompatible with this version of RIDE">
        <X className="h-2.5 w-2.5" /> incompatible
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-canvas-soft-2 px-2 py-0.5 text-[9px] text-mute">checking…</span>
  );
}

type VersionInfo = { version: string; engines?: { vscode?: string } };

export function ExtensionsPane() {
  const [tab, setTab] = useState<"installed" | "marketplace">("installed");
  const [installed, setInstalled] = useState<InstalledExtension[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [compat, setCompat] = useState<Record<string, ExtensionCompatibility>>({});

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<MarketplaceSearchResult | null>(null);
  const [featured, setFeatured] = useState<MarketplaceExtension[]>([]);
  const [popular, setPopular] = useState<MarketplaceExtension[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; description: string; icon: string; extensionCount: number }[]>([]);
  const [versions, setVersions] = useState<Record<string, VersionInfo[]>>({});
  const [versionSel, setVersionSel] = useState<Record<string, string>>({});

  const installedByMarketId = useMemo(
    () =>
      new Map<string, InstalledExtension>(
        installed.map((i) => {
          const id = `${i.manifest.publisher}.${i.manifest.name}`;
          return [id, i];
        }),
      ),
    [installed],
  );

  const notify = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refreshInstalled = () => {
    void window.ride.extensions.list().then(setInstalled).catch(() => setInstalled([]));
  };

  useEffect(() => {
    refreshInstalled();
    void window.ride.marketplace.getCategories().then(setCategories).catch(() => undefined);
    void window.ride.marketplace.getFeatured(6).then(setFeatured).catch(() => undefined);
    void window.ride.marketplace.getPopular(6).then(setPopular).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return window.ride.extensions.onChanged(refreshInstalled);
  }, []);

  const checkCompat = (ext: MarketplaceExtension) => {
    void window.ride.extensions
      .checkCompatibility({
        name: ext.name,
        displayName: ext.displayName,
        version: ext.version,
        publisher: ext.publisher,
        engines: { vscode: ext.compatibility.vscode },
      } as unknown as Record<string, unknown>)
      .then((c) => {
        if (c) setCompat((prev) => ({ ...prev, [ext.id]: c }));
      })
      .catch(() => undefined);
  };

  const runSearch = async (q?: string, cat?: string) => {
    setSearching(true);
    try {
      const params: Record<string, unknown> = {};
      const qq = q ?? query;
      const cc = cat ?? category;
      if (qq?.trim()) params.query = qq.trim();
      if (cc) params.category = cc;
      const r = await window.ride.marketplace.search(params);
      setResults(r);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
      setResults({ extensions: [], total: 0, page: 0, pageSize: 0, totalPages: 0 });
    } finally {
      setSearching(false);
    }
  };

  const loadVersions = async (ext: MarketplaceExtension) => {
    try {
      const vs = await window.ride.marketplace.getVersions(ext.id);
      setVersions((v) => ({ ...v, [ext.id]: vs as VersionInfo[] }));
    } catch {
      /* ignore */
    }
  };

  const install = async (ext: MarketplaceExtension) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await window.ride.marketplace.download(ext.id, versionSel[ext.id] ?? undefined);
      if (!r.ok) throw new Error(r.error ?? "Install failed");
      notify("ok", `Installed ${ext.displayName || ext.name}`);
      refreshInstalled();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const installVsix = async () => {
    setBusy(true);
    try {
      const ext = await window.ride.extensions.install();
      if (ext) notify("ok", `Installed ${ext.manifest.displayName || ext.manifest.name}`);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (ext: InstalledExtension) => {
    try {
      if (ext.enabled) await window.ride.extensions.disable(ext.id);
      else await window.ride.extensions.enable(ext.id);
      refreshInstalled();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const uninstall = async (ext: InstalledExtension) => {
    setBusy(true);
    try {
      await window.ride.extensions.uninstall(ext.id);
      refreshInstalled();
      notify("ok", `Uninstalled ${ext.manifest.displayName || ext.manifest.name}`);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const updateExt = async (ext: InstalledExtension) => {
    setBusy(true);
    try {
      const r = await window.ride.extensions.update(ext.id);
      if (r) notify("ok", `Updated to ${r.manifest.version}`);
      refreshInstalled();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const renderExtCard = (ext: MarketplaceExtension) => {
    const installedExt = installedByMarketId.get(ext.id);
    const comp = compat[ext.id];
    const vs = versions[ext.id] ?? [];
    const showVersionPicker = vs.length > 1;
    return (
      <div key={ext.id} className="flex items-start gap-3 rounded-md border border-hairline bg-canvas px-3 py-2.5" onMouseEnter={() => { checkCompat(ext); void loadVersions(ext); }}>
        {ext.iconUrl ? (
          <img src={ext.iconUrl} alt="" className="h-9 w-9 shrink-0 rounded-sm border border-hairline bg-canvas-soft object-contain" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-hairline bg-canvas-soft">
            <Puzzle className="h-4 w-4 text-mute" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-medium text-ink">{ext.displayName || ext.name}</span>
            <span className="shrink-0 text-[10px] text-mute">v{ext.version}</span>
          </div>
          <div className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-mute">{ext.description || "No description."}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="text-mute">{ext.publisherDisplayName || ext.publisher}</span>
            {ext.installCount ? (
              <span className="flex items-center gap-0.5 text-mute">
                <Package className="h-2.5 w-2.5" /> {ext.installCount >= 1000 ? `${(ext.installCount / 1000).toFixed(1)}k` : ext.installCount} installs
              </span>
            ) : null}
            {ext.rating ? (
              <span className="flex items-center gap-0.5 text-mute">
                <Star className="h-2.5 w-2.5 text-warning" /> {ext.rating.toFixed(1)}
              </span>
            ) : null}
            {comp && viewCompat(comp)}
          </div>
        </div>
        {installedExt ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] text-success">
              <Check className="h-3 w-3" /> v{installedExt.manifest.version}
            </span>
            <button onClick={() => void updateExt(installedExt)} className={btnCls + " h-6 text-[10px]"}>
              Update
            </button>
            <button onClick={() => void uninstall(installedExt)} className={btnCls + " h-6 text-[10px]"}>
              Remove
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {showVersionPicker && (
              <select
                className="h-6 w-24 rounded-sm border border-hairline bg-canvas text-[10px] text-body outline-none"
                value={versionSel[ext.id] ?? ""}
                onChange={(e) => setVersionSel((v) => ({ ...v, [ext.id]: e.target.value }))}
              >
                {vs.map((v) => (
                  <option key={v.version} value={v.version}>
                    {ext.version === v.version ? `${v.version} (latest)` : v.version}
                  </option>
                ))}
              </select>
            )}
            <button onClick={() => void install(ext)} disabled={busy} className={primaryBtnCls + " flex items-center gap-1"}>
              <PackagePlus className="h-3 w-3" /> Install
            </button>
          </div>
        )}
      </div>
    );
  };

  const viewCompat = (c: ExtensionCompatibility) => {
    if (c.status === "compatible") return <Badge state="compatible" />;
    if (c.status === "partial") return <Badge state="partial" />;
    if (c.status === "incompatible") return <Badge state="incompatible" />;
    return <Badge state="unknown" />;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-2 py-1.5">
        {(
          [
            ["installed", `Installed (${installed.length})`],
            ["marketplace", "Marketplace"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`h-6 rounded-sm px-2.5 text-[11px] transition-colors ${tab === id ? "bg-canvas-soft-2 font-medium text-ink" : "text-mute hover:text-body"}`}
          >
            {label}
          </button>
        ))}
        <button onClick={installVsix} disabled={busy} className={btnCls + " ml-auto flex items-center gap-1"} title="Install from a .vsix file">
          <Upload className="h-3 w-3" /> Install .vsix
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {msg && (
          <div className={`mb-3 rounded-sm border px-3 py-2 text-[11px] ${msg.kind === "ok" ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error"}`}>
            {msg.text}
          </div>
        )}

        {tab === "installed" && (
          <div className="flex flex-col gap-2">
            {installed.length === 0 && (
              <div className="rounded-md border border-hairline bg-canvas-soft px-3 py-5 text-center">
                <Puzzle className="mx-auto h-5 w-5 text-mute" />
                <div className="mt-2 text-xs font-medium text-ink">No extensions installed</div>
                <p className="mx-auto mt-1 max-w-sm text-[11px] leading-4 text-mute">
                  Install extensions from the Open VSX marketplace (VS Code compatible) or from a .vsix file. RIDE
                  runs a VS Code-compatible extension host.
                </p>
              </div>
            )}
            {installed.map((ext) => {
              const m = ext.manifest;
              return (
                <div key={ext.id} className="flex items-center gap-3 rounded-md border border-hairline px-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-hairline bg-canvas-soft">
                    <Puzzle className="h-4 w-4 text-mute" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-ink">{m.displayName || m.name}</span>
                      <span className="shrink-0 text-[10px] text-mute">v{m.version}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] ${ext.enabled ? "bg-success/10 text-success" : "bg-canvas-soft-2 text-mute"}`}>
                        {ext.enabled ? "enabled" : "disabled"}
                      </span>
                      {m.engines?.ride && <span className="shrink-0 rounded-full bg-violet/10 px-1.5 py-0.5 text-[9px] text-violet">native</span>}
                    </div>
                    <div className="truncate font-mono text-[10px] text-mute">
                      {m.publisher}.{m.name} · {viewCompat(ext.compatibility)}
                    </div>
                    {ext.compatibility.status === "incompatible" && ext.compatibility.issues.length > 0 && (
                      <div className="mt-1 max-w-md truncate text-[10px] text-error">{ext.compatibility.issues[0]?.message}</div>
                    )}
                  </div>
                  <button onClick={() => void toggleEnabled(ext)} className={btnCls}>
                    {ext.enabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => void updateExt(ext)} className={btnCls}>
                    Update
                  </button>
                  <button onClick={() => void uninstall(ext)} disabled={busy || ext.isBuiltin} className={btnCls} title={ext.isBuiltin ? "Built-in extension" : "Uninstall"}>
                    Uninstall
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {tab === "marketplace" && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runSearch();
                }}
                placeholder="Search Open VSX (VS Code compatible)…"
                className="h-8 w-full rounded-sm border border-hairline bg-canvas pr-2 pl-8 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => {
                  setCategory("");
                  void runSearch(undefined, "");
                }}
                className={`h-6 rounded-full border px-2.5 text-[10px] transition-colors ${
                  !category ? "border-link bg-link/10 text-link" : "border-hairline text-mute hover:text-body"
                }`}
              >
                All
              </button>
              {categories.slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategory(c.id);
                    void runSearch(undefined, c.id);
                  }}
                  className={`h-6 rounded-full border px-2.5 text-[10px] transition-colors ${
                    category === c.id ? "border-link bg-link/10 text-link" : "border-hairline text-mute hover:text-body"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {searching && (
              <div className="flex items-center justify-center gap-2 py-8 text-mute">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching marketplace…
              </div>
            )}

            {!searching && results && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] text-mute">{results.total.toLocaleString()} results{query.trim() ? ` for “${query.trim()}”` : ""}</div>
                {results.extensions.length === 0 && (
                  <div className="rounded-md border border-hairline bg-canvas-soft px-3 py-5 text-center text-[11px] text-mute">
                    Nothing found. Try different keywords or browse the categories above.
                  </div>
                )}
                {results.extensions.map((ext) => renderExtCard(ext))}
              </div>
            )}

            {!searching && !results && (
              <>
                {featured.length > 0 && (
                  <>
                    <div className="text-[11px] font-semibold text-mute uppercase">Featured</div>
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">{featured.map((ext) => renderExtCard(ext))}</div>
                  </>
                )}
                {popular.length > 0 && (
                  <>
                    <div className="text-[11px] font-semibold text-mute uppercase">Popular this week</div>
                    <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">{popular.map((ext) => renderExtCard(ext))}</div>
                  </>
                )}
              </>
            )}

            <p className="mt-1 text-[10px] leading-4 text-mute">
              Extensions come from the Open VSX marketplace and run in a VS Code-compatible extension host.
              Compatibility is per-extension — <span className="text-success">compatible</span>,{" "}
              <span className="text-warning">partial</span> (some APIs unsupported) or{" "}
              <span className="text-error">incompatible</span>. RIDE never claims 100% VS Code compatibility.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}