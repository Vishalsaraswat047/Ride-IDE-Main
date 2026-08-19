import { useEffect } from "react";
import { ArrowLeft, Store, X } from "lucide-react";
import { MarketplacePane } from "./MarketplacePane";

export function MarketplacePage({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline bg-canvas-soft/50 px-3">
        <button
          onClick={onClose}
          className="flex h-7 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-2.5 text-[11px] font-medium text-body transition-colors hover:border-hairline-strong hover:text-ink ride-focus-ring"
          title="Back to the main IDE (Esc)"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to IDE
        </button>
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-orange/25 to-brand-magenta/20 ring-1 ring-brand-ember/25">
          <Store className="h-3.5 w-3.5 text-brand-ember" />
        </span>
        <div className="min-w-0">
          <h1 className="font-mono text-sm font-bold leading-4 text-ink">Marketplace</h1>
          <p className="text-[10px] text-mute">Browse, buy and sell templates and plugins</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm border border-hairline text-mute transition-colors hover:text-ink ride-focus-ring"
          title="Close marketplace (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <MarketplacePane />
      </div>
    </div>
  );
}