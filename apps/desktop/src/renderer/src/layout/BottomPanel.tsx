import { useState, useEffect, useRef } from "react";
import { TerminalSquare, Database, AlertTriangle, Bug, FileText, X, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ride/ui";
import { TerminalPane } from "../components/TerminalPane";

interface BottomPanelProps {
  view: "terminal" | "output" | "problems" | "debug" | "logs";
  onViewChange: (v: "terminal" | "output" | "problems" | "debug" | "logs") => void;
  height: number;
  onResize: (height: number) => void;
}

export function BottomPanel({ view, onViewChange }: BottomPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { id: "terminal", label: "Terminal", icon: TerminalSquare },
    { id: "output", label: "Output", icon: Database },
    { id: "problems", label: "Problems", icon: AlertTriangle },
    { id: "debug", label: "Debug Console", icon: Bug },
    { id: "logs", label: "Logs", icon: FileText },
  ];

  if (collapsed) {
    return (
      <div className="ride-bottom-panel collapsed" onClick={() => setCollapsed(false)}>
        <div className="ride-bottom-panel-collapsed">
          <span>Bottom Panel</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="ride-bottom-panel">
      <div className="ride-panel-header">
        <Tabs value={view} onValueChange={(v) => onViewChange(v as "terminal" | "output" | "problems" | "debug" | "logs")} className="flex-1">
          <TabsList className="flex h-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5">
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <button className="ride-btn ghost p-1" title="Close panel" onClick={() => setCollapsed(true)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="ride-panel-content">
        <Tabs value={view} className="flex min-h-0 flex-1 flex-col">
          <TabsContent value="terminal" className="min-h-0 flex-1">
            <TerminalPane />
          </TabsContent>
          <TabsContent value="output" className="min-h-0 flex-1">
            <OutputPane />
          </TabsContent>
          <TabsContent value="problems" className="min-h-0 flex-1">
            <ProblemsPane />
          </TabsContent>
          <TabsContent value="debug" className="min-h-0 flex-1">
            <DebugPane />
          </TabsContent>
          <TabsContent value="logs" className="min-h-0 flex-1">
            <LogsPane />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OutputPane() {
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = window.ride.preview.onEvent((event: any) => {
      if (event.type === "log") setLogs((l) => [...l.slice(-500), event.line]);
      else if (event.type === "error") setLogs((l) => [...l.slice(-500), `[ERROR] ${event.line}`]);
      else if (event.type === "status") setLogs((l) => [...l.slice(-500), `[STATUS] ${event.status.phase}`]);
    });
    return off;
  }, []);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [logs]);

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-canvas-soft p-3 font-mono text-[11.5px] leading-5">
      {logs.length === 0 ? (
        <div className="text-mute">No output yet. Start the dev server to see its console here.</div>
      ) : (
        logs.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap break-all ${line.startsWith("[ERROR]") ? "text-error" : "text-ink"}`}>
            {line}
          </div>
        ))
      )}
    </div>
  );
}

function ProblemsPane() {
  const [problems, setProblems] = useState<{ file: string; line: number; message: string; severity: "error" | "warning" | "info" }[]>([]);

  return (
    <div className="min-h-0 flex-1 overflow-auto p-3">
      {problems.length === 0 ? (
        <div className="py-8 text-center text-mute">No problems detected</div>
      ) : (
        <ul className="space-y-1">
          {problems.map((p, i) => (
            <li key={i} className="flex items-center gap-2 rounded-sm px-2 py-1 text-[11px] hover:bg-canvas-soft">
              <span className={`flex h-2 w-2 rounded-full ${p.severity === "error" ? "bg-error" : p.severity === "warning" ? "bg-warning" : "bg-link"}`} />
              <span className="font-mono text-xs text-mute">{p.file}:{p.line}</span>
              <span className="flex-1 truncate">{p.message}</span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${p.severity === "error" ? "bg-error/20 text-error" : p.severity === "warning" ? "bg-warning/20 text-warning" : "bg-link/20 text-link"}`}>
                {p.severity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DebugPane() {
  return (
    <div className="min-h-0 flex-1 p-3 text-center text-mute">
      <div className="text-[11px]">Debug Console</div>
      <div className="text-[10px] mt-2">Attach debugger to see console output</div>
    </div>
  );
}

function LogsPane() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const off = window.ride.preview.onEvent((event: any) => {
      if (event.type === "log") setLogs((l) => [...l.slice(-1000), event.line]);
    });
    return off;
  }, []);

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-canvas-soft p-3 font-mono text-[11px] leading-5">
      {logs.length === 0 ? <div className="text-mute">No logs yet</div> : logs.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}