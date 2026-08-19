import { ipcMain } from "electron";
import { IpcChannel, type LocalChatRequest } from "@ride/contracts";
import { localAiService, wireLocalAiBroadcasts } from "../services/localAi";

let wired = false;

export function registerLocalAiHandlers(): void {
  if (!wired) {
    wireLocalAiBroadcasts();
    wired = true;
  }

  ipcMain.handle(IpcChannel.localAi.status, async () => localAiService.getStatus());

  ipcMain.handle(IpcChannel.localAi.installRuntime, async () => localAiService.installRuntime());

  ipcMain.handle(IpcChannel.localAi.pullModel, async (_e, tag: string) => {
    await localAiService.pullModel(tag);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.localAi.deleteModel, async (_e, tag: string) => {
    await localAiService.deleteModel(tag);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.localAi.chat, async (_e, req: LocalChatRequest) => {
    void localAiService.chat(req).catch((err) => {
      localAiService.emit("chatEvent", {
        type: "done",
        requestId: req.requestId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return { started: true };
  });
}