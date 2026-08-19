import { execFile } from "node:child_process";
import { promisify } from "node:util";
import si from "systeminformation";
import {
  LOCAL_MODEL_CATALOG,
  type LocalAiTier,
  type RecommendedLocalModel,
  type SystemInfo,
} from "@ride/contracts";

const exec = promisify(execFile);

/**
 * Hardware scan for the Local AI feature. Every probe is best-effort and
 * falls back to safe defaults so detection never blocks or crashes the app.
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  let npu = false;
  try {
    const { stdout } = await exec(
      "powershell",
      ["-NoProfile", "-Command", "Get-PnpDevice | Where-Object { $_.FriendlyName -match 'NPU|Neural' } | Select-Object -First 1 | Measure-Object | Select-Object -ExpandProperty Count"],
      { timeout: 15_000, windowsHide: true },
    );
    npu = stdout.trim() === "1";
  } catch {
    /* NPU probe is best-effort */
  }
  try {
    const [cpu, mem, graphics, os, fs, battery] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.graphics(),
      si.osInfo(),
      si.fsSize(),
      si.battery().catch(() => null),
    ]);
    return {
      platform: os.platform ?? "unknown",
      os: [os.distro, os.release].filter(Boolean).join(" "),
      cpu: {
        model: [cpu.manufacturer, cpu.brand].filter(Boolean).join(" "),
        cores: cpu.physicalCores,
        threads: cpu.cores,
      },
      memoryGB: {
        total: round1(thr(mem.total / 1e9)),
        free: round1(thr(mem.free / 1e9)),
      },
      gpus: (graphics?.controllers ?? [])
        .filter((g) => !g.model?.startsWith("Microsoft Basic"))
        .map((g) => ({ name: g.model ?? "Unknown GPU", vendor: g.vendor ?? "unknown", vramGB: round1(thr((g.vram ?? 0) / 1024)) })),
      freeStorageGB: round1(thr(fs.reduce((acc, d) => acc + (d.available ?? 0), 0) / 1e9)),
      npu,
      battery: battery
        ? { hasBattery: Boolean(battery.hasBattery), onBattery: !battery.isCharging, percent: round1(thr(battery.percent)) }
        : undefined,
    };
  } catch {
    return {
      platform: "unknown",
      os: "unknown",
      cpu: { model: "unknown", cores: 0, threads: 0 },
      memoryGB: { total: 0, free: 0 },
      gpus: [],
      freeStorageGB: 0,
      npu,
    };
  }
}

/**
 * Pick the smallest model tier the machine can realistically run, escalating
 * only when RAM/VRAM justify it — "run the smallest model capable of the job".
 */
export function recommendModel(info: SystemInfo): RecommendedLocalModel {
  const { total } = info.memoryGB;
  const vram = Math.max(0, ...info.gpus.map((g) => g.vramGB));
  let tier: LocalAiTier;
  let reason: string;
  if (total >= 64 || vram >= 24) {
    tier = "max";
    reason = "64GB+ RAM or 24GB+ VRAM — MoE class hardware.";
  } else if (total >= 32 || vram >= 16) {
    tier = "pro";
    reason = "32GB+ RAM or 16GB+ VRAM — 32B model territory.";
  } else if ((total >= 16 && vram >= 6) || total >= 24) {
    tier = "developer";
    reason = "16GB+ RAM with a real GPU, or 24GB+ RAM — agentic coding local.";
  } else if (total >= 8) {
    tier = "standard";
    reason = "8GB+ RAM — the everyday student setup.";
  } else {
    tier = "lite";
    reason = "Under 8GB RAM — tiny model mode.";
  }
  const model = LOCAL_MODEL_CATALOG.find((m) => m.tier === tier) ?? LOCAL_MODEL_CATALOG[0] ?? { tier: "lite" as const, name: "RIDE Mini", ollamaTag: "qwen2.5-coder:1.5b", sizeGB: 1.1, description: "" };
  return {
    tier: model.tier,
    name: model.name,
    ollamaTag: model.ollamaTag,
    sizeGB: model.sizeGB,
    reason,
  };
}

function thr(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}