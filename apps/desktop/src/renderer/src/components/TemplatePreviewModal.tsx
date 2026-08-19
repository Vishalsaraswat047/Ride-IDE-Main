import { useEffect, useState } from "react";
import type { RideTemplate } from "@ride/contracts";
import { Check, Info, Loader2, Sparkles, X } from "lucide-react";
import { createFromTemplate } from "../lib/hooks";

interface TemplatePreviewModalProps {
  template: RideTemplate;
  onClose: () => void;
}

export function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void window.ride.template.preview(template.id).then((h) => {
      if (alive) setHtml(h);
    });
    return () => {
      alive = false;
    };
  }, [template.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (infoOpen) setInfoOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, infoOpen]);

  const useTemplate = async () => {
    setBusy(true);
    try {
      await createFromTemplate(template.id);
    } catch (err) {
      console.error("Failed to create from template", err);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70" onClick={onClose}>
      <div className="flex h-full w-full flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline bg-canvas px-4" style={{ paddingRight: "env(titlebar-area-width, 170px)" }}>
          <span className="truncate text-sm font-medium text-ink">{template.name}</span>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] text-mute">{template.framework}</span>
          <span className="hidden rounded-full bg-canvas px-2 py-0.5 text-[10px] text-mute sm:inline">{template.styling}</span>
          <button
            onClick={() => setInfoOpen((o) => !o)}
            className={`ml-2 flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs transition-colors ride-focus-ring ${
              infoOpen ? "border-link bg-link-bg-soft text-link" : "border-hairline text-mute hover:text-ink"
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Details</span>
          </button>
          <button
            onClick={() => void useTemplate()}
            disabled={busy}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-60 ride-focus-ring"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Use Template
          </button>
          <button onClick={onClose} className="rounded-sm p-1.5 text-mute transition-colors hover:bg-canvas-soft-2 hover:text-ink ride-focus-ring">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 bg-[#171717]">
            {html ? (
              <iframe title={`${template.name} preview`} srcDoc={html} className="h-full w-full border-0" />
            ) : (
              <div className="flex h-full items-center justify-center gap-2 text-xs text-mute">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
              </div>
            )}
          </div>

          {infoOpen && (
            <div className="absolute inset-y-0 right-0 z-10 flex w-80 flex-col overflow-y-auto border-l border-hairline bg-canvas shadow-level-4">
              <div className="border-b border-hairline px-4 py-3">
                <div className="text-[11px] font-medium text-mute uppercase">Description</div>
                <p className="mt-1 text-xs leading-5 text-body">{template.description}</p>
              </div>
              <div className="flex flex-col gap-4 px-4 py-4">
                <div>
                  <div className="text-[11px] font-medium text-mute uppercase">Specs</div>
                  <dl className="mt-1.5 flex flex-col gap-1 text-xs">
                    {[
                      ["Framework", template.framework],
                      ["Styling", template.styling],
                      ["Icons", "Lucide"],
                      ["Animation", "CSS / Motion"],
                      ["Responsive", "✓"],
                      ["Dark mode", "✓"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <dt className="text-mute">{k}</dt>
                        <dd className="text-right text-body">{v}</dd>
                      </div>
                    ))}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <dt className="text-mute">Verified</dt>
                      <dd className="flex items-center gap-1 text-body">
                        <Check className="h-3 w-3 text-success" /> RIDE Verified
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-mute uppercase">Stack</div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {[
                      ["Framework", template.framework],
                      ["Styling", template.styling],
                      ["UI", template.ui],
                      ["Icons", template.icons],
                      ["Animation", template.animation],
                    ].map(([label, value]) => (
                      <span key={label} className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="shrink-0 text-mute">{label}</span>
                        <span className="text-right text-body">{value}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-mute uppercase">Features</div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {template.features.map((f) => (
                      <span key={f} className="flex items-center gap-1.5 text-xs text-body">
                        <Check className="h-3 w-3 text-success" /> {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 rounded-sm border border-hairline bg-canvas-soft px-2 py-1 text-[11px] text-body">
                    <Sparkles className="h-3 w-3 text-violet" /> AI compatible — agent can rebuild this
                  </span>
                  <span className="rounded-sm border border-hairline bg-canvas-soft px-2 py-1 text-[11px] text-mute">
                    {template.tags.join(" · ")}
                  </span>
                </div>
                <button
                  onClick={() => void useTemplate()}
                  disabled={busy}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-sm bg-primary text-sm font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-60 ride-focus-ring"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Use Template
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}