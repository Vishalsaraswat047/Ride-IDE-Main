import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Battery, Bot, CheckCircle2, Cpu, Download, HardDrive, Loader2, MemoryStick, MonitorCheck, PlugZap, RefreshCw, Trash2, Wifi, WifiOff, Zap } from "lucide-react";
import { AgentPanel, type ChatMessage } from "@ride/ui";
import { LOCAL_MODEL_CATALOG, type LocalAiStatus, type LocalAiTier, type PullProgress, type PowerMode, type RoutingDecision } from "@ride/contracts";
import { useSettings } from "../lib/hooks";

const inputCls = "h-7 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body outline-none ride-focus-ring";
const btnCls =
  "h-7 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";
const primaryBtnCls =
  "h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";
const dangerBtnCls =
  "h-7 rounded-sm border border-error/40 bg-error/10 px-2.5 text-xs text-error transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";

type Tab = "assistant" | "models" | "overview";

export function LocalAiPane() {
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
  const [tab, setTab] = useState<Tab>("assistant");
  const [installing, setInstalling] = useState(false);
  const [pulls, setPulls] = useState<Record<string, PullProgress>>({});
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [running, setRunning] = useState(false);
  const [chatModel, setChatModel] = useState("");
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [forceModel, setForceModel] = useState("");
  const streamRef = useRef("");
  const lastPromptRef = useRef("");
  const settings = useSettings();

  const notify = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const refresh = async () => {
    try {
      const s = await window.ride.localAi.status();
      setStatus(s);
      setChatModel((cur) => cur || pickModel(s));
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void refresh();
    const offPull = window.ride.localAi.onPullProgress((ev) => {
      setPulls((p) => ({ ...p, [ev.tag]: ev }));
      if (ev.status === "success" || ev.error) {
        setTimeout(() => {
          setPulls((p) => {
            const next = { ...p };
            delete next[ev.tag];
            return next;
          });
          void refresh();
        }, 900);
      }
    });
    const offChat = window.ride.localAi.onChatEvent((ev) => {
      if (ev.type === "router") {
        setDecision(ev.decision);
        setForceModel("");
        if (ev.decision.escalated) {
          notify("ok", `Escalated to ${ev.decision.selectedModel}: ${ev.decision.reason}`);
        }
        return;
      }
      if (ev.type === "chunk") {
        streamRef.current += ev.content;
        setStreaming(streamRef.current);
        return;
      }
      setRunning(false);
      if (ev.error) notify("err", ev.error);
      const text = ev.content ?? streamRef.current;
      if (text.trim()) {
        setMessages((m) => [...m, { id: `ai-${Date.now()}`, role: "assistant", content: text, time: timeNow() }]);
      }
      streamRef.current = "";
      setStreaming("");
    });
    return () => {
      offPull();
      offChat();
    };
  }, []);

  const install = async () => {
    setInstalling(true);
    try {
      const r = await window.ride.localAi.installRuntime();
      if (r.ok) {
        notify("ok", "Ollama installed. Refreshing…");
        await refresh();
      } else {
        notify("err", r.error ?? "Install failed");
      }
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  };

  const pull = async (tag: string) => {
    setPulls((p) => ({ ...p, [tag]: { tag, status: "pulling", progress: 0, total: 0, completed: 0 } }));
    try {
      await window.ride.localAi.pullModel(tag);
    } catch (e) {
      setPulls((p) => ({ ...p, [tag]: { tag, status: "error", error: e instanceof Error ? e.message : String(e) } }));
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (tag: string) => {
    try {
      await window.ride.localAi.deleteModel(tag);
      notify("ok", `Removed ${tag}`);
      await refresh();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const send = (prompt: string, overrideModel?: string) => {
    if (!chatModel) {
      notify("err", "No model selected — download one from the Models tab first.");
      return;
    }
    if (running || !status?.serverRunning) return;
    lastPromptRef.current = prompt;
    const history = messages
      .slice(-8)
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    setMessages((m) => [...m, { id: `user-${Date.now()}`, role: "user", content: prompt, time: timeNow() }]);
    streamRef.current = "";
    setStreaming("");
    setRunning(true);
    void window.ride.localAi.chat({
      requestId: `local-${Date.now()}`,
      currentModel: chatModel,
      forceModel: overrideModel,
      messages: [...history, { role: "user", content: prompt }],
    });
  };

  const cancel = () => {
    setRunning(false);
  };

  const installedFor = (tag: string) => status?.installed.find((m) => m.name === tag);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
        <div className="flex items-center gap-2">
          <CanvasTitle />
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={status} />
          <button onClick={() => void refresh()} className={btnCls} title="Re-scan hardware and models">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`mx-3 mt-2 rounded-sm border px-2.5 py-1.5 text-xs ${
            msg.kind === "ok" ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-2 py-1.5">
        {(["assistant", "models", "overview"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-sm px-2.5 py-1 text-xs transition-colors ${
              tab === t ? "bg-canvas-soft-2 font-medium text-ink" : "text-body hover:text-ink"
            }`}
          >
            {t === "assistant" ? "Assistant" : t === "models" ? "Models" : "Overview"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "assistant" && (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-hairline px-3 py-1.5">
              <Bot className="h-3.5 w-3.5 text-link" />
              <select value={chatModel} onChange={(e) => setChatModel(e.target.value)} disabled={!status?.installed.length} className={inputCls}>
                {status?.installed.map((m) => (
                  <option key={m.name} value={m.name} className="bg-canvas">
                    {m.name} ({m.sizeGB.toFixed(1)} GB)
                  </option>
                ))}
              </select>
              <ModeSelect value={settings.settings?.localAi.mode ?? "auto"} onChange={(v) => settings.settings && void settings.update({ localAi: { ...settings.settings.localAi, mode: v } })} />
              <FocusToggle
                on={settings.settings?.localAi.focusMode ?? true}
                onChange={(v) => settings.settings && void settings.update({ localAi: { ...settings.settings.localAi, focusMode: v } })}
              />
              {status && status.installed.length === 0 && (
                <span className="text-[11px] text-mute">No local models — download one from the Models tab.</span>
              )}
            </div>
            {decision && decision.selectedModel && (
              <div className="flex shrink-0 items-center gap-2 border-b border-hairline bg-canvas-soft px-3 py-1.5">
                <Zap className="h-3 w-3 shrink-0 text-link" />
                <div className="min-w-0 flex-1 truncate text-[10px] text-body">
                  <span className="text-mute">Router:</span> {taskLabel(decision.taskType)} · {decision.complexity.toUpperCase()} · selected <span className="font-medium text-ink">{prettyTier(decision.selectedTier)}</span>
                  {decision.escalated && <span className="ml-1 text-warning">· escalated ↑</span>}
                </div>
                {nextUpgrade(decision, status) && !running && (
                  <button onClick={() => send(lastPromptRef.current, nextUpgrade(decision, status) ?? undefined)} className={btnCls} title="Retry the last request with a larger model">
                    <ArrowUpRight className="h-3 w-3" /> Retry with {nextUpgrade(decision, status)}
                  </button>
                )}
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              <AgentPanel
                messages={messages}
                onSend={send}
                onCancel={cancel}
                running={running}
                streamingContent={streaming}
                placeholder="Ask your local model anything…"
              />
            </div>
            {status && status.installed.length > 0 && (
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-hairline bg-canvas-soft px-3 py-1 text-[10px] text-mute">
                <Wifi className="h-3 w-3" /> {chatModel} · local · free tokens · {settings.settings?.localAi.mode ?? "auto"} mode
                {settings.settings?.localAi.focusMode && (
                  <span className="rounded-sm border border-hairline px-1.5 py-0.5 text-[9px] text-mute" title="Performance Guard: idle unload, capped context, pause when busy">
                    Focused · unloads {settings.settings.localAi.idleUnloadSec}s idle
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {tab === "models" && (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {LOCAL_MODEL_CATALOG.map((m) => {
              const installed = installedFor(m.ollamaTag);
              const progress = pulls[m.ollamaTag];
              const pct = progress && progress.total ? Math.min(100, Math.round(((progress.completed ?? 0) / progress.total) * 100)) : 0;
              return (
                <div key={m.ollamaTag} className="mb-2 rounded-sm border border-hairline bg-canvas-soft p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium text-ink">
                        {m.name}
                        <span className="rounded-sm border border-hairline px-1.5 py-0.5 text-[10px] text-mute">{m.family.toUpperCase()}</span>
                        <span className="rounded-sm border border-hairline px-1.5 py-0.5 text-[10px] text-mute">{m.tier}</span>
                        <span className="text-[10px] text-mute">{m.sizeGB.toFixed(1)} GB</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-mute">{m.description}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-link/70">{m.ollamaTag}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {installed ? (
                        <>
                          <span className="flex items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-2 py-1 text-[11px] text-success">
                            <CheckCircle2 className="h-3 w-3" /> Installed · {installed.sizeGB.toFixed(1)} GB
                          </span>
                          <button onClick={() => void remove(m.ollamaTag)} className={dangerBtnCls} title="Delete model">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => void pull(m.ollamaTag)} disabled={Boolean(progress)} className={primaryBtnCls} title={`Download ${m.sizeGB.toFixed(1)} GB`}>
                          {progress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                          {progress ? "Downloading" : "Download"}
                        </button>
                      )}
                    </div>
                  </div>
                  {progress && (
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-mute">
                        <span>{progress.status}</span>
                        {progress.total ? <span>{pct}%</span> : null}
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-canvas-soft-2">
                        <div className="h-full rounded-full bg-link transition-[width]" style={{ width: `${progress.total ? pct : 12}%` }} />
                      </div>
                      {progress.error && <div className="mt-1 text-[10px] text-error">{progress.error}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "overview" && <OverviewTab status={status} onInstall={install} installing={installing} />}
      </div>
    </div>
  );
}

function CanvasTitle() {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-ink">
      <MonitorCheck className="h-3.5 w-3.5 text-link" />
      Local AI
    </div>
  );
}

function StatusChip({ status }: { status: LocalAiStatus | null }) {
  if (!status) {
    return <span className="rounded-sm border border-hairline bg-canvas-soft px-2 py-1 text-[11px] text-mute">Scanning…</span>;
  }
  if (!status.available) {
    return (
      <span className="flex items-center gap-1 rounded-sm border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
        <PlugZap className="h-3 w-3" /> Ollama missing
      </span>
    );
  }
  return status.serverRunning ? (
    <span className="flex items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-2 py-1 text-[11px] text-success">
      <Wifi className="h-3 w-3" /> Server running
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded-sm border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] text-warning">
      <WifiOff className="h-3 w-3" /> Server stopped
    </span>
  );
}

function OverviewTab({ status, onInstall, installing }: { status: LocalAiStatus | null; onInstall: () => void; installing: boolean }) {
  const sys = status?.system;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
      {!status?.available && (
        <div className="mb-3 rounded-sm border border-warning/30 bg-warning/10 p-3">
          <div className="text-xs font-medium text-warning">Ollama is not installed</div>
          <div className="mt-1 text-[11px] text-body">{status?.error}</div>
          <button onClick={onInstall} disabled={installing} className={`${primaryBtnCls} mt-2`}>
            {installing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {installing ? "Installing…" : "Install Ollama"}
          </button>
        </div>
      )}

      {status?.recommended && (
        <div className="mb-3 rounded-sm border border-hairline bg-canvas-soft p-3">
          <div className="text-[10px] uppercase tracking-wider text-mute">Recommended for this PC</div>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-ink">
            <Zap className="h-4 w-4 text-link" />
            {status.recommended.name}
            <span className="text-[11px] font-normal text-mute">({status.recommended.ollamaTag})</span>
          </div>
          <div className="mt-0.5 text-[11px] text-body">{status.recommended.reason}</div>
        </div>
      )}

      <div className="rounded-sm border border-hairline bg-canvas-soft p-3">
        <div className="mb-2 text-[10px] uppercase tracking-wider text-mute">Hardware scan</div>
        {sys ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <SpecRow icon={<Cpu className="h-3.5 w-3.5 text-link" />} label="CPU" value={`${sys.cpu.model || "—"} · ${sys.cpu.cores} cores / ${sys.cpu.threads} threads`} />
            <SpecRow icon={<MemoryStick className="h-3.5 w-3.5 text-link" />} label="RAM" value={`${sys.memoryGB.total} GB total · ${sys.memoryGB.free} GB free`} />
            <SpecRow icon={<MonitorCheck className="h-3.5 w-3.5 text-link" />} label="GPU" value={sys.gpus.length ? sys.gpus.map((g) => `${g.name} (${g.vramGB} GB)`).join(", ") : "None detected"} />
            <SpecRow icon={<HardDrive className="h-3.5 w-3.5 text-link" />} label="Storage free" value={`${sys.freeStorageGB} GB`} />
            <SpecRow icon={<Bot className="h-3.5 w-3.5 text-link" />} label="NPU" value={sys.npu ? "Available" : "Not detected"} />
            {sys.battery && (
              <SpecRow
                icon={<Battery className="h-3.5 w-3.5 text-link" />}
                label="Power"
                value={sys.battery.hasBattery ? `Battery ${sys.battery.percent}%${sys.battery.onBattery ? " · on battery" : " · on AC"}` : "No battery detected"}
              />
            )}
          </div>
        ) : (
          <div className="text-[11px] text-mute">Hardware scan failed — models can still be downloaded manually.</div>
        )}
      </div>
    </div>
  );
}

function SpecRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] text-mute">{label}</div>
        <div className="text-[11px] text-body">{value}</div>
      </div>
    </div>
  );
}

function pickModel(s: LocalAiStatus): string {
  const rec = s.recommended;
  if (rec && s.installed.some((m) => m.name === rec.ollamaTag)) return rec.ollamaTag;
  return s.installed[0]?.name ?? LOCAL_MODEL_CATALOG[0]?.ollamaTag ?? "";
}

const MODE_LABELS: Record<PowerMode, string> = {
  auto: "Auto",
  battery: "Battery saver",
  balanced: "Balanced",
  performance: "Performance",
  max: "Max quality",
};

function ModeSelect({ value, onChange }: { value: PowerMode; onChange: (v: PowerMode) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as PowerMode)} className={inputCls} title="Router power profile">
      {(Object.keys(MODE_LABELS) as PowerMode[]).map((m) => (
        <option key={m} value={m} className="bg-canvas">
          {MODE_LABELS[m]}
        </option>
      ))}
    </select>
  );
}

function FocusToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`h-7 rounded-sm border px-2.5 text-xs transition-colors ride-focus-ring ${
        on ? "border-success/40 bg-success/10 text-success" : "border-hairline bg-canvas text-mute hover:text-body"
      }`}
      title="Performance Guard: unload the model when idle, cap context and tokens, pause while the system is busy"
    >
      {on ? "Focus: on" : "Focus: off"}
    </button>
  );
}

const TIER_ORDER: LocalAiTier[] = ["lite", "standard", "developer", "pro", "max"];
const TIER_LABELS: Record<string, string> = { lite: "Lite", standard: "Student", developer: "Developer", pro: "Pro", max: "Max" };

function prettyTier(t: LocalAiTier): string {
  return TIER_LABELS[t] ?? t;
}

function taskLabel(taskType: string): string {
  const map: Record<string, string> = {
    chat: "Chat",
    codeCompletion: "Code completion",
    explanation: "Explanation",
    bugFix: "Bug fix",
    refactoring: "Refactoring",
    documentation: "Documentation",
    uiGeneration: "UI generation",
    websiteGeneration: "Website generation",
    applicationGeneration: "App generation",
    terminalOperation: "Terminal",
    projectPlanning: "Planning",
    architecture: "Architecture",
    visualAnalysis: "Visual analysis",
  };
  return map[taskType] ?? "Task";
}

function nextUpgrade(decision: RoutingDecision, status: LocalAiStatus | null): string | null {
  if (!status) return null;
  const i = TIER_ORDER.indexOf(decision.selectedTier);
  for (const t of TIER_ORDER.slice(i + 1)) {
    const tag = LOCAL_MODEL_CATALOG.find((m) => m.tier === t)?.ollamaTag;
    if (tag && status.installed.some((m) => m.name === tag)) return tag;
  }
  return null;
}

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour12: false });
}