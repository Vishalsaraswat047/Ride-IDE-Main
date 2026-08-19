import { app } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { BillingPlan, ShipmentRecord, ShipStatus } from "@ride/contracts";
import { authService } from "../auth";

const SHIP_DIR = join(app.getPath("userData"), "ship");
const SHIPMENTS_FILE = join(SHIP_DIR, "shipments.json");

/** One source of truth for the project-shipment price — supplied by the app's billing plans. */
export class ShipService {
  private shipments: ShipmentRecord[] = [];
  private loaded = false;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await mkdir(SHIP_DIR, { recursive: true });
    try {
      this.shipments = JSON.parse(await readFile(SHIPMENTS_FILE, "utf8")) as ShipmentRecord[];
    } catch {
      this.shipments = [];
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(SHIP_DIR, { recursive: true });
    await writeFile(SHIPMENTS_FILE, JSON.stringify(this.shipments, null, 2), "utf8");
  }

  plan(): BillingPlan | null {
    return authService.getCurrentBillingPlan();
  }

  async record(input: { projectRoot: string; projectName: string; paymentMethod: string }): Promise<ShipmentRecord | null> {
    await this.ensureLoaded();
    const plan = this.plan();
    if (!plan) return null;
    const existing = this.shipments.find((s) => s.projectRoot === input.projectRoot);
    const record: ShipmentRecord = {
      projectRoot: input.projectRoot,
      projectName: input.projectName || input.projectRoot.split(/[\\/]/).pop() || "Project",
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      currency: plan.currency,
      shippedAt: existing?.shippedAt ?? Date.now(),
      paymentMethod: input.paymentMethod,
    };
    if (existing) {
      this.shipments = this.shipments.map((s) => (s.projectRoot === input.projectRoot ? record : s));
    } else {
      this.shipments.push(record);
    }
    await this.persist();
    return record;
  }

  async status(projectRoot: string): Promise<ShipStatus> {
    await this.ensureLoaded();
    const shipment = this.shipments.find((s) => s.projectRoot === projectRoot) ?? null;
    return { shipped: Boolean(shipment), shipment };
  }
}

export const shipService = new ShipService();