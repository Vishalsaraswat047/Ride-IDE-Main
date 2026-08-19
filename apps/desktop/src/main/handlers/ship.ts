import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import { shipService } from "../services/ship";

export function registerShipHandlers(): void {
  ipcMain.handle(IpcChannel.ship.plan, () => shipService.plan());

  ipcMain.handle(
    IpcChannel.ship.record,
    async (_e, input: { projectRoot: string; projectName: string; paymentMethod: string }) => {
      const root = String(input?.projectRoot ?? "").trim();
      if (!root) return null;
      return shipService.record({
        projectRoot: root,
        projectName: String(input?.projectName ?? "").trim(),
        paymentMethod: String(input?.paymentMethod ?? "").trim() || "RIDE wallet",
      });
    }
  );

  ipcMain.handle(IpcChannel.ship.status, async (_e, projectRoot: string) => {
    return shipService.status(String(projectRoot ?? ""));
  });
}