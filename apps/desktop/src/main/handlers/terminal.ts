import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { IpcChannel } from "@ride/contracts";
import { RideTerminal } from "@ride/terminal";
import type { WorkspaceManager } from "../services/workspace";
import { sendToRenderer } from "../index";

const terminals = new Map<string, RideTerminal>();

export function registerTerminalHandlers(workspace: WorkspaceManager): void {
  ipcMain.handle(IpcChannel.terminal.spawn, async (_e, req: { id?: string; cwd: string; cols: number; rows: number }) => {
    const id = req.id ?? randomUUID();
    const term = new RideTerminal(id);
    term.on("data", (data) => {
      sendToRenderer(IpcChannel.terminal.data, { id, data });
    });
    term.on("exit", (code) => {
      sendToRenderer(IpcChannel.terminal.exit, { id, code });
      terminals.delete(id);
    });
    const cwd = req.cwd || workspace.root || process.env.USERPROFILE || "/";
    term.spawn({ cwd, cols: req.cols, rows: req.rows });
    terminals.set(id, term);
    return { id };
  });

  ipcMain.on(IpcChannel.terminal.write, (_e, payload: { id: string; data: string }) => {
    terminals.get(payload.id)?.write(payload.data);
  });

  ipcMain.on(IpcChannel.terminal.resize, (_e, payload: { id: string; cols: number; rows: number }) => {
    terminals.get(payload.id)?.resize(payload.cols, payload.rows);
  });

  ipcMain.on(IpcChannel.terminal.kill, (_e, id: string) => {
    terminals.get(id)?.kill();
    terminals.delete(id);
  });
}
