import * as React from "react";
import { motion } from "motion/react";
import { Monitor, ExternalLink, Globe, RefreshCw } from "lucide-react";
import { cn } from "../lib/cn";

export interface Screenshot {
  id: string;
  dataUrl: string;
  viewport: string;
  timestamp: number;
}

export interface BrowserPreviewProps {
  url?: string;
  screenshots: Screenshot[];
  errors: string[];
  liveUrl?: string;
  liveKey?: number;
  onRefresh?: () => void;
  onOpenExternal?: () => void;
  className?: string;
}

export function BrowserPreview({
  url,
  screenshots,
  errors,
  liveUrl,
  liveKey,
  onRefresh,
  onOpenExternal,
  className,
}: BrowserPreviewProps) {
  const latest = screenshots[screenshots.length - 1];
  const live = !latest && liveUrl;

  return (
    <div className={cn("flex h-full flex-col bg-canvas", className)}>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-hairline px-3">
        <Monitor className="h-4 w-4 text-mute" />
        <div className="flex h-6 min-w-0 flex-1 items-center rounded-sm border border-hairline bg-canvas-soft px-2 text-xs text-mute">
          {url ?? "not running"}
        </div>
        <button
          onClick={onRefresh}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-mute transition-colors hover:bg-canvas-soft hover:text-ink"
          title="Reload preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onOpenExternal}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-mute transition-colors hover:bg-canvas-soft hover:text-ink"
          title="Open in external browser"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-canvas-soft">
        {latest ? (
          <motion.img
            key={latest.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            src={latest.dataUrl}
            alt={`Preview at ${latest.viewport}`}
            className="h-full w-full object-cover"
          />
        ) : live ? (
          <iframe
            key={`${String(liveKey ?? 0)}:${live}`}
            src={live}
            title="Live preview"
            className="h-full w-full border-0 bg-white"
            allow="clipboard-read; clipboard-write"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-mute">
            <Monitor className="h-8 w-8" />
            <p className="text-xs">No preview yet — start the dev server and the app will appear here.</p>
          </div>
        )}
        {latest && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] text-white backdrop-blur">
            <Globe className="h-3 w-3" />
            {latest.viewport}
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <div className="max-h-24 shrink-0 overflow-y-auto border-t border-error/30 bg-error/5 px-3 py-2">
          {errors.map((e, i) => (
            <div key={i} className="flex items-start gap-1.5 py-0.5 font-mono text-[11px] leading-4 text-error">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-error" />
              <span className="break-all">{e}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
