import * as React from "react";
import { Check, Cpu, Globe, KeyRound, Loader2, RefreshCw, Star } from "lucide-react";
import type { RideModel } from "@ride/contracts";
import { cn } from "../lib/cn";

export interface ModelSelectorProps {
  models: RideModel[];
  selectedId?: string;
  onSelect: (modelId: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

const KIND_LABEL: Record<RideModel["kind"], { label: string; icon: React.ReactNode }> = {
  local: { label: "Local", icon: <Cpu className="h-3 w-3" /> },
  free: { label: "Free", icon: <Globe className="h-3 w-3" /> },
  byok: { label: "BYOK", icon: <KeyRound className="h-3 w-3" /> },
  remote: { label: "Remote", icon: <Globe className="h-3 w-3" /> },
};

export function ModelSelector({
  models,
  selectedId,
  onSelect,
  onRefresh,
  loading,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selected = models.find((m) => m.id === selectedId);
  const groups = React.useMemo(() => {
    const g: Record<string, RideModel[]> = { local: [], free: [], byok: [], remote: [] };
    for (const m of models) g[m.kind]?.push(m);
    return g;
  }, [models]);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body transition-colors hover:bg-canvas-soft ride-focus-ring"
        title="Select model"
      >
        <Cpu className="h-3.5 w-3.5 text-mute" />
        <span className="max-w-40 truncate">{selected?.label ?? "No model"}</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-mute" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-72 rounded-md border border-hairline bg-canvas shadow-level-4">
            <div className="flex h-8 items-center justify-between border-b border-hairline px-3">
              <span className="text-[11px] font-medium tracking-wide text-body uppercase">Model</span>
              <button
                onClick={() => {
                  onRefresh?.();
                  setOpen(false);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-sm text-mute transition-colors hover:bg-canvas-soft hover:text-ink"
                title="Refresh models"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {Object.entries(groups).map(([kind, list]) => (
                <div key={kind} className="mb-1.5">
                  <div className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium tracking-wide text-mute uppercase">
                    {KIND_LABEL[kind as RideModel["kind"]]!.icon}
                    {KIND_LABEL[kind as RideModel["kind"]]!.label}
                  </div>
                  {list.length === 0 && (
                    <div className="px-2 pb-1 text-[11px] text-mute">None detected</div>
                  )}
{list.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelect(m.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-body transition-colors hover:bg-canvas-soft hover:text-ink ride-focus-ring"
                      >
                        <span className="min-w-0 flex-1 truncate flex items-center gap-1.5">
                          {m.label}
                          {m.recommended && (
                            <span title="Recommended model">
                              <Star className="h-3 w-3 text-amber-500" />
                            </span>
                          )}
                        </span>
                        {m.context && (
                          <span className="shrink-0 text-[10px] text-mute">
                            {(m.context / 1024).toFixed(0)}k
                          </span>
                        )}
                        {m.id === selectedId && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
