import { useEffect, useRef, useState } from "react";
import { TerminalView, type TerminalViewHandle } from "@ride/ui";
import { workspace } from "../lib/hooks";

export function TerminalPane() {
  const [termId] = useState(() => `term-${Date.now().toString(36)}`);
  const handleRef = useRef<TerminalViewHandle | null>(null);

  useEffect(() => {
    if (!workspace.state.root) return;
    const cols = 100;
    const rows = 24;
    void window.ride.terminal.spawn({ id: termId, cwd: workspace.state.root, cols, rows }).then(() => {
      void window.ride.terminal.resize(termId, cols, rows);
    });
    const offData = window.ride.terminal.onData(({ id, data }) => {
      if (id === termId) handleRef.current?.write(data);
    });
    const offExit = window.ride.terminal.onExit(({ id }) => {
      if (id === termId) handleRef.current?.write("\r\n\x1b[31m[process exited]\x1b[0m\r\n");
    });
    return () => {
      offData();
      offExit();
      void window.ride.terminal.kill(termId);
    };
  }, [termId]);

  return (
    <TerminalView
      id={termId}
      onReady={(h) => {
        handleRef.current = h;
      }}
      onData={(data) => void window.ride.terminal.write(termId, data)}
    />
  );
}
