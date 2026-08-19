import { EventEmitter } from "node:events";
import * as os from "node:os";

export interface TerminalOptions {
  cwd: string;
  cols?: number;
  rows?: number;
  shell?: string;
  env?: Record<string, string>;
}

export interface TerminalEvents {
  data: (data: string) => void;
  exit: (exitCode: number) => void;
}

export class RideTerminal extends EventEmitter {
  readonly id: string;
  private pty: import("node-pty").IPty | null = null;

  constructor(id: string) {
    super();
    this.id = id;
  }

  override on(event: "data", listener: (data: string) => void): this;
  override on(event: "exit", listener: (exitCode: number) => void): this;
  override on(event: string | symbol, listener: (...args: never[]) => void): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.on(event, listener as (...args: any[]) => void);
  }

  spawn(opts: TerminalOptions): void {
    const pty = requirePty();
    const shell = opts.shell ?? defaultShell();
    const env: Record<string, string> = { ...process.env, ...opts.env } as Record<string, string>;
    this.pty = pty.spawn(shell, shellArgs(shell), {
      name: "xterm-256color",
      cols: opts.cols ?? 100,
      rows: opts.rows ?? 30,
      cwd: opts.cwd,
      env,
      useConpty: process.platform === "win32",
    });
    this.pty.onData((d) => this.emit("data", d));
    this.pty.onExit(({ exitCode }) => this.emit("exit", exitCode));
  }

  write(data: string): void {
    this.pty?.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty?.resize(cols, rows);
  }

  kill(): void {
    try {
      this.pty?.kill();
    } catch {
      /* already dead */
    }
    this.pty = null;
  }

  get alive(): boolean {
    return this.pty !== null;
  }
}

function requirePty(): typeof import("node-pty") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("node-pty");
  } catch (err) {
    throw new Error(
      "node-pty failed to load. On Windows ensure the prebuilt binary matches your Node version. " +
        (err instanceof Error ? err.message : String(err)),
    );
  }
}

function defaultShell(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC ?? "powershell.exe";
  }
  return process.env.SHELL ?? "/bin/bash";
}

function shellArgs(shell: string): string[] {
  if (process.platform === "win32") {
    const base = shell.toLowerCase();
    if (base.includes("powershell") || base.includes("pwsh")) return [];
    return ["/d /k"];
  }
  if (os.platform() === "darwin") {
    const base = shell.split(/[/\\]/).pop() ?? "";
    return ["--login", "-i"];
  }
  const base = shell.split(/[/\\]/).pop() ?? "";
  if (base.includes("fish")) return ["-i"];
  if (base.includes("zsh")) return ["-i"];
  return ["-i"];
}
