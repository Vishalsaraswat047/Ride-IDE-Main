import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Monitor,
  Play,
  RotateCcw,
  Send,
  Share2,
  Square,
  LayoutGrid,
  Scissors,
  Repeat,
  ChevronDown,
  Terminal,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import type { PreviewEvent, PreviewStatus, PreviewErrorDetail } from "@ride/contracts";
import { BrowserPreview, Tabs, TabsContent, TabsList, TabsTrigger } from "@ride/ui";
import { useWorkspace, workspace } from "../lib/hooks";
import { ShareModal } from "./ShareModal";

const IDLE_STATUS: PreviewStatus = {
  state: "idle",
  url: null,
  command: null,
  cwd: null,
  phase: "Press Start to launch the dev server",
  lastChangedAt: null,
  errorCount: 0,
};

const MAX_LOG = 600;
const MAX_ERRORS = 50;

interface LogLine {
  text: string;
  error: boolean;
}

interface SplitView {
  mode: "code" | "preview" | "split";
  codeHeight: number;
}

export function PreviewPane() {
  const [status, setStatus] = useState<PreviewStatus>(IDLE_STATUS);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [frameKey, setFrameKey] = useState(0);
  const [sentToAgent, setSentToAgent] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [splitView, setSplitView] = useState<SplitView>({ mode: "preview", codeHeight: 0 });
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void window.ride.preview.status().then(setStatus);
    const off = window.ride.preview.onEvent((event: PreviewEvent) => {
      if (event.type === "status") {
        setStatus(event.status);
        if (event.status.url) setUrl(event.status.url);
        if (event.status.errorCount === 0) setErrors([]);
      } else if (event.type === "log") {
        setLogs((l) => [...l.slice(-MAX_LOG), { text: event.line, error: false }]);
      } else if (event.type === "error") {
        setErrors((e) => [...e.slice(-MAX_ERRORS), event.line]);
        setLogs((l) => [...l.slice(-MAX_LOG), { text: event.line, error: true }]);
      } else if (event.type === "changed") {
        setLogs((l) => [...l.slice(-MAX_LOG), { text: `[watch] ${event.path} changed`, error: false }]);
      }
    });
    return off;
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  const running = status.state === "running" || status.state === "starting" || status.state === "installing";
  const liveUrl = status.state === "running" && status.url ? status.url : null;
  const stopped = status.state === "idle" || status.state === "stopped";
  const hasError = status.state === "error";
  const errorDetail = status.errorDetail;

  const start = () => {
    setSentToAgent(false);
    void window.ride.preview.start(workspace.state.root ?? undefined).then(setStatus);
  };

  const stop = () => {
    void window.ride.preview.stop().then(setStatus);
  };

  const restart = () => {
    setSentToAgent(false);
    void window.ride.preview.stop();
    void window.ride.preview.start(workspace.state.root ?? undefined).then(setStatus);
  };

  const askAgent = async () => {
    if (!workspace.state.root) return;
    const errorLogs = errorDetail?.logs?.join("\n") || errors.join("\n") || errorDetail?.message || "Unknown error";
    setSentToAgent(true);
    const prompt = `The dev server for this project reported errors:\n\n${errorLogs}\n\nDiagnose and fix them so the app runs cleanly. Keep changes minimal and follow the project conventions.`;
    await window.ride.agent.runTask({ prompt, cwd: workspace.state.root, autoApprove: false, title: "Fix dev server errors" });
  };

  const viewLogs = () => {
    // Switch to console tab
  };

  const stateDot =
    status.state === "running" ? (
      <span className="h-2 w-2 rounded-full bg-success" />
    ) : status.state === "error" ? (
      <AlertTriangle className="h-3.5 w-3.5 text-error" />
    ) : running ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-link" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-mute" />
    );

  const splitModes = ["code", "preview", "split"];
  const splitModeLabels = ["Code", "Preview", "Split"];

  return (
    <>
      <Tabs defaultValue="browser" className="flex h-full flex-col">
        <TabsList className="m-2 mb-0">
          <TabsTrigger value="browser">Browser</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
        </TabsList>

        <TabsContent value="browser" className="flex min-h-0 flex-1 flex-col">
          {/* Pipeline status strip */}
          <div className="flex items-center gap-2 border-b border-hairline px-3 py-1.5">
            {stateDot}
            <span className="min-w-0 flex-1 truncate text-[11px] text-body">{status.phase}</span>
            {status.state === "running" && status.url && (
              <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 font-mono text-[10px] text-success">
                {status.url}
              </span>
            )}
            {status.errorCount > 0 && (
              <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-[10px] text-error">
                {status.errorCount} error{status.errorCount > 1 ? "s" : ""}
              </span>
            )}
            {stopped && (
              <button onClick={start} className="flex h-6 shrink-0 items-center gap-1 rounded-sm bg-primary px-2 text-[11px] font-medium text-on-primary transition-opacity hover:opacity-85 ride-focus-ring">
                <Play className="h-3 w-3" /> Start
              </button>
            )}
            {running && (
              <button onClick={stop} className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-hairline bg-canvas px-2 text-[11px] text-body transition-colors hover:bg-canvas-soft ride-focus-ring">
                <Square className="h-2.5 w-2.5" /> Stop
              </button>
            )}
            {(status.state === "stopped" && status.command) || status.state === "error" ? (
              <button onClick={restart} className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-hairline bg-canvas px-2 text-[11px] text-body transition-colors hover:bg-canvas-soft ride-focus-ring">
                <RotateCcw className="h-3 w-3" /> Restart
              </button>
            ) : null}
            <button
              onClick={() => setShareOpen(true)}
              className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-hairline bg-canvas px-2 text-[11px] text-body transition-colors hover:bg-canvas-soft hover:text-ink ride-focus-ring"
              title="Share this project — live URL, QR, ZIP, GitHub"
            >
              <Share2 className="h-3 w-3" /> Share
            </button>
            <button
              onClick={() => setSplitView((m) => ({ mode: splitModes[(splitModes.indexOf(m.mode) + 1) % splitModes.length] as SplitView["mode"], codeHeight: m.codeHeight }))}
              className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-hairline bg-canvas px-2 text-[10px] text-body transition-colors hover:text-ink ride-focus-ring"
              title="View mode"
            >
              {splitView.mode ? splitModeLabels[splitModes.indexOf(splitView.mode)] : "View"}
            </button>
          </div>

          {/* Error detail panel */}
          {hasError && errorDetail && (
            <div className="border-b border-error/30 bg-error/5 px-3 py-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-error mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-error">Preview failed</div>
                  <div className="mt-0.5 text-[11px] text-body font-mono">{errorDetail.message}</div>
                  {errorDetail.command && (
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-mute">
                      <span className="rounded-sm bg-canvas px-1.5 py-0.5 font-mono">Command: {errorDetail.command}</span>
                      {errorDetail.exitCode !== undefined && (
                        <span className="rounded-sm bg-canvas px-1.5 py-0.5 font-mono">Exit code: {errorDetail.exitCode}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={restart}
                  className="flex h-7 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-3 text-[11px] font-medium text-body transition-colors hover:bg-canvas-soft ride-focus-ring"
                >
                  <RotateCcw className="h-3 w-3" /> Retry
                </button>
                <button
                  onClick={() => {}}
                  className="flex h-7 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-3 text-[11px] font-medium text-body transition-colors hover:bg-canvas-soft ride-focus-ring"
                >
                  <Terminal className="h-3 w-3" /> View Logs
                </button>
                <button
                  onClick={() => void askAgent()}
                  disabled={sentToAgent}
                  className="flex h-7 items-center gap-1.5 rounded-sm bg-violet px-3 text-[11px] font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-60 ride-focus-ring"
                >
                  <MessageSquare className="h-3 w-3" /> {sentToAgent ? "Sent" : "Ask RIDE to Fix"}
                </button>
              </div>
            </div>
          )}

          <BrowserPreview
            url={status.url ?? url ?? "not running"}
            screenshots={[]}
            errors={errors}
            liveUrl={running ? (liveUrl ?? undefined) ?? url : undefined}
            liveKey={frameKey}
            onRefresh={() => setFrameKey((k) => k + 1)}
            onOpenExternal={() => void window.ride.app.openExternal(liveUrl ?? url)}
          />

          <div className="flex items-center gap-2 border-t border-hairline px-3 py-2">
            <Monitor className="h-3.5 w-3.5 text-mute" />
            {splitView.mode === "code" || splitView.mode === "split" ? (
              <div className="flex-1 rounded-sm border border-hairline bg-canvas p-2 text-[10px] text-body">
                <textarea
                  value={status.command ?? "no dev command"}
                  onChange={(e) => {/* command update handled elsewhere */}
                  }
                  className="h-8 w-full rounded-sm border border-hairline bg-canvas px-2 font-mono text-[10px] text-ink outline-none placeholder:text-mute ride-focus-ring"
                  placeholder="dev command"
                />
                <div className="mt-1 flex items-center justify-between">
                  <button className="text-[8px] text-mute" title="Run">▶</button>
                  <button className="text-[8px] text-mute" title="Stop">⏹</button>
                </div>
              </div>
            ) : (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-7 min-w-0 flex-1 rounded-sm border border-hairline bg-canvas px-2 font-mono text-[10px] text-ink outline-none placeholder:text-mute ride-focus-ring"
                placeholder="http://localhost:5173"
              />
            )}
            {status.errorCount === 0 && (
              <span className="hidden shrink-0 items-center gap-1 text-[10px] text-success sm:flex">
                <CheckCircle2 className="h-3 w-3" /> Hot reload active
              </span>
            )}
            {splitView.mode === "preview" || splitView.mode === "split" ? (
              <button
                onClick={() => setSplitView((m) => ({ mode: "code", codeHeight: m.codeHeight }))}
                className="flex h-6 shrink-0 items-center gap-1 rounded-sm border border-hairline bg-canvas px-2 text-[10px] text-body transition-colors hover:text-ink ride-focus-ring"
                title="Switch to code view"
              >
                <Scissors className="h-3 w-3" /> Code
              </button>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="console" className="flex min-h-0 flex-1 flex-col">
          <div ref={logRef} className="min-h-0 flex-1 overflow-auto bg-canvas-soft p-3 font-mono text-[11.5px] leading-5">
            {logs.length === 0 ? (
              <div className="text-mute">No output yet. Start the dev server to see its console here.</div>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={`whitespace-pre-wrap break-all ${line.error ? "text-error" : "text-ink"}`}>
                  {line.text}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-hairline px-3 py-1.5 text-[10px] text-mute">
            <span>{status.command ?? "no dev command"}</span>
            <button onClick={() => setLogs([])} className="text-mute underline-offset-2 hover:text-body hover:underline">
              Clear console
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {splitView.mode === "code" && (
        <div className="flex h-full flex-col gap-2 border-y border-hairline bg-canvas">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
            <span className="text-[10px] font-medium text-ink">Code Editor</span>
            <button onClick={() => setSplitView({ mode: "preview", codeHeight: 0 })} className="text-[10px] text-mute" title="Switch to preview">
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-canvas p-4 font-mono text-[11px] leading-5">
            <div className="text-mute">Code preview is available in the Code view of the main workspace.</div>
          </div>
          <div className="flex items-center justify-between border-t border-hairline px-3 py-1.5 text-[10px] text-mute">
            <span>{status.command ?? "no dev command"}</span>
            <button onClick={() => setSplitView({ mode: "preview", codeHeight: 0 })}>Close</button>
          </div>
        </div>
      )}

      {shareOpen && (
        <ShareModal
          workspacePath={workspace.state.root ?? ""}
          projectName={(workspace.state.root?.split(/[\\/]/).filter(Boolean).pop() ?? "My Project")}
          liveUrl={liveUrl}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
}