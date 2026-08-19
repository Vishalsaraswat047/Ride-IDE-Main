import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Check, Search, X, Sparkles, Eye, Code2, Loader2 } from "lucide-react";
import { cn } from "../lib/cn";
import type { GalaxyComponent, GalaxyCategory } from "@ride/contracts";

const PAGE_SIZE = 24;

/** Gallery browser for the vendored uiverse.io "galaxy" collection. */
export function GalaxyPanel({ api }: { api: { list: () => Promise<{ components: GalaxyComponent[]; categories: GalaxyCategory[] }>; read: (relPath: string) => Promise<{ ok: boolean; content?: string; attribution?: string; error?: string }> } }) {
  const [components, setComponents] = React.useState<GalaxyComponent[]>([]);
  const [categories, setCategories] = React.useState<GalaxyCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [selected, setSelected] = React.useState<GalaxyComponent | null>(null);
  const [detail, setDetail] = React.useState<{ content?: string; attribution?: string; error?: string; loading: boolean } | null>(null);

  React.useEffect(() => {
    void api
      .list()
      .then((res) => {
        setComponents(res.components);
        setCategories(res.categories);
      })
      .catch(() => setComponents([]))
      .finally(() => setLoading(false));
  }, [api]);

  React.useEffect(() => {
    setPage(0);
  }, [category, query]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return components.filter((c) => {
      if (category && c.category !== category) return false;
      if (!q) return true;
      return c.filename.replace(".html", "").toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    });
  }, [components, category, query]);

  const pageItems = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const total = components.length;
  const shown = pageItems.length;

  const openDetail = (comp: GalaxyComponent) => {
    setSelected(comp);
    setDetail({ loading: true });
    void api.read(comp.relPath).then((res) => {
      if (res.ok) setDetail({ content: res.content ?? "", attribution: res.attribution, loading: false });
      else setDetail({ content: "", error: res.error ?? "Failed to load", loading: false });
    });
  };

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        {/* header */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-hairline px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-orange/20 to-brand-magenta/25 text-brand-ember" aria-hidden="true">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[13px] font-semibold leading-4 text-ink">Galaxy</p>
              <p className="text-[10.5px] leading-4 text-mute">
                {loading ? "Loading collection…" : `${total.toLocaleString()} components · uiverse.io`}
              </p>
            </div>
            <span className="ml-auto rounded-full border border-hairline bg-canvas-soft px-2 py-0.5 text-[10px] font-medium tabular-nums text-mute">
              {shown} / {filtered.length}
            </span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 3,800+ components…"
              aria-label="Search galaxy components"
              className="h-8 w-full rounded-lg border border-hairline bg-canvas-soft pl-8 pr-8 text-[12.5px] text-ink outline-none transition-colors placeholder:text-mute focus:border-link/40 focus:ring-1 focus:ring-link/15"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                title="Clear search"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-mute transition-colors hover:text-body ride-focus-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* category chips */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-hairline px-4 py-2.5">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ride-focus-ring",
              !category ? "border-link/40 bg-link/10 text-link" : "border-hairline bg-canvas-soft text-body hover:border-hairline-strong",
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(category === c.id ? null : c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ride-focus-ring",
                category === c.id ? "border-link/40 bg-link/10 text-link" : "border-hairline bg-canvas-soft text-body hover:border-hairline-strong",
              )}
            >
              {c.name}
              <span className="ml-1 text-[10px] text-mute tabular-nums">{c.count}</span>
            </button>
          ))}
        </div>

        {/* grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl border border-hairline bg-canvas-soft" aria-hidden="true" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Search className="h-6 w-6 text-mute" aria-hidden="true" />
              <p className="text-sm text-body">No components match “{query}”</p>
              <p className="text-xs text-mute">Try another keyword or clear the search.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {pageItems.map((comp, i) => (
                  <ComponentCard key={comp.id} comp={comp} index={i} read={api.read} onOpen={() => openDetail(comp)} />
                ))}
              </div>
              {shown < filtered.length && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-hairline bg-canvas-soft px-5 py-2 text-[12.5px] font-medium text-body transition-colors hover:border-hairline-strong hover:text-ink ride-focus-ring"
                  >
                    Load more ({filtered.length - shown} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* footer */}
        <p className="shrink-0 border-t border-hairline px-4 py-2 text-[10px] text-mute">
          Collection from{" "}
          <a href="https://uiverse.io" target="_blank" rel="noreferrer" className="text-link hover:underline" translate="no">
            uiverse.io
          </a>{" "}
          — 3,800+ community UI elements, MIT licensed, vendored at{" "}
          <code className="rounded bg-canvas-soft px-1 font-mono text-[9.5px]" translate="no">
            vendor/galaxy
          </code>
        </p>

        {/* detail dialog */}
        <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[min(880px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-level-5 ride-focus-ring">
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="flex max-h-full flex-col"
                  >
                    {/* dialog header */}
                    <div className="flex shrink-0 items-center gap-3 border-b border-hairline px-5 py-3.5">
                      <div className="min-w-0">
                        <Dialog.Title className="truncate font-mono text-[13px] font-medium text-ink" translate="no">
                          {selected.filename}
                        </Dialog.Title>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-mute">
                          <span className="rounded-full bg-canvas-soft px-1.5 py-px font-medium text-body">{selected.category}</span>
                          {detail?.attribution && <span className="truncate" translate="no">{detail.attribution.replace("From Uiverse.io by", "by")}</span>}
                        </p>
                      </div>
                      <Dialog.Close asChild>
                        <button
                          title="Close (Esc)"
                          aria-label="Close preview"
                          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-mute transition-colors hover:bg-canvas-soft hover:text-body ride-focus-ring"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Dialog.Close>
                    </div>

                    {/* dialog body */}
                    <div className="grid min-h-0 flex-1 grid-rows-[240px_1fr] md:grid-cols-2 md:grid-rows-1">
                      {/* preview */}
                      <div className="relative overflow-hidden border-b border-hairline bg-white md:border-b-0 md:border-r">
                        {detail?.loading ? (
                          <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-mute" aria-label="Loading preview" />
                          </div>
                        ) : detail?.content ? (
                          <iframe
                            title={`Preview of ${selected.filename}`}
                            srcDoc={`<style>html,body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;min-height:100%;background:#fff;font-family:system-ui,sans-serif}</style>${detail.content}`}
                            sandbox="allow-scripts"
                            className="h-full w-full border-0 bg-white"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-mute">{detail?.error ?? "No preview"}</div>
                        )}
                        <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white/90 px-2 py-0.5 text-[10px] font-medium text-body shadow-level-1" aria-hidden="true">
                          <Eye className="h-3 w-3" /> Live preview
                        </span>
                      </div>

                      {/* code */}
                      <div className="flex min-h-0 flex-col">
                        <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-4 py-2.5">
                          <Code2 className="h-3.5 w-3.5 text-mute" aria-hidden="true" />
                          <span className="text-[11px] font-medium text-mute">HTML + CSS</span>
                          <CopyCodeButton
                            code={detail?.content ?? ""}
                            className="ml-auto"
                            title="Copy component code"
                          />
                        </div>
                        <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-5 text-body whitespace-pre-wrap">
                          {detail?.content ?? "…"}
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </Tooltip.Provider>
  );
}

const contentCache = new Map<string, string>();

function ComponentCard({
  comp,
  index,
  read,
  onOpen,
}: {
  comp: GalaxyComponent;
  index: number;
  read: (relPath: string) => Promise<{ ok: boolean; content?: string; attribution?: string; error?: string }>;
  onOpen: () => void;
}) {
  const [content, setContent] = React.useState<string | null>(contentCache.get(comp.relPath) ?? null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (content) return;
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          void read(comp.relPath).then((res) => {
            if (!alive || !res.ok || !res.content) return;
            contentCache.set(comp.relPath, res.content);
            setContent(res.content);
          });
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [comp.relPath, content, read]);

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index % PAGE_SIZE, 8) * 0.02 }}
      className="group flex flex-col overflow-hidden rounded-xl border border-hairline bg-canvas text-left transition-all duration-200 hover:border-link/40 hover:shadow-level-3 ride-focus-ring"
      title={`Preview ${comp.filename}`}
    >
      <div ref={ref} className="relative flex h-36 items-center justify-center overflow-hidden bg-white">
        {content ? (
          <iframe
            title={`Preview of ${comp.filename}`}
            srcDoc={`<style>html,body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;min-height:100%;background:#fff;font-family:system-ui,sans-serif}</style>${content}`}
            sandbox="allow-scripts"
            className="pointer-events-none h-full w-full border-0 bg-white"
            loading="lazy"
          />
        ) : (
          <div className="animate-pulse text-mute" aria-hidden="true">
            <Sparkles className="h-5 w-5" />
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/80 to-transparent" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 items-center gap-2 border-t border-hairline px-2.5 py-2">
        <span className="min-w-0 truncate font-mono text-[10.5px] text-body" translate="no">
          {comp.filename.replace(".html", "")}
        </span>
        <span className="ml-auto shrink-0 text-[9px] font-medium text-mute opacity-0 transition-opacity group-hover:opacity-100">Open</span>
      </div>
    </motion.button>
  );
}

function CopyCodeButton({ code, className, title }: { code: string; className?: string; title: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (!code) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          onClick={copy}
          disabled={!code}
          aria-label={title}
          title={title}
          className={cn(
            "flex h-6 items-center gap-1 rounded-md border border-hairline bg-canvas-soft px-2 text-[11px] font-medium text-body transition-colors hover:border-hairline-strong hover:text-ink disabled:opacity-40 ride-focus-ring",
            copied && "border-success/40 text-success",
            className,
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="z-50 rounded-md bg-ink px-2 py-1 text-[10.5px] text-canvas shadow-level-4" sideOffset={4}>
          {copied ? "Copied to clipboard" : title}
          <Tooltip.Arrow className="fill-ink" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}