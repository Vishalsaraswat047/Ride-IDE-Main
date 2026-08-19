import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import { mcpRegistry } from "../services/mcpRegistry";

export function registerMcpHandlers(): void {
  ipcMain.handle(IpcChannel.mcp.list, () => {
    return mcpRegistry.listClients();
  });

  ipcMain.handle(IpcChannel.mcp.connectAll, async () => {
    await mcpRegistry.connectAll();
    return mcpRegistry.listClients();
  });

  ipcMain.handle(IpcChannel.mcp.reconnect, async (_e, id: string) => {
    const result = await mcpRegistry.reconnect(id);
    return result;
  });

  ipcMain.handle(IpcChannel.mcp.add, async (_e, input: { name: string; url: string; headers?: Record<string, string> }) => {
    return mcpRegistry.addServer(input);
  });

  ipcMain.handle(IpcChannel.mcp.update, async (_e, id: string, patch: Partial<{ name: string; url: string; headers: Record<string, string>; enabled: boolean }>) => {
    return mcpRegistry.updateServer(id, patch);
  });

  ipcMain.handle(IpcChannel.mcp.remove, async (_e, id: string) => {
    return mcpRegistry.removeServer(id);
  });
}