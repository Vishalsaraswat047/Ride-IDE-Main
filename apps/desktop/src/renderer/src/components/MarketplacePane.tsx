import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Box,
  Brain,
  Brush,
  Check,
  Download,
  FolderGit2,
  FolderOpen,
  Globe,
  HardDrive,
  Layers,
  LayoutDashboard,
  Loader2,
  Package,
  Palette,
  PenLine,
  Puzzle,
  Rocket,
  Search,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Trash2,
  Upload,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { MarketplaceListing } from "@ride/marketplace";
import type { FileNode } from "@ride/contracts";
import { workspace } from "../lib/hooks";

const btnCls =
  "h-7 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";
const primaryBtnCls =
  "h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";
const inputCls =
  "h-7 w-full rounded-sm border border-hairline bg-canvas px-2 text-xs text-ink placeholder:text-mute focus:border-primary ride-focus-ring";
const labelCls = "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-mute";

const KIND_LABEL: Record<string, string> = {
  plugin: "Plugin",
  template: "Template",
  component: "Component",
  integration: "Integration",
  "starter-kit": "Starter Kit",
};

const TEMPLATE_CATEGORIES = [
  "web",
  "saas",
  "dashboard",
  "landing-page",
  "ecommerce",
  "portfolio",
  "blog",
  "documentation",
  "mobile",
  "ai-apps",
  "ui-kit",
  "component",
  "boilerplate",
  "full-project",
  "starter-kit",
  "theme",
];

const CATEGORY_LABEL: Record<string, string> = {
  web: "Website",
  saas: "SaaS",
  dashboard: "Dashboard",
  "landing-page": "Landing Page",
  ecommerce: "E-commerce",
  portfolio: "Portfolio",
  blog: "Blog",
  documentation: "Documentation",
  mobile: "Mobile / Responsive",
  "ai-apps": "AI Apps",
  "ui-kit": "UI Kit",
  component: "Component",
  boilerplate: "Boilerplate",
  "full-project": "Full Project",
  "starter-kit": "Starter Kit",
  theme: "Theme",
};

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; grad: string }> = {
  web: { icon: Globe, grad: "from-sky-500/30 via-blue-500/25 to-indigo-500/30" },
  saas: { icon: Layers, grad: "from-violet-500/30 via-purple-500/25 to-fuchsia-500/30" },
  dashboard: { icon: LayoutDashboard, grad: "from-emerald-500/30 via-teal-500/25 to-cyan-500/30" },
  "landing-page": { icon: Rocket, grad: "from-sky-500/30 via-cyan-500/25 to-teal-500/30" },
  ecommerce: { icon: ShoppingCart, grad: "from-orange-500/30 via-amber-500/25 to-yellow-500/30" },
  portfolio: { icon: UserRound, grad: "from-pink-500/30 via-rose-500/25 to-red-500/30" },
  blog: { icon: PenLine, grad: "from-amber-500/30 via-orange-500/25 to-red-500/30" },
  documentation: { icon: BookOpen, grad: "from-teal-500/30 via-emerald-500/25 to-green-500/30" },
  mobile: { icon: Smartphone, grad: "from-cyan-500/30 via-sky-500/25 to-blue-500/30" },
  "ai-apps": { icon: Brain, grad: "from-fuchsia-500/30 via-purple-500/25 to-violet-500/30" },
  "ui-kit": { icon: Palette, grad: "from-rose-500/30 via-pink-500/25 to-fuchsia-500/30" },
  component: { icon: Puzzle, grad: "from-lime-500/30 via-green-500/25 to-emerald-500/30" },
  boilerplate: { icon: Box, grad: "from-slate-500/30 via-zinc-500/25 to-neutral-500/30" },
  "full-project": { icon: FolderGit2, grad: "from-indigo-500/30 via-blue-500/25 to-violet-500/30" },
  "starter-kit": { icon: Sparkles, grad: "from-amber-500/30 via-yellow-500/25 to-orange-500/30" },
  theme: { icon: Brush, grad: "from-purple-500/30 via-violet-500/25 to-indigo-500/30" },
};

const CATEGORY_FALLBACK = { icon: Package as LucideIcon, grad: "from-zinc-500/30 via-slate-500/25 to-zinc-500/30" };

function priceLabel(l: MarketplaceListing): string {
  if (l.pricePaise === 0) return "Free";
  return `₹${(l.pricePaise / 100).toLocaleString("en-IN")}`;
}

function fmtBytes(n: number): string {
  if (n > 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n > 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

type BundleInfo = {
  bundleId: string;
  zipPath: string;
  rootName: string;
  framework: string;
  language: string;
  fileCount: number;
  sizeBytes: number;
  deps: string[];
};

type SellSource =
  | { type: "workspace" }
  | { type: "folder"; path: string }
  | { type: "zip"; path: string };

const KIND_FILTERS: Record<string, string> = {
  discover: "all",
  templates: "template",
  plugins: "plugin",
  projects: "component",
};

function KindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

export function MarketplacePane() {
  const [tab, setTab] = useState<"discover" | "templates" | "plugins" | "projects" | "mylistings" | "sell">(
    "discover"
  );
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [kind, setKind] = useState("template");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const buyerId = "local";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const browseKind = KIND_FILTERS[tab];
      const [lst, mine, pur] = await Promise.all([
        window.ride.plugins.browse({ kind: browseKind === "all" ? undefined : browseKind }),
        window.ride.plugins.myListings(buyerId),
        window.ride.plugins.purchases(buyerId),
      ]);
      setListings(lst);
      setMyListings(mine);
      setPurchases(pur.map((p) => p.purchase.listingId));
    } finally {
      setLoading(false);
    }
  }, [tab, buyerId]);

  useEffect(() => {
    void refresh();
    return window.ride.plugins.onChange(() => void refresh());
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return listings.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (q && !`${l.title} ${l.description} ${l.tags.join(" ")}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [listings, query, category]);

  const purchased = (id: string) => purchases.includes(id);

  async function doBuy(listing: MarketplaceListing) {
    setBusy(true);
    setMsg(null);
    try {
      const rec = await window.ride.plugins.purchase(listing.id, buyerId);
      setMsg({
        kind: "ok",
        text: rec ? `${listing.title} purchased — RIDE 30% / creator 70%` : "Already purchased",
      });
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Purchase failed" });
    } finally {
      setBusy(false);
    }
  }

  async function doImport(listing: MarketplaceListing) {
    setBusy(true);
    setMsg(null);
    try {
      const dest = await window.ride.plugins.importBundle(listing.id, buyerId);
      const opened = await window.ride.workspace.open(dest);
      workspace.setWorkspace(opened);
      const tree = await window.ride.workspace.listFiles();
      workspace.setTree(tree as FileNode[]);
      setMsg({ kind: "ok", text: `${listing.title} imported into ${dest}` });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Import failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-4 overflow-hidden">
      <div className="flex items-center gap-1 border-b border-hairline bg-canvas-soft/40 px-4">
        {([
          ["discover", "Discover"],
          ["templates", "Templates"],
          ["plugins", "Plugins"],
          ["projects", "Projects"],
          ["mylistings", "My Listings"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex h-10 items-center px-3 text-xs transition-colors ride-focus-ring ${
              tab === id ? "font-semibold text-ink" : "text-mute hover:text-body"
            }`}
          >
            {label}
            {tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-ember" />}
          </button>
        ))}
        <button
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm border border-hairline p-1 text-mute transition-colors hover:text-ink"
          title="Open the marketplace in the browser"
          onClick={() => void window.ride.app.openExternal("https://ride.dev/marketplace")}
        >
          <Store className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {msg && (
          <div
            className={`mb-2 rounded-sm px-2.5 py-1.5 text-[11px] ${
              msg.kind === "ok" ? "bg-success/10 text-success" : "bg-error/10 text-error"
            }`}
          >
            {msg.text}
          </div>
        )}

        {tab === "discover" && (
          <>
            <div className="relative overflow-hidden rounded-xl border border-hairline bg-gradient-to-br from-brand-ember/15 via-brand-orange/10 to-brand-magenta/15 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-mono text-lg font-bold text-ink">RIDE Marketplace</h2>
                  <p className="mt-1 max-w-lg text-[11px] leading-4 text-body">
                    Browse, buy and sell production-ready templates. Every sale splits — you keep 70% as a creator,
                    or one-click import as a buyer.
                  </p>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
                  <input
                    className="h-9 w-full rounded-md border border-hairline bg-canvas/80 pl-9 pr-3 text-xs text-ink placeholder:text-mute outline-none focus:border-brand-ember/50 ride-focus-ring"
                    placeholder="Search templates, frameworks, tags…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-mute">
                <span className="flex items-center gap-1.5">
                  <Store className="h-3 w-3 text-brand-ember" />
                  <b className="text-body">{filtered.length}</b> {filtered.length === 1 ? "item" : "items"}
                </span>
                <span className="flex items-center gap-1.5">
                  <BadgeCheck className="h-3 w-3 text-success" />
                  <b className="text-body">{listings.filter((l) => l.verified).length}</b> verified
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="h-3 w-3 text-warning" />
                  <b className="text-body">
                    {listings.length ? (listings.reduce((s, l) => s + l.rating, 0) / listings.length).toFixed(1) : "—"}
                  </b> avg rating
                </span>
                <span className="flex items-center gap-1.5">
                  <Download className="h-3 w-3" />
                  <b className="text-body">
                    {listings.reduce((s, l) => s + l.installCount, 0).toLocaleString()}
                  </b> installs
                </span>
                <span className="ml-auto hidden items-center gap-1 rounded-full border border-hairline bg-canvas/60 px-2 py-0.5 sm:flex">
                  70% creator / 30% RIDE
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(["all", ...TEMPLATE_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`h-6.5 rounded-full border px-2.5 text-[11px] transition-colors ride-focus-ring ${
                    category === c
                      ? "border-brand-ember/50 bg-brand-ember/15 font-medium text-ink"
                      : "border-hairline bg-canvas text-mute hover:border-hairline-strong hover:text-body"
                  }`}
                >
                  {c === "all" ? "All" : CATEGORY_LABEL[c] ?? c}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
                : filtered.map((l) => {
                    const mine = l.creatorId === buyerId;
                    const owned = purchased(l.id) || mine;
                    const canImport = Boolean(l.bundleRef) && owned;
                    const style = CATEGORY_STYLE[l.category] ?? CATEGORY_FALLBACK;
                    const Icon = style.icon;
                    return (
                      <div
                        key={l.id}
                        className="group flex flex-col overflow-hidden rounded-lg border border-hairline bg-canvas transition-colors hover:border-hairline-strong"
                      >
                        <div className={`relative flex h-24 items-center justify-center bg-gradient-to-br ${style.grad}`}>
                          <Icon className="h-9 w-9 text-ink/60 transition-transform group-hover:scale-110" />
                          <span className="absolute top-2 right-2 rounded-md border border-hairline bg-canvas/90 px-1.5 py-0.5 text-[11px] font-semibold text-ink">
                            {priceLabel(l)}
                          </span>
                          {l.verified && (
                            <span className="absolute top-2 left-2 flex items-center gap-0.5 rounded-full bg-canvas/90 px-1.5 py-0.5 text-[9px] text-success">
                              <BadgeCheck className="h-2.5 w-2.5" /> verified
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5 p-3">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold text-ink">{l.title}</span>
                            {mine && (
                              <span className="shrink-0 rounded-full bg-canvas-soft-2 px-1.5 py-px text-[9px] text-mute">
                                yours
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 min-h-8 text-[11px] leading-4 text-body">
                            {l.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-mute">
                            {l.kind && (
                              <span className="rounded-sm bg-canvas-soft px-1.5 py-px text-[9px]">
                                {KindLabel(l.kind)}
                              </span>
                            )}
                            {l.framework && (
                              <span className="rounded-sm bg-canvas-soft px-1.5 py-px text-[9px]">
                                {l.framework}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 text-warning" /> {l.rating.toFixed(1)}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Download className="h-2.5 w-2.5" /> {l.installCount.toLocaleString()}
                            </span>
                            <span className="truncate">{l.creatorName}</span>
                          </div>
                          <div className="mt-auto pt-1.5">
                            {canImport ? (
                              <button
                                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring"
                                disabled={busy}
                                onClick={() => void doImport(l)}
                              >
                                <Zap className="h-3 w-3" /> Import into workspace
                              </button>
                            ) : l.bundleRef ? (
                              <button
                                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring"
                                disabled={busy}
                                onClick={() => void doBuy(l)}
                              >
                                <ShoppingBag className="h-3 w-3" />
                                {l.pricePaise === 0 ? "Claim free" : `Buy for ${priceLabel(l)}`}
                              </button>
                            ) : (
                              <span className="block rounded-md border border-dashed border-hairline py-1.5 text-center text-[10px] text-mute">
                                no bundle yet
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>

            {!loading && !filtered.length && (
              <div className="mt-3 rounded-xl border border-dashed border-hairline-strong p-10 text-center">
                <Store className="mx-auto h-8 w-8 text-mute" />
                <h3 className="mt-3 font-mono text-sm font-semibold text-ink">
                  {query || category !== "all"
                    ? "Nothing matches your search"
                    : "The marketplace is empty"}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-[11px] leading-4 text-mute">
                  {query || category !== "all"
                    ? "Try a different search or category."
                    : "Be the first to list a template — sell your project and keep 70% of every sale."}
                </p>
                {!(query || category !== "all") && (
                  <button
                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 ride-focus-ring"
                    onClick={() => setTab("mylistings")}
                  >
                    <Upload className="h-3 w-3" /> Start selling
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {tab === "sell" && (
          <SellForm
            onSubmitted={() => {
              setTab("mylistings");
              void refresh();
            }}
            onMessage={setMsg}
          />
        )}

        {tab === "mylistings" && (
          <MyListings listings={myListings} onChanged={() => void refresh()} setMsg={setMsg} onSell={() => setTab("sell")} />
        )}
      </div>
    </div>
  );
}

// ── Sell form ───────────────────────────────────────────────────────────────

function SellForm({
  onSubmitted,
  onMessage,
}: {
  onSubmitted: () => void;
  onMessage: (m: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  // ... same as before (kept unchanged) ...
  const [sourceMode, setSourceMode] = useState<"workspace" | "folder" | "zip">("workspace");
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [bundle, setBundle] = useState<BundleInfo | null>(null);
  const [staging, setStaging] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [category, setCategory] = useState("web");
  const [tags, setTags] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [saving, setSaving] = useState(false);

  const source: SellSource | null =
    sourceMode === "workspace"
      ? workspace.state.root
        ? { type: "workspace" }
        : null
      : sourceMode === "folder"
      ? folderPath
        ? { type: "folder", path: folderPath }
        : null
      : zipPath
      ? { type: "zip", path: zipPath }
      : null;

  const pricePaise = Math.max(0, Math.round((parseFloat(priceRupees) || 0) * 100));
  const commission = Math.round(pricePaise * 0.3);
  const creator = pricePaise - commission;

  async function stage() {
    if (!source) return;
    setStaging(true);
    onMessage(null);
    try {
      const info = await window.ride.plugins.prepareBundle(source, workspace.state.root ?? undefined);
      setBundle(info);
      if (!title) setTitle(info.rootName);
      onMessage({ kind: "ok", text: `Upload staged — ${info.framework} · ${info.fileCount} files` });
    } catch (e) {
      onMessage({ kind: "err", text: e instanceof Error ? e.message : "Staging failed" });
    } finally {
      setStaging(false);
    }
  }

  async function submit() {
    if (!bundle || !title.trim()) return;
    if (!description.trim()) {
      onMessage({ kind: "err", text: "Add a description buyers can read." });
      return;
    }
    setSaving(true);
    onMessage(null);
    try {
      await window.ride.plugins.submit({
        creatorId: "local",
        creatorName: "You",
        kind: "template",
        title: title.trim(),
        description: description.trim(),
        pricePaise,
        category,
        tags: tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
        version: version.trim() || "1.0.0",
      });
      onMessage({ kind: "ok", text: "Template submitted for review — it will appear on the marketplace once approved." });
      onSubmitted();
    } catch (e) {
      onMessage({ kind: "err", text: e instanceof Error ? e.message : "Submit failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Upload source</label>
        <div className="flex gap-1">
          <button
            className={`${btnCls} flex-1`}
            onClick={() => setSourceMode("workspace")}
            title={workspace.state.root ?? "Open a workspace first"}
          >
            <FolderOpen className="mr-1 inline h-3 w-3" /> Current project
          </button>
          <button className={`${btnCls} flex-1`} onClick={() => setSourceMode("folder")}>
            <HardDrive className="mr-1 inline h-3 w-3" /> Folder
          </button>
          <button className={`${btnCls} flex-1`} onClick={() => setSourceMode("zip")}>
            <Download className="mr-1 inline h-3 w-3" /> ZIP
          </button>
        </div>

        {sourceMode === "folder" && (
          <div className="mt-1.5 flex gap-1">
            <input className={inputCls} readOnly placeholder="Choose a folder…" value={folderPath ?? ""} />
            <button className={btnCls} onClick={() => void window.ride.app.pickFolder().then(setFolderPath)}>
              Browse
            </button>
          </div>
        )}
        {sourceMode === "zip" && (
          <div className="mt-1.5 flex gap-1">
            <input className={inputCls} readOnly placeholder="Choose a ZIP…" value={zipPath ?? ""} />
            <button className={btnCls} onClick={() => void window.ride.app.pickZip().then(setZipPath)}>
              Browse
            </button>
          </div>
        )}

        <button className={`${btnCls} mt-1.5 w-full`} disabled={!source || staging} onClick={() => void stage()}>
          {staging ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Upload className="mr-1 inline h-3 w-3" />}
          {bundle ? "Re-stage upload" : "Stage upload & detect stack"}
        </button>
      </div>

      {bundle && (
        <div className="rounded-sm border border-hairline bg-canvas-soft p-2">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-mute">
            <Check className="h-3 w-3 text-success" /> Bundle ready
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-body">
            <span className="rounded-sm bg-canvas px-1.5 py-px">{bundle.rootName}</span>
            <span className="rounded-sm bg-canvas px-1.5 py-px">{bundle.framework}</span>
            <span className="rounded-sm bg-canvas px-1.5 py-px">{bundle.language}</span>
            <span className="rounded-sm bg-canvas px-1.5 py-px">{bundle.fileCount} files</span>
            <span className="rounded-sm bg-canvas px-1.5 py-px">{fmtBytes(bundle.sizeBytes)}</span>
          </div>
          {bundle.deps.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {bundle.deps.slice(0, 12).map((d) => (
                <span key={d} className="rounded-full bg-canvas px-1.5 py-px text-[9px] text-mute">
                  {d}
                </span>
              ))}
              {bundle.deps.length > 12 && (
                <span className="text-[9px] text-mute">+{bundle.deps.length - 12} more</span>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label className={labelCls} htmlFor="mk-title">Title</label>
        <input
          id="mk-title"
          className={inputCls}
          placeholder="e.g. SaaS Dashboard Pro"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="mk-desc">Description</label>
        <textarea
          id="mk-desc"
          className="h-20 w-full resize-none rounded-sm border border-hairline bg-canvas p-2 text-xs text-ink placeholder:text-mute focus:border-primary ride-focus-ring"
          placeholder="What is it? What's included? What can buyers do with it?"
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} htmlFor="mk-price">Price (₹)</label>
          <input
            id="mk-price"
            className={inputCls}
            type="number"
            min={0}
            step="0.01"
            placeholder="0 = free"
            value={priceRupees}
            onChange={(e) => setPriceRupees(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="mk-ver">Version</label>
          <input
            id="mk-ver"
            className={inputCls}
            placeholder="1.0.0"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls} htmlFor="mk-cat">Category</label>
          <select
            id="mk-cat"
            className="h-7 w-full rounded-sm border border-hairline bg-canvas px-1.5 text-[11px] text-body"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="mk-tags">Tags (comma separated)</label>
          <input
            id="mk-tags"
            className={inputCls}
            placeholder="saas, dark, charts"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>

      {pricePaise > 0 && (
        <div className="rounded-sm border border-hairline bg-canvas-soft p-2 text-[11px]">
          <div className="flex justify-between text-body">
            <span>Buyer pays</span>
            <span className="font-mono font-semibold text-ink">
              ₹{(pricePaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-1 flex justify-between text-mute">
            <span>RIDE commission (30%)</span>
            <span className="font-mono">−₹{(commission / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="mt-1 flex justify-between text-body">
            <span>You earn (70%)</span>
            <span className="font-mono font-semibold text-success">
              ₹{(creator / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      <button
        className={`${primaryBtnCls} w-full`}
        disabled={!bundle || !title.trim() || !description.trim() || saving}
        onClick={() => void submit()}
      >
        {saving ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : <Upload className="mr-1 inline h-3 w-3" />}
        Submit for review
      </button>
      <p className="text-center text-[10px] leading-4 text-mute">
        Listings are security-scanned and reviewed before publishing. You keep 70% of every sale.
      </p>
    </div>
  );
}

// ── My listings ─────────────────────────────────────────────────────────────

function MyListings({
  listings,
  onChanged,
  setMsg,
  onSell,
}: {
  listings: MarketplaceListing[];
  onChanged: () => void;
  setMsg: (m: { kind: "ok" | "err"; text: string } | null) => void;
  onSell: () => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending" | "rejected">(
    "all"
  );

  async function remove(id: string) {
    setDeleting(id);
    try {
      await window.ride.plugins.deleteListing(id);
      setMsg({ kind: "ok", text: "Listing deleted" });
      onChanged();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Delete failed" });
    } finally {
      setDeleting(null);
    }
  }

  const filteredListings = useMemo(() => {
    if (statusFilter === "all") return listings;
    return listings.filter((l) => l.status === statusFilter);
  }, [listings, statusFilter]);

  return (
    <div className="space-y-1.5 max-w-md mx-auto">
      <div className="flex flex-col gap-1.5 px-4 py-2 border-b border-hairline bg-canvas-soft/40">
        <div className="flex gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-sm px-2.5 py-1.5 text-[10px] font-medium transition-colors ride-focus-ring ${
              statusFilter === "all"
                ? "bg-primary/15 text-ink border-primary"
                : "text-mute hover:bg-canvas hover:text-ink border border-hairline"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("published")}
            className={`rounded-sm px-2.5 py-1.5 text-[10px] font-medium transition-colors ride-focus-ring ${
              statusFilter === "published"
                ? "bg-success/10 text-success border border-success/50"
                : "text-mute hover:bg-canvas hover:text-ink border border-hairline"
            }`}
          >
            Published
</button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`rounded-sm px-2.5 py-1.5 text-[10px] font-medium transition-colors ride-focus-ring ${
              statusFilter === "pending"
                ? "bg-warning/10 text-warning border border-warning/50"
                : "text-mute hover:bg-canvas hover:text-ink border border-hairline"
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`rounded-sm px-2.5 py-1.5 text-[10px] font-medium transition-colors ride-focus-ring ${
              statusFilter === "rejected"
                ? "bg-error/10 text-error border border-error/50"
                : "text-mute hover:bg-canvas hover:text-ink border border-hairline"
            }`}
          >
            Rejected
          </button>
        </div>
      </div>

      {filteredListings.length > 0 ? (
        <div className="space-y-1.5 p-4">
          {filteredListings.map((l) => (
            <div key={l.id} className="rounded-sm border border-hairline bg-canvas p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-ink">{l.title}</span>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-body">
                    {l.description}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-mute">
                    {l.framework && (
                      <span className="rounded-sm bg-canvas-soft px-1 py-px">{l.framework}</span>
                    )}
                    <span className="rounded-sm bg-canvas-soft px-1 py-px">
                      {CATEGORY_LABEL[l.category] ?? l.category}
                    </span>
                    <span className="rounded-sm bg-canvas-soft px-1 py-px">v{l.version}</span>
                    <span className="flex items-center gap-0.5">
                      <Download className="h-2.5 w-2.5" /> {l.installCount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs font-semibold text-ink">{priceLabel(l)}</span>
                  {l.status !== "published" && (
                    <button
                      className={`${btnCls} hover:text-error}`}
                      disabled={deleting === l.id}
                      onClick={() => void remove(l.id)}
                    >
                      {deleting === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-hairline px-6 py-12 text-center text-mute">
          <Store className="mx-auto h-8 w-8 mb-3" />
          <h3 className="text-[12px] font-medium text-body mb-2">
            You haven't listed anything yet
          </h3>
          <p className="text-[11px] leading-5">
            List your first template on the RIDE Marketplace. All sales split 70% creator / 30% RIDE.
          </p>
          <button
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 ride-focus-ring"
            onClick={onSell}
          >
            <Upload className="h-3 w-3" /> Sell on Marketplace
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MarketplaceListing["status"] }) {
  const cls =
    status === "published"
      ? "bg-success/10 text-success"
      : status === "pending"
        ? "bg-warning/10 text-warning"
        : "bg-error/10 text-error";
  const label = status === "published" ? "published" : status === "pending" ? "under review" : "rejected";
  return <span className={`rounded-full px-1.5 py-px text-[9px] ${cls}`}>{label}</span>;
}

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-hairline bg-canvas">
      <div className="h-24 animate-pulse bg-canvas-soft" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-2/3 rounded-sm bg-canvas-soft" />
        <div className="h-2.5 w-full rounded-sm bg-canvas-soft" />
        <div className="h-2.5 w-4/5 rounded-sm bg-canvas-soft" />
        <div className="h-8 w-full rounded-md bg-canvas-soft" />
      </div>
    </div>
  );
}