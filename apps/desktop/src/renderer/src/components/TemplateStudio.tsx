import { useEffect, useMemo, useState } from "react";
import type { RideTemplate } from "@ride/contracts";
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  Gamepad2,
  Globe,
  LayoutGrid,
  Loader2,
  Monitor,
  Search,
  Smartphone,
  Sparkles,
  TerminalSquare,
  Trash2,
  Wand2,
  FolderOpen,
  FilePlus,
  Layers,
} from "lucide-react";
import { cn } from "@ride/ui";
import { createFromTemplate, newFileAndLoad, openWorkspaceAndLoad, workspace } from "../lib/hooks";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

const SECTIONS = ["websites", "webapps", "ai", "mobile", "desktop", "developer", "games", "starter"] as const;

const SECTION_LABELS: Record<string, string> = {
  websites: "Websites",
  webapps: "Web Apps",
  ai: "AI",
  mobile: "Mobile",
  desktop: "Desktop",
  developer: "Developer",
  games: "Games",
  starter: "Starters",
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  websites: <Globe className="h-4.5 w-4.5" />,
  webapps: <LayoutGrid className="h-4.5 w-4.5" />,
  ai: <Sparkles className="h-4.5 w-4.5" />,
  mobile: <Smartphone className="h-4.5 w-4.5" />,
  desktop: <Monitor className="h-4.5 w-4.5" />,
  developer: <TerminalSquare className="h-4.5 w-4.5" />,
  games: <Gamepad2 className="h-4.5 w-4.5" />,
  starter: <Wand2 className="h-4.5 w-4.5" />,
};

const ACRONYMS = new Set(["AI", "API", "SDK", "CRM", "ERP", "REST", "2D", "3D", "PWA", "CLI"]);

function familyLabel(id: string): string {
  return id
    .split("-")
    .map((w) => {
      const upper = w.toUpperCase();
      return ACRONYMS.has(upper) ? upper : `${w.charAt(0).toUpperCase()}${w.slice(1)}`;
    })
    .join(" ");
}

function TemplateThumb({ template }: { template: RideTemplate }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!template.hasPreview) return;
    let alive = true;
    void window.ride.template.preview(template.id).then((h) => {
      if (alive) setHtml(h);
    });
    return () => {
      alive = false;
    };
  }, [template.id, template.hasPreview]);

  return (
    <div className="absolute inset-0">
      {html ? (
        <iframe
          title={`${template.name} preview`}
          srcDoc={html}
          tabIndex={-1}
          className="pointer-events-none absolute top-0 left-0 h-[200%] w-[200%] origin-top-left scale-50 border-0"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-canvas-soft-2/50 to-canvas-soft">
          <span className="text-mute">{SECTION_ICONS[template.section] ?? <Layers className="h-7 w-7" />}</span>
          <span className="text-[11px] text-mute">{template.name}</span>
        </div>
      )}
    </div>
  );
}

export function TemplateStudio({ onBack }: { onBack?: () => void }) {
  const [builtin, setBuiltin] = useState<RideTemplate[]>([]);
  const [users, setUsers] = useState<RideTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string>("all");
  const [family, setFamily] = useState<string>("");
  const [preview, setPreview] = useState<RideTemplate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [installMsg, setInstallMsg] = useState<string | null>(null);

  useEffect(() => {
    return window.ride.template.onProgress((ev) => {
      if (ev.phase === "starting") {
        setInstallMsg("Scaffolding project…");
      } else if (ev.phase === "design-system") {
        setInstallMsg(`Applying design system: ${ev.templateName}…`);
      } else if (ev.phase === "content") {
        setInstallMsg("Injecting real content…");
      } else if (ev.phase === "quality") {
        setInstallMsg("Running visual QA checks…");
      } else if (ev.phase === "approved") {
        setInstallMsg(ev.verdict ?? "Template approved ✓");
        window.setTimeout(() => setInstallMsg(null), 4000);
      } else if (ev.phase === "failed") {
        setInstallMsg(`QA failed (${ev.score ?? "?"}/100): ${ev.issues?.[0] ?? ev.verdict ?? "see project files"}`);
        window.setTimeout(() => setInstallMsg(null), 8000);
      } else if (ev.phase === "installing") {
        setInstallMsg("Installing dependencies…");
      } else if (ev.phase === "installed") {
        setInstallMsg(ev.ok ? `Dependencies installed ✓` : `Install failed: ${ev.error ?? "unknown error"}`);
        window.setTimeout(() => setInstallMsg(null), 6000);
      }
    });
  }, []);

  const refresh = () => {
    void window.ride.template.list().then((r) => {
      setBuiltin(r.builtin);
      setUsers(r.users);
    });
  };

  useEffect(refresh, []);

  const all = useMemo(() => [...users, ...builtin], [users, builtin]);
  const familyOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of builtin) {
      if (section !== "all" && section !== "mine" && t.section !== section) continue;
      if (!seen.has(t.category)) {
        seen.add(t.category);
        out.push(t.category);
      }
    }
    return out;
  }, [builtin, section]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (section === "mine" && !t.userGenerated) return false;
      if (section !== "all" && section !== "mine" && t.section !== section) return false;
      if (family && t.category !== family) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.features.some((f) => f.toLowerCase().includes(q))
      );
    });
  }, [all, query, section, family]);

  const useTemplate = async (t: RideTemplate) => {
    setBusyId(t.id);
    try {
      await createFromTemplate(t.id);
    } catch (err) {
      console.error("Failed to create from template", err);
    } finally {
      setBusyId(null);
    }
  };

  const removeUserTemplate = async (t: RideTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    await window.ride.template.delete(t.id);
    refresh();
  };

  return (
    <div className="flex h-full flex-col bg-canvas-soft">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-3 px-6 pt-14 pb-8 text-center">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-2 flex items-center gap-1.5 self-start rounded-sm px-2 py-1 text-xs text-mute transition-colors hover:bg-canvas hover:text-ink ride-focus-ring"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          <div className="flex items-center gap-2 rounded-full border border-hairline bg-canvas px-3 py-1 text-xs text-body">
            <Sparkles className="h-3.5 w-3.5 text-violet" />
            RIDE Template Studio — AI-powered
          </div>
          <h1 className="text-4xl font-semibold tracking-[-1.5px] text-ink">What are you building?</h1>
          <p className="max-w-xl text-sm leading-6 text-body">
            Choose a starting point, preview it, or tell the agent what to change. RIDE scaffolds the stack,
            installs the right libraries, and an agent builds the rest.
          </p>
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-mute" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What are you building? Search templates…"
              className="h-11 w-full rounded-md border border-hairline bg-canvas pr-3 pl-10 text-sm text-ink shadow-level-2 outline-none placeholder:text-mute ride-focus-ring"
            />
          </div>
        </div>

        <div className="sticky top-0 z-10 border-y border-hairline bg-canvas-soft/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-6 py-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1">
                {(["all", ...SECTIONS, "mine"] as const).map((c) => {
                  const label = c === "all" ? "All" : c === "mine" ? "My templates" : SECTION_LABELS[c];
                  const count = c === "all" ? all.length : c === "mine" ? users.length : all.filter((t) => t.section === c).length;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setSection(c);
                        setFamily("");
                      }}
                      className={cn(
                        "h-7 rounded-full border px-3 text-[11px] transition-colors",
                        section === c
                          ? "border-ink bg-ink font-medium text-canvas"
                          : "border-hairline bg-canvas text-body hover:text-ink",
                      )}
                    >
                      {label} <span className={section === c ? "opacity-70" : "text-mute"}>{count}</span>
                    </button>
                  );
                })}
              </div>
              {section !== "all" && section !== "mine" && familyOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    onClick={() => setFamily("")}
                    className={cn(
                      "h-6 rounded-full border px-2.5 text-[10px] transition-colors",
                      family === ""
                        ? "border-ink bg-ink font-medium text-canvas"
                        : "border-hairline bg-canvas text-body hover:text-ink",
                    )}
                  >
                    All
                  </button>
                  {familyOptions.map((f) => {
                    const count = builtin.filter((t) => t.section === section && t.category === f).length;
                    return (
                      <button
                        key={f}
                        onClick={() => setFamily(f === family ? "" : f)}
                        className={cn(
                          "h-6 rounded-full border px-2.5 text-[10px] transition-colors",
                          family === f
                            ? "border-ink bg-ink font-medium text-canvas"
                            : "border-hairline bg-canvas text-body hover:text-ink",
                        )}
                      >
                        {familyLabel(f)} <span className={family === f ? "opacity-70" : "text-mute"}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-3 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t) => (
            <div
              key={t.id}
              className="group flex flex-col overflow-hidden rounded-md border border-hairline bg-canvas shadow-level-2 transition-colors hover:border-hairline-strong"
            >
              <div className="relative h-36 shrink-0 overflow-hidden border-b border-hairline bg-[#131313]">
                <TemplateThumb template={t} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                  {t.hasPreview && (
                    <button
                      onClick={() => setPreview(t)}
                      className="flex h-7 items-center gap-1.5 rounded-sm border border-hairline bg-canvas/95 px-3 text-[11px] text-ink transition-colors hover:bg-canvas ride-focus-ring"
                    >
                      <ExternalLink className="h-3 w-3" /> Open Preview
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {t.aiCompatible && (
                      <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10px] text-violet">AI</span>
                    )}
                    {t.userGenerated && (
                      <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] text-cyan">mine</span>
                    )}
                  </div>
                  {t.userGenerated && (
                    <button
                      onClick={() => void removeUserTemplate(t)}
                      className="rounded-sm p-1 text-mute transition-colors hover:bg-canvas-soft hover:text-error"
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-medium text-ink">{t.name}</h3>
                <div className="mt-auto flex items-center gap-2 pt-4">
                  {t.hasPreview && (
                    <button
                      onClick={() => setPreview(t)}
                      className="flex h-7 items-center gap-1 rounded-sm border border-hairline bg-canvas px-2.5 text-[11px] text-body transition-colors hover:bg-canvas-soft hover:text-ink ride-focus-ring"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </button>
                  )}
                  <button
                    onClick={() => void useTemplate(t)}
                    disabled={busyId === t.id}
                    className="ml-auto flex h-7 items-center gap-1 rounded-sm bg-primary px-3 text-[11px] font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-60 ride-focus-ring"
                  >
                    {busyId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Use
                  </button>
                </div>
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
              <Search className="h-6 w-6 text-mute" />
              <p className="text-xs text-mute">No templates match “{query}”.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-3 border-t border-hairline bg-canvas/90 px-6 py-4 backdrop-blur">
        {installMsg && (
          <span
            className={`mr-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${
              installMsg.startsWith("Install failed") || installMsg.startsWith("QA failed")
                ? "bg-error/10 text-error"
                : installMsg.includes("✓")
                  ? "bg-success/10 text-success"
                  : "bg-link/10 text-link"
            }`}
          >
            {!installMsg.includes("✓") &&
              !installMsg.startsWith("Install failed") &&
              !installMsg.startsWith("QA failed") && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            {installMsg}
          </span>
        )}
        <span className="text-[11px] text-mute">
          {all.length} templates · {builtin.filter((t) => t.aiCompatible).length} agent-compatible
        </span>
        <button
          onClick={() => void newFileAndLoad(workspace)}
          className="flex h-9 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-4 text-sm text-body transition-colors hover:bg-canvas-soft hover:text-ink ride-focus-ring"
        >
          <FilePlus className="h-3.5 w-3.5" /> New file
        </button>
        <button
          onClick={() => void openWorkspaceAndLoad(workspace)}
          className="flex h-9 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-4 text-sm text-body transition-colors hover:bg-canvas-soft hover:text-ink ride-focus-ring"
        >
          <FolderOpen className="h-3.5 w-3.5" /> Open existing project
        </button>
      </div>

      {preview && <TemplatePreviewModal template={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}