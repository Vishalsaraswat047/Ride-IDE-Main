import { useEffect, useRef, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  AgentPanel,
  AgentTimeline,
  ArtifactsPanel,
  ScheduledTasksPanel,
  SessionManagerPanel,
  McpPanel,
  extractCodeBlocks,
  type AgentFileStatus,
  type ArtifactItem,
  type ChatMessage,
  type ChatToolStep,
  type TimelineStep,
} from "@ride/ui";
import { useWorkspace, workspace, useModels } from "../lib/hooks";
import { openFileInWorkspace, refreshTree } from "../lib/hooks";
import { Loader2, Sparkles, Square } from "lucide-react";

interface FlowStep {
  id: string;
  kind: TimelineStep["kind"];
  label: string;
  detail?: string;
  status: TimelineStep["status"];
  tool?: string;
  time?: string;
}

interface AgentFile {
  filename: string;
  code: string;
  status: AgentFileStatus;
}

function joinWorkspacePath(root: string, filename: string): string {
  return root.replace(/[\\/]+$/, "") + "\\" + filename.replace(/\//g, "\\");
}

export function AgentPane() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [running, setRunning] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [usage, setUsage] = useState({ promptTokens: 0, completionTokens: 0, cost: 0 });
  const [sessionTitle, setSessionTitle] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const { selected } = useModels();
  const currentSession = useRef<string | null>(null);
  const sessionTitleRef = useRef<string>("");
  const partCounter = useRef(0);
  const streamRef = useRef("");
  const toolStepRef = useRef(new Map<string, string>());
  const lastUserPrompt = useRef<string>("");
  const lastFailed = useRef(false);

  useEffect(() => {
    void window.ride.agent.usage().then((u) => setUsage({ promptTokens: u.promptTokens, completionTokens: u.completionTokens, cost: u.estimatedCost }));
    void window.ride.artifacts.list().then(setArtifacts);
    const offArtifacts = window.ride.artifacts.onEvent((raw) => {
      const ev = raw as { type?: string; artifact?: ArtifactItem; artifactId?: string; feedback?: string };
      if (ev.type === "artifact.created" && ev.artifact) setArtifacts((a) => [ev.artifact!, ...a.filter((x) => x.id !== ev.artifact!.id)]);
      if (ev.type === "artifact.updated" && ev.artifact) setArtifacts((a) => a.map((x) => (x.id === ev.artifact!.id ? ev.artifact! : x)));
      if (ev.type === "artifact.deleted" && ev.artifactId) setArtifacts((a) => a.filter((x) => x.id !== ev.artifactId));
      if (ev.type === "artifact.feedback" && ev.artifactId && ev.feedback) {
        setArtifacts((a) =>
          a.map((x) =>
            x.id === ev.artifactId
              ? { ...x, metadata: { ...(x.metadata ?? {}), feedback: [...((x.metadata?.feedback as string[]) ?? []), ev.feedback!] } }
              : x,
          ),
        );
      }
    });

    const offAgent = window.ride.agent.onEvent((raw) => {
      const ev = raw as {
        type: string;
        sessionID?: string;
        timestamp?: number;
        text?: string;
        part?: {
          type?: string;
          text?: string;
          tool?: string;
          callID?: string;
          state?: { status?: string; input?: unknown; output?: unknown };
          reason?: string;
        };
        error?: { message?: string };
        status?: string;
        decision?: string;
        tool?: string;
        callID?: string;
        input?: unknown;
        impact?: string;
        summary?: string;
        requestID?: string;
        output?: unknown;
        promptTokens?: number;
        completionTokens?: number;
        estimatedCost?: number;
        session?: { id: string; status: string };
        plan?: { goal?: string; steps?: string[]; skills?: string[]; capabilities?: string[] };
        beforeTokens?: number;
        afterTokens?: number;
        droppedToolOutputs?: number;
        summarized?: boolean;
        review?: { passed?: boolean; summary?: string; findings?: Array<{ severity?: string; message?: string }> };
        note?: string;
      };

      if (ev.type === "usage") {
        setUsage({ promptTokens: ev.promptTokens ?? 0, completionTokens: ev.completionTokens ?? 0, cost: ev.estimatedCost ?? 0 });
      }

      switch (ev.type) {
        case "session.started": {
          currentSession.current = ev.session?.id ?? null;
          lastFailed.current = false;
          setRunning(true);
          setSteps([]);
          streamRef.current = "";
          setStreaming("");
          break;
        }
        case "session.status": {
          if (ev.status === "completed" || ev.status === "failed" || ev.status === "cancelled") {
            lastFailed.current = ev.status === "failed";
            setRunning(false);
            commitStream();
          }
          break;
        }
        case "text": {
          if (ev.part?.text) {
            streamRef.current += ev.part!.text!;
            setStreaming(streamRef.current);
          }
          break;
        }
        case "thinking": {
          break;
        }
        case "tool_use": {
          const p = ev.part;
          const id = `tool-${++partCounter.current}`;
          if (ev.callID) toolStepRef.current.set(ev.callID, id);
          const done = p?.state?.status === "completed" || p?.state?.status === "failed";
          setSteps((s) => [
            ...s,
            {
              id,
              kind: "tool",
              label: `${p?.tool ?? "tool"} ${describeInput(p?.state?.input)}`,
              detail: p?.state?.output ? String(p.state.output).slice(0, 500) : undefined,
              status: done ? "done" : "running",
              tool: p?.tool,
              time: timeNow(),
            },
          ]);
          break;
        }
        case "tool_result": {
          const stepId = ev.callID ? toolStepRef.current.get(ev.callID) : undefined;
          if (stepId) {
            setSteps((s) =>
              s.map((st) =>
                st.id === stepId
                  ? { ...st, status: "done", detail: typeof ev.output === "string" ? ev.output.slice(0, 500) : JSON.stringify(ev.output).slice(0, 500) }
                  : st,
              ),
            );
          }
          break;
        }
        case "permission.request": {
          setSteps((s) => [
            ...s,
            {
              id: `perm-${++partCounter.current}`,
              kind: "permission",
              label: `${ev.summary ?? `${ev.tool ?? "tool"} requires approval`}`,
              detail: ev.input ? JSON.stringify(ev.input, null, 2).slice(0, 400) : undefined,
              status: "running",
              tool: ev.tool,
              time: timeNow(),
            },
          ]);
          break;
        }
        case "permission.result": {
          setSteps((s) =>
            s.map((st) => (st.kind === "permission" && st.status === "running" ? { ...st, status: ev.decision === "deny" ? "failed" : "done", label: st.label + ` → ${ev.decision}` } : st)),
          );
          break;
        }
        case "error": {
          lastFailed.current = true;
          setRunning(false);
          commitStream();
          setMessages((m) => [
            ...m,
            { id: `sys-${Date.now()}`, role: "system", content: `⚠ ${ev.error?.message ?? "Request failed"}` },
          ]);
          setSteps((s) => [
            ...s,
            { id: `err-${++partCounter.current}`, kind: "error", label: ev.error?.message ?? "Error", status: "failed", time: timeNow() },
          ]);
          break;
        }
        case "done": {
          lastFailed.current = false;
          setRunning(false);
          const finalText = streamRef.current;
          commitStream();
          createArtifactFromSession(ev.sessionID, finalText);
          break;
        }
        case "plan": {
          if (ev.plan?.goal) {
            const skillNote = ev.plan.skills?.length ? ` · skills: ${ev.plan.skills.slice(0, 4).join(", ")}` : "";
            setMessages((m) => [...m, { id: `sys-${Date.now()}`, role: "system", content: `🧠 Frode plan: ${ev.plan!.goal!.slice(0, 160)}${skillNote}` }]);
            setSteps((s) => [
              ...s,
              {
                id: `plan-${++partCounter.current}`,
                kind: "plan",
                label: `Plan — ${ev.plan!.goal!.slice(0, 60)}`,
                detail: ev.plan!.steps?.map((x, i) => `${i + 1}. ${x}`).join("\n"),
                status: "done",
                time: timeNow(),
              },
            ]);
          }
          break;
        }
        case "compacted": {
          const delta = (ev.beforeTokens ?? 0) - (ev.afterTokens ?? 0);
          if (delta > 0) {
            setMessages((m) => [
              ...m,
              {
                id: `sys-${Date.now()}`,
                role: "system",
                content: `🧠 Context compacted: ${(ev.beforeTokens ?? 0).toLocaleString()} → ${(ev.afterTokens ?? 0).toLocaleString()} tokens${ev.droppedToolOutputs ? ` (${ev.droppedToolOutputs} tool outputs folded)` : ""}${ev.summarized ? ", summarized by the model" : ""}`,
              },
            ]);
          }
          break;
        }
        case "review": {
          const r = ev.review;
          if (r) {
            const errors = (r.findings ?? []).filter((f) => f.severity === "error");
            const verdict = r.passed ? "passed" : errors.length ? "failed review" : "needs attention";
            const body = r.findings?.length ? ` (${r.findings.length} finding${r.findings.length > 1 ? "s" : ""})` : "";
            setMessages((m) => [...m, { id: `sys-${Date.now()}`, role: "system", content: `🔍 Self-review ${verdict}${body}${r.summary ? ` — ${r.summary}` : ""}` }]);
            setSteps((s) => [
              ...s,
              {
                id: `review-${++partCounter.current}`,
                kind: "plan",
                label: `Self-review: ${verdict}`,
                detail: (r.findings ?? []).map((f) => `- [${f.severity}] ${f.message}`).join("\n"),
                status: errors.length ? "failed" : "done",
                time: timeNow(),
              },
            ]);
          }
          break;
        }
        case "memory": {
          if (ev.note) {
            setMessages((m) => [...m, { id: `sys-${Date.now()}`, role: "system", content: `💾 ${ev.note}` }]);
          }
          break;
        }
      }
    });

    function createArtifactFromSession(sessionId?: string, text?: string): void {
      if (!text?.trim() || !sessionId) return;
      void window.ride.artifacts.create({
        sessionId,
        kind: text.length > 400 ? "report" : "markdown",
        title: `Session result — ${sessionTitleRef.current || "agent response"}`,
        content: text,
        metadata: { from: "session-result" },
      });
    }

    return () => {
      offArtifacts();
      offAgent();
    };

    function commitStream(): void {
      const text = streamRef.current;
      if (text.trim()) {
        const time = timeNow();
        setMessages((m) => [...m, { id: `msg-${Date.now()}`, role: "assistant", content: text, time }]);
        const seen = new Set<string>();
        setFiles((f) => {
          const existing = new Set(f.map((x) => x.filename));
          const taken = new Set(existing);
          const additions: AgentFile[] = [];
          for (const block of extractCodeBlocks(text)) {
            let filename = block.filename;
            if (!filename) continue;
            if (existing.has(filename)) continue;
            if (seen.has(filename)) continue;
            seen.add(filename);
            filename = String(filename).trim();
            if (!filename) continue;
            additions.push({ filename, code: block.code, status: "idle" });
          }
          return additions.length ? [...f, ...additions] : f;
        });
      }
      streamRef.current = "";
      setStreaming("");
    }
  }, []);

  const createFile = async (filename: string, code: string) => {
    const root = workspace.state.root;
    if (!root) return;
    setFiles((f) => f.map((x) => (x.filename === filename ? { ...x, status: "creating" } : x)));
    try {
      await window.ride.workspace.createFile(joinWorkspacePath(root, filename), code);
      setFiles((f) => f.map((x) => (x.filename === filename ? { ...x, status: "created" } : x)));
      await refreshTree(workspace);
      const full = joinWorkspacePath(root, filename);
      await openFileInWorkspace(workspace, full);
    } catch (err) {
      setFiles((f) => f.map((x) => (x.filename === filename ? { ...x, status: "error" } : x)));
      setMessages((m) => [
        ...m,
        { id: `sys-${Date.now()}`, role: "system", content: `⚠ Could not create ${filename}: ${err instanceof Error ? err.message : String(err)}` },
      ]);
    }
  };

  const fileStatus = (filename: string): AgentFileStatus => files.find((f) => f.filename === filename)?.status ?? "idle";

  const send = (prompt: string) => {
    const history = messages
      .slice(-10)
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content })) as { role: "user" | "assistant"; content: string }[];
    setMessages((m) => [...m, { id: `user-${Date.now()}`, role: "user", content: prompt, time: timeNow() }]);
    streamRef.current = "";
    setStreaming("");
    const title = prompt.slice(0, 60);
    sessionTitleRef.current = title;
    setSessionTitle(title);
    lastUserPrompt.current = prompt;
    void window.ride.agent.runTask({
      prompt,
      cwd: workspace.state.root ?? "",
      model: selected ?? undefined,
      files: workspace.state.root && workspace.activeTab ? [workspace.activeTab.path] : undefined,
      title,
      autoApprove,
      history,
    });
  };

  const cancel = () => {
    if (currentSession.current) void window.ride.agent.cancel(currentSession.current);
    setRunning(false);
  };

  const regenerate = () => {
    if (!lastUserPrompt.current || running) return;
    send(lastUserPrompt.current);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && running) {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  const liveSteps: ChatToolStep[] = steps.map((s) => ({
    id: s.id,
    kind: s.kind === "permission" ? "permission" : s.kind === "error" ? "error" : "tool",
    label: s.label,
    detail: s.detail,
    status: s.status,
    tool: s.tool,
  }));
  const failedRun = lastFailed.current;
  const hasUsage = usage.promptTokens > 0 || usage.completionTokens > 0;

  return (
    <Tabs defaultValue="chat" className="flex h-full flex-col">
      {/* agent header bar */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-hairline px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-orange/30 to-brand-magenta/25 ring-1 ring-brand-ember/25"
          >
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-ember" /> : <Sparkles className="h-3.5 w-3.5 text-brand-ember" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold leading-4 text-ink">
              {workspace.state.root ? sessionTitle || `Working on ${workspace.state.root.split(/[\\/]/).pop() ?? "project"}` : sessionTitle || "Hello! I'm your AI Agent"}
            </p>
            <p className="truncate text-[10px] leading-3.5 text-mute">
              {running ? "Agent is working…" : failedRun ? "Last run failed" : "Ready"}
            </p>
          </div>
        </div>

        <span
          role="status"
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            running ? "bg-link/10 text-link" : failedRun ? "bg-error/10 text-error" : "bg-success/10 text-success"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-link opacity-60" />}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          {running ? "Working" : failedRun ? "Failed" : "Ready"}
        </span>

        {selected && (
          <span className="hidden items-center gap-1.5 rounded-full border border-hairline bg-canvas-soft px-2 py-0.5 text-[10px] font-medium text-body sm:inline-flex">
            <Sparkles className="h-2.5 w-2.5 text-brand-orange" aria-hidden="true" />
            <span translate="no">{selected}</span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {running && (
            <button
              onClick={cancel}
              className="flex items-center gap-1.5 rounded-lg border border-error/20 bg-error/10 px-2.5 py-1.5 text-[11px] font-semibold text-error transition-colors hover:bg-error/15 ride-focus-ring"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          )}
          {hasUsage && (
            <div className="hidden items-center gap-2 text-[10px] text-mute lg:flex">
              <span title="Prompt tokens (session)">↑ {usage.promptTokens.toLocaleString()} tok</span>
              <span title="Completion tokens (session)">↓ {usage.completionTokens.toLocaleString()} tok</span>
              <span title="Estimated session cost (fallback public pricing)">~${usage.cost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>

      <TabsList className="mx-2.5 mb-0 max-w-full self-start overflow-x-auto [scrollbar-width:none]">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="timeline">Timeline {steps.length > 0 && `(${steps.length})`}</TabsTrigger>
        <TabsTrigger value="artifacts">Artifacts {artifacts.length > 0 && `(${artifacts.length})`}</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="agents">Agents</TabsTrigger>
        <TabsTrigger value="mcp">MCP</TabsTrigger>
      </TabsList>

      <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
        <AgentPanel
          messages={messages}
          onSend={send}
          onCancel={cancel}
          running={running}
          streamingContent={streaming}
          canCreateFiles={Boolean(workspace.state.root)}
          onCreateFile={createFile}
          fileStatus={fileStatus}
          voice
          modelLabel={selected ?? undefined}
          steps={liveSteps}
          onRegenerate={regenerate}
          onRetry={failedRun ? regenerate : undefined}
          autoApprove={autoApprove}
          onAutoApprove={setAutoApprove}
        />
      </TabsContent>
      <TabsContent value="timeline" className="flex min-h-0 flex-1 flex-col">
        <AgentTimeline steps={steps} />
      </TabsContent>
      <TabsContent value="artifacts" className="flex min-h-0 flex-1 flex-col">
        <ArtifactsPanel
          artifacts={artifacts}
          onDelete={(id) => void window.ride.artifacts.delete(id)}
          onFeedback={(artifactId, feedback) => void window.ride.artifacts.feedback(artifactId, feedback)}
        />
      </TabsContent>
      <TabsContent value="tasks" className="flex min-h-0 flex-1 flex-col">
        <ScheduledTasksPanel api={window.ride.tasks} workspaceRoot={workspace.state.root} />
      </TabsContent>
      <TabsContent value="agents" className="flex min-h-0 flex-1 flex-col">
        <SessionManagerPanel api={window.ride.agent} />
      </TabsContent>
      <TabsContent value="mcp" className="flex min-h-0 flex-1 flex-col">
        <McpPanel api={window.ride.mcp} />
      </TabsContent>
    </Tabs>
  );
}

function describeInput(input: unknown): string {
  if (!input) return "";
  const obj = input as Record<string, unknown>;
  if (typeof obj.filePath === "string") return obj.filePath.split(/[\\/]/).pop() ?? "";
  if (typeof obj.path === "string") return obj.path.split(/[\\/]/).pop() ?? "";
  if (typeof obj.command === "string") return obj.command.slice(0, 60);
  if (Array.isArray(obj.paths)) return `${obj.paths.length} paths`;
  if (typeof obj.pattern === "string") return `"${obj.pattern}"`;
  return "";
}

function timeNow(): string {
  return new Date().toLocaleTimeString([], { hour12: false });
}