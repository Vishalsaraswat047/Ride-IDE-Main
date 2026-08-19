import { ipcMain } from "electron";
import { IpcChannel, type ScheduledTask } from "@ride/contracts";
import { sendToRenderer } from "../index";
import { schedulerService } from "../services/scheduler";

export function registerTaskHandlers(): void {
  schedulerService.on("task", (payload: { event: string; taskId: string; history: unknown }) => {
    sendToRenderer(IpcChannel.tasks.events, payload);
  });

  ipcMain.handle(IpcChannel.tasks.list, () => {
    return schedulerService.list();
  });

  ipcMain.handle(IpcChannel.tasks.create, async (_e, input: Parameters<typeof schedulerService.create>[0]) => {
    return schedulerService.create(input);
  });

  ipcMain.handle(IpcChannel.tasks.update, async (_e, id: string, patch: Partial<ScheduledTask>) => {
    return schedulerService.update(id, patch);
  });

  ipcMain.handle(IpcChannel.tasks.delete, async (_e, id: string) => {
    return schedulerService.remove(id);
  });

  ipcMain.handle(IpcChannel.tasks.runNow, async (_e, id: string) => {
    return schedulerService.runNow(id);
  });

  ipcMain.handle(IpcChannel.tasks.history, (_e, taskId: string) => {
    return schedulerService.historyFor(taskId);
  });
}