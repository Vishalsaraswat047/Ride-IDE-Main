import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Send,
  Square,
  Sparkles,
  Loader2,
  Bot,
  Mic,
  MicOff,
  Paperclip,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  Hammer,
  ShieldAlert,
  CircleDot,
  Zap,
} from "lucide-react";
import { cn } from "../lib/cn";
import { Markdown, type AgentFileStatus } from "./Markdown";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  time?: string;
}

/** Minimal tool-step shape for live "tool execution cards" in the timeline. */
export interface ChatToolStep {
  id: string;
  kind: "tool" | "permission" | "error" | "plan" | "text";
  label: string;
  detail?: string;
  status: "pending" | "running" | "done" | "failed";
  tool?: string;
}

export interface AgentPanelProps {
  messages: ChatMessage[];
  onSend: (prompt: string) => void;
  onCancel?: () => void;
  running?: boolean;
  streamingContent?: string;
  placeholder?: string;
  className?: string;
  canCreateFiles?: boolean;
  onCreateFile?: (filename: string, content: string) => void;
  fileStatus?: (filename: string) => AgentFileStatus;
  /** Enable voice input (Web Speech API mic button). */
  voice?: boolean;
  /** Model indicator shown in the composer hint. */
  modelLabel?: string;
  /** Live tool execution cards rendered under the running stream. */
  steps?: ChatToolStep[];
  /** Regenerate the last assistant response (show on last message). */
  onRegenerate?: () => void;
  /** Retry a failed run (shown as an inline action). */
  onRetry?: () => void;
  /** Auto-approve toggle (galaxy-style switch) shown above the composer. */
  autoApprove?: boolean;
  onAutoApprove?: (value: boolean) => void;
}

const SUGGESTIONS = ["Explain this file", "Fix a bug", "Generate a component", "Write tests"];

/** Fixed avatar column width — keep in sync with the message grid template. */
const AVATAR_COL = "w-8";
const MESSAGE_GRID = "grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3";

function AgentAvatar({ running = false, streaming = false }: { running?: boolean; streaming?: boolean }) {
  return (
    <span className={cn(
      "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-orange/25 to-brand-magenta/20 ring-1 ring-brand-ember/25",
      AVATAR_COL,
      "h-8 shrink-0",
    )}>
      {running || streaming ? (
        <Loader2 className="h-4 w-4 animate-spin text-brand-ember" />
      ) : (
        <Bot className="h-4 w-4 text-brand-ember" />
      )}
    </span>
  );
}

function ModelChip({ label }: { label: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-[180px] items-center gap-1 rounded-full border border-link/20 bg-link/5 px-1.5 py-px text-[9px] font-medium text-link/90">
      <CircleDot className="h-2 w-2 shrink-0" />
      <span className="truncate" translate="no">{label}</span>
    </span>
  );
}

function MessageActions({ onRegenerate, onRetry, always }: { onRegenerate?: () => void; onRetry?: () => void; always?: boolean }) {
  if (!onRegenerate && !onRetry) return null;
  return (
    <div className={cn("ml-auto flex shrink-0 items-center gap-1 transition-opacity duration-150", !always && "opacity-0 group-hover/msg:opacity-100")}>
      {onRegenerate && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              onClick={onRegenerate}
              aria-label="Regenerate response"
              className="flex h-6 w-6 items-center justify-center rounded-md text-mute transition-colors hover:bg-canvas-soft hover:text-body ride-focus-ring"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="z-50 rounded-md bg-ink px-2 py-1 text-[10.5px] text-canvas shadow-level-4" sideOffset={4}>
              Regenerate response
              <Tooltip.Arrow className="fill-ink" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
      {onRetry && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              onClick={onRetry}
              aria-label="Retry"
              className="flex h-6 w-6 items-center justify-center rounded-md text-mute transition-colors hover:bg-canvas-soft hover:text-body ride-focus-ring"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="z-50 rounded-md bg-ink px-2 py-1 text-[10.5px] text-canvas shadow-level-4" sideOffset={4}>
              Retry
              <Tooltip.Arrow className="fill-ink" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-hairline bg-canvas-soft/70 px-4 py-3.5 shadow-level-1" role="status" aria-label="RIDE is thinking">
      <span className="ride-typing-dot h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden="true" />
      <span className="ride-typing-dot h-1.5 w-1.5 rounded-full bg-brand-red" style={{ animationDelay: "0.15s" }} aria-hidden="true" />
      <span className="ride-typing-dot h-1.5 w-1.5 rounded-full bg-brand-magenta" style={{ animationDelay: "0.3s" }} aria-hidden="true" />
    </div>
  );
}

export function AgentPanel({
  messages,
  onSend,
  onCancel,
  running = false,
  streamingContent,
  placeholder = "Ask RIDE to build, fix, explain, test…",
  className,
  canCreateFiles = false,
  onCreateFile,
  fileStatus,
  voice = false,
  modelLabel,
  steps = [],
  onRegenerate,
  onRetry,
  autoApprove = false,
  onAutoApprove,
}: AgentPanelProps) {
  const [input, setInput] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [showLiveSteps, setShowLiveSteps] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const recognitionRef = React.useRef<{ start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<{ [i: number]: { transcript: string } }> }) => void) | null; onend: (() => void) | null } | null>(null);
  const listeningRef = React.useRef(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, running, steps]);

  const submit = (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || running) return;
    setInput("");
    onSend(text);
  };

  const toggleVoice = () => {
    const WebSpeech = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown } & Window);
    const Ctor = WebSpeech.SpeechRecognition ?? WebSpeech.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      listeningRef.current = false;
      setListening(false);
      return;
    }
    const rec = new (Ctor as new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((e: { results: ArrayLike<{ [i: number]: { transcript: string } }> }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    })();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i]?.[0]?.transcript ?? "";
      }
      setInput(text);
    };
    rec.onend = () => {
      listeningRef.current = false;
      setListening(false);
      if (listeningRef.current) {
        void rec.start();
      }
    };
    rec.onerror = () => {
      listeningRef.current = false;
      setListening(false);
    };
    recognitionRef.current = rec;
    listeningRef.current = true;
    setListening(true);
    rec.start();
  };

  const open = canCreateFiles && onCreateFile ? onCreateFile : undefined;
  const lastIdx = messages.length - 1;
  const liveSteps = steps.filter((s) => s.status === "running" || s.status === "pending").slice(-3);
  const hasStream = Boolean(streamingContent);
  const showTyping = running && !hasStream;

  return (
    <Tooltip.Provider delayDuration={250}>
      <div className={cn("relative flex h-full min-h-0 flex-col", className)}>
        {/* Scroll area — the conversation timeline */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:thin] sm:px-6">
          {messages.length === 0 && !running && (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center px-6">
              {/* galaxy-style orb */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative"
              >
                <span aria-hidden="true" className="ride-orb-ring absolute -inset-2.5 rounded-full border border-dashed border-link/25" />
                <span
                  aria-hidden="true"
                  className="ride-orb-ring absolute -inset-2.5 rounded-full border border-dashed border-transparent [animation-duration:3.5s] [border-top-color:rgba(0,112,243,0.55)]"
                />
                <motion.span
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-full border border-link/15"
                  animate={{ opacity: [0, 0.7, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-orange/40 via-brand-red/20 to-brand-magenta/35 shadow-level-3 ring-1 ring-brand-ember/30">
                  <Sparkles className="h-7 w-7 ride-brand-text" />
                </div>
              </motion.div>

              <div>
                <p className="text-lg font-semibold tracking-tight text-ink">RIDE Agent</p>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-mute">
                  Build, edit, debug and improve your project with the RIDE Agent.
                </p>
              </div>

              <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    onClick={() => submit(s)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 + i * 0.05 }}
                    className="rounded-xl border border-hairline bg-canvas-soft/60 px-4 py-2.5 text-left text-xs text-body transition-all hover:-translate-y-px hover:border-link/40 hover:bg-link/5 hover:text-link hover:shadow-level-2 ride-focus-ring"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-7">
            {messages.map((m, idx) => {
              if (m.role === "system") {
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="mx-auto max-w-[92%] rounded-xl bg-warning/10 px-3.5 py-2 text-[11.5px] leading-5 text-warning border border-warning/15"
                  >
                    {m.content}
                  </motion.div>
                );
              }
              const isUser = m.role === "user";
              const isLast = idx === lastIdx;

              if (isUser) {
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex justify-end"
                  >
                    <div className="min-w-0 max-w-[78%]">
                      <div className="ml-auto inline-block max-w-full break-words rounded-2xl rounded-br-md border border-hairline bg-canvas-soft-2 px-4 py-2.5 text-left text-[13.5px] leading-6 text-ink shadow-level-1">
                        {m.content}
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn("group/msg", MESSAGE_GRID)}
                >
                  <AgentAvatar />
                  <div className="min-w-0">
                    {/* header: name · model · time · actions */}
                    <div className="mb-1 flex min-w-0 items-center gap-2 px-0.5">
                      <span className="text-[10.5px] font-semibold tracking-wide text-body">RIDE</span>
                      {modelLabel && <ModelChip label={modelLabel} />}
                      {m.time && <span className="shrink-0 text-[9.5px] text-mute">{m.time}</span>}
                      <MessageActions onRegenerate={onRegenerate} onRetry={onRetry} always={isLast && !running} />
                    </div>
                    <div className="min-w-0 rounded-2xl rounded-tl-md border border-hairline bg-canvas-soft/70 px-4 py-3 shadow-level-1">
                      <Markdown
                        text={m.content}
                        onCreateFile={open}
                        fileStatus={fileStatus}
                        className="min-w-0 text-[13.5px] leading-6 text-body [&_p]:text-body"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Thinking indicator — inside the assistant column, no overlap with bubbles */}
            {showTyping && !hasStream && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn(MESSAGE_GRID)}>
                <AgentAvatar running />
                <div className="min-w-0 pt-0.5">
                  <ThinkingBubble />
                </div>
              </motion.div>
            )}

            {/* Streaming response */}
            {hasStream && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn(MESSAGE_GRID)}>
                <AgentAvatar streaming />
                <div className="min-w-0">
                  <div className="min-w-0 rounded-2xl rounded-tl-md border border-hairline bg-canvas-soft/70 px-4 py-3 shadow-level-1">
                    <Markdown text={streamingContent ?? ""} className="min-w-0 text-[13.5px] leading-6 text-body [&_p]:text-body" />
                    <span aria-hidden="true" className="ride-brand-gradient mt-1 inline-block h-3.5 w-1 rounded-full align-text-bottom" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Live tool execution cards — aligned to the assistant column */}
            {running && liveSteps.length > 0 && (
              <div className="ml-11">
                <button
                  onClick={() => setShowLiveSteps((v) => !v)}
                  className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-mute transition-colors hover:text-body ride-focus-ring"
                >
                  <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-red opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-red" />
                  </span>
                  Live activity
                  <ChevronDown className={cn("h-3 w-3 transition-transform", showLiveSteps && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {showLiveSteps && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="space-y-2 overflow-hidden"
                    >
                      {liveSteps.map((s, i) => (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-hairline bg-canvas-soft/80 py-2.5 pl-3 pr-3.5 shadow-level-1 transition-colors hover:border-link/30"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-magenta/10 text-brand-magenta">
                            {s.kind === "permission" ? (
                              <ShieldAlert className="h-3 w-3" />
                            ) : s.kind === "error" ? (
                              <RotateCcw className="h-3 w-3 text-error" />
                            ) : (
                              <Hammer className="h-3 w-3" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-body">{s.label}</span>
                          {s.status === "running" && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-orange/10 px-2 py-0.5 text-[9.5px] font-semibold text-brand-orange">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              RUNNING
                            </span>
                          )}
                          <span aria-hidden="true" className="ride-shimmer-bar absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red/70 to-transparent" />
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Composer — with proper bottom spacing from viewport */}
        <div className="shrink-0 border-t border-hairline bg-canvas/60 px-4 pt-2.5 pb-4 backdrop-blur supports-[backdrop-filter]:bg-canvas/85 ride-composer-gap">
          {/* top row: hint · auto-approve */}
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <span className="text-[9.5px] text-mute">
              Enter <kbd className="rounded border border-hairline bg-canvas-soft px-1 font-mono">↵</kbd> to send · Shift+Enter for a new line
            </span>
            <div className="flex items-center gap-3">
              {running && (
                <span className="inline-flex items-center gap-1 text-[9.5px] text-mute">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-brand-ember" aria-hidden="true" />
                  Working…
                </span>
              )}
              {onAutoApprove && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[10.5px] font-medium text-mute">Auto-approve</span>
                  <button
                    role="switch"
                    aria-checked={autoApprove}
                    aria-label="Toggle auto-approve for tool calls"
                    onClick={() => onAutoApprove(!autoApprove)}
                    className={cn(
                      "relative h-4.5 w-8 rounded-full border transition-colors duration-200 ride-focus-ring",
                      autoApprove ? "border-brand-red bg-brand-red" : "border-hairline-strong bg-canvas-soft-2",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full shadow-level-2 transition-all duration-200",
                        autoApprove ? "left-[calc(100%-0.875rem)] bg-white" : "left-0.5 bg-mute",
                      )}
                    />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* input bar */}
          <div
            className={cn(
              "flex items-end gap-1.5 rounded-2xl border bg-canvas-soft/80 px-2 py-1.5 shadow-level-2 transition-all",
              listening
                ? "border-error/50 ring-2 ring-error/15"
                : "border-hairline hover:border-hairline-strong focus-within:border-link/40 focus-within:ring-2 focus-within:ring-link/10",
            )}
          >
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  title="Attach file"
                  aria-label="Attach file"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-mute transition-colors hover:bg-canvas-soft-2 hover:text-body ride-focus-ring"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="z-50 rounded-md bg-ink px-2 py-1 text-[10.5px] text-canvas shadow-level-4" sideOffset={6}>
                  Attach file
                  <Tooltip.Arrow className="fill-ink" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder={listening ? "Listening…" : placeholder}
              aria-label="Message the agent"
              className="min-h-9 max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2 text-[13.5px] leading-5 text-ink outline-none placeholder:text-mute"
            />

            {voice && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={toggleVoice}
                    title={listening ? "Stop voice input" : "Voice input (mic)"}
                    aria-label={listening ? "Stop voice input" : "Voice input (mic)"}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ride-focus-ring",
                      listening ? "bg-error/10 text-error" : "text-mute hover:bg-canvas-soft-2 hover:text-body",
                    )}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="z-50 rounded-md bg-ink px-2 py-1 text-[10.5px] text-canvas shadow-level-4" sideOffset={6}>
                    {listening ? "Stop voice input" : "Voice input (mic)"}
                    <Tooltip.Arrow className="fill-ink" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}

            {running && onCancel ? (
              <button
                onClick={onCancel}
                title="Stop generation (Esc)"
                aria-label="Stop generation (Esc)"
                className="flex h-9 items-center gap-1.5 rounded-xl bg-error/10 px-3.5 text-[12.5px] font-semibold text-error transition-all hover:bg-error/15 ride-focus-ring"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            ) : (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={() => submit()}
                    title="Send (Enter)"
                    aria-label="Send message (Enter)"
                    disabled={!input.trim()}
                    className="group/send relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ride-brand-gradient text-on-primary shadow-level-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100 ride-focus-ring"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-500 ease-out group-hover/send:translate-x-full"
                    />
                    <Send className="relative h-4 w-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="z-50 rounded-md bg-ink px-2 py-1 text-[10.5px] text-canvas shadow-level-4" sideOffset={6}>
                    Send (Enter)
                    <Tooltip.Arrow className="fill-ink" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}