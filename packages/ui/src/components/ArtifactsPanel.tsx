import * as React from "react";
import { motion } from "motion/react";
import {
  Archive, FileDiff, FileCode2, FileText, Image, ScrollText, FlaskConical,
  FileBarChart, Camera, Video, ChevronDown, ChevronRight, MessageSquarePlus, Trash2, ClipboardCopy,
} from "lucide-react";
import { cn } from "../lib/cn";

export type ArtifactKind = "plan" | "diff" | "code" | "markdown" | "image" | "log" | "test-result" | "report" | "screenshot" | "recording";

export interface ArtifactItem {
  id: string;
  sessionId: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface ArtifactsPanelProps {
  artifacts: ArtifactItem[];
  onDelete?: (id: string) => void;
  onFeedback?: (artifactId: string, feedback: string) => void;
  onOpenArtifact?: (artifact: ArtifactItem) => void;
  className?: string;
}

const KIND_ICONS: Record<ArtifactKind, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  plan: { icon: ScrollText, label: "Plan" },
  diff: { icon: FileDiff, label: "Diff" },
  code: { icon: FileCode2, label: "Code" },
  markdown: { icon: FileText, label: "Document" },
  image: { icon: Image, label: "Image" },
  log: { icon: ScrollText, label: "Log" },
  "test-result": { icon: FlaskConical, label: "Test result" },
  report: { icon: FileBarChart, label: "Report" },
  screenshot: { icon: Camera, label: "Screenshot" },
  recording: { icon: Video, label: "Recording" },
};

const CONTENT_PREVIEW = 220;

export function ArtifactsPanel({ artifacts, onDelete, onFeedback, onOpenArtifact, className }: ArtifactsPanelProps) {
  const [open, setOpen] = React.useState<Set<string>>(new Set());
  const [feedback, setFeedback] = React.useState<Record<string, string>>({});

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copy = async (text: string) => {
    await navigator.clipboard?.writeText(text).catch(() => {});
  };

  const submitFeedback = (id: string) => {
    const text = (feedback[id] ?? "").trim();
    if (!text) return;
    onFeedback?.(id, text);
    setFeedback((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex h-9 shrink-0 items-center border-b border-hairline px-3">
        <Archive className="h-4 w-4 text-mute" />
        <span className="ml-2 text-xs font-medium text-body">Artifacts</span>
        <span className="ml-auto rounded-full bg-canvas-soft-2 px-2 py-0.5 text-[10px] text-mute">{artifacts.length}</span>
      </div>
      {artifacts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-canvas-soft">
            <Archive className="h-5 w-5 text-mute" />
          </div>
          <p className="text-sm font-medium text-body">No artifacts yet</p>
          <p className="text-xs text-mute">Plans, diffs, reports and test results produced by the agent will appear here.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {artifacts.map((artifact) => {
            const meta = KIND_ICONS[artifact.kind] ?? KIND_ICONS.markdown;
            const Icon = meta.icon;
            const isOpen = open.has(artifact.id);
            const trimmed = artifact.content.trim();
            const feedbackList = (artifact.metadata?.feedback ?? []) as string[];
            return (
              <motion.div
                key={artifact.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={cn("group overflow-hidden rounded-lg border border-hairline bg-canvas-soft shadow-level-1 transition-colors", isOpen && "border-hairline-strong")}
              >
                <button
                  onClick={() => toggle(artifact.id)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left ride-focus-ring"
                >
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-mute" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-mute" />}
                  <Icon className="h-4 w-4 shrink-0 text-link" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{artifact.title}</span>
                  <span className="rounded-full bg-canvas-soft-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-mute">{meta.label}</span>
                  <span className="text-[9px] text-mute">{new Date(artifact.updatedAt).toLocaleTimeString([], { hour12: false })}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-hairline px-3 py-2.5">
                    {trimmed.length > CONTENT_PREVIEW ? (
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-body">{trimmed}</pre>
                    ) : (
                      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-body">{trimmed}</pre>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {onOpenArtifact && (
                        <button
                          onClick={() => onOpenArtifact(artifact)}
                          className="rounded-sm px-2 py-1 text-[10px] font-medium text-link transition-colors hover:bg-link/10 ride-focus-ring"
                        >
                          Open
                        </button>
                      )}
                      <button
                        onClick={() => void copy(artifact.content)}
                        className="flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] text-mute transition-colors hover:bg-canvas-soft-2 hover:text-ink ride-focus-ring"
                        title="Copy content"
                      >
                        <ClipboardCopy className="h-3 w-3" /> Copy
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(artifact.id)}
                          className="flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] text-mute transition-colors hover:bg-error/10 hover:text-error ride-focus-ring"
                          title="Delete artifact"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      )}
                      {onFeedback && (
                        <div className="ml-auto flex items-center gap-1.5">
                          <input
                            value={feedback[artifact.id] ?? ""}
                            onChange={(e) => setFeedback((prev) => ({ ...prev, [artifact.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitFeedback(artifact.id);
                            }}
                            placeholder="Feedback…"
                            className="h-6 w-36 rounded-sm border border-hairline bg-canvas px-2 text-[10px] text-ink outline-none placeholder:text-mute focus:border-hairline-strong"
                          />
                          <button
                            onClick={() => submitFeedback(artifact.id)}
                            className="flex items-center gap-1 rounded-sm bg-link/10 px-2 py-1 text-[10px] font-medium text-link transition-colors hover:bg-link/20 ride-focus-ring"
                            title="Send feedback to the agent"
                          >
                            <MessageSquarePlus className="h-3 w-3" /> Send
                          </button>
                        </div>
                      )}
                    </div>
                    {feedbackList.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-hairline pt-2">
                        {feedbackList.map((f, i) => (
                          <p key={i} className="flex items-start gap-1.5 text-[10px] leading-4 text-mute">
                            <MessageSquarePlus className="mt-0.5 h-3 w-3 shrink-0 text-violet" />
                            <span className="break-all">{f}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}