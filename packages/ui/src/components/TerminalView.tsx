import * as React from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import "xterm/css/xterm.css";
import { cn } from "../lib/cn";

export interface TerminalViewHandle {
  write: (data: string) => void;
  clear: () => void;
  focus: () => void;
}

export interface TerminalViewProps {
  id: string;
  className?: string;
  onReady: (handle: TerminalViewHandle) => void;
  onData?: (data: string) => void;
  onMount?: (term: Terminal) => void;
}

export const TerminalView = React.forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ id, className, onReady, onData, onMount }, ref) {
    const hostRef = React.useRef<HTMLDivElement>(null);
    const termRef = React.useRef<Terminal | null>(null);

    React.useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        lineHeight: 1.35,
        convertEol: true,
        allowProposedApi: true,
        theme: {
          background: "#171717",
          foreground: "#f2f2f2",
          cursor: "#f2f2f2",
          selectionBackground: "#4d4d4d",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(host);
      fit.fit();
      termRef.current = term;

      const disposables = [
        term.onData((d) => onData?.(d)),
        term.onResize(() => fit.fit()),
      ];

      const handle: TerminalViewHandle = {
        write: (data) => term.write(data),
        clear: () => term.clear(),
        focus: () => term.focus(),
      };
      if (ref) {
        if (typeof ref === "function") ref(handle);
        else ref.current = handle;
      }
      onReady(handle);
      onMount?.(term);

      return () => {
        disposables.forEach((d) => d.dispose());
        term.dispose();
        if (ref) {
          if (typeof ref === "function") ref(null);
          else ref.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    return <div className={cn("ride-terminal h-full w-full bg-[#171717]", className)} ref={hostRef} />;
  },
);
