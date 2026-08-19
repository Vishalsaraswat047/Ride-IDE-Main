import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentSettings, RideModel } from "@ride/contracts";

const exec = promisify(execFile);

/** NVIDIA hosted inference endpoint (OpenAI-compatible). */
export const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1";

/** Featherless endpoint that serves the recommended Qwen2.5-Coder abliterated model. */
export const FEATHERLESS_ENDPOINT = "https://api.featherless.ai/v1";

/** RIDE's bundled NVIDIA key for all NVIDIA endpoints. */
export const NVIDIA_KEY = "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";

export interface ModelEndpoint {
  baseURL: string;
  apiKey: string;
  model: string;
}

/**
 * Resolve a RIDE model id to the direct (OpenAI-compatible) endpoint config.
 * No opencode — the agent column talks to NVIDIA/Featherless/Ollama straight up.
 */
export function resolveEndpoint(modelId: string | undefined, settings?: Partial<AgentSettings>): ModelEndpoint | undefined {
  if (!modelId) return undefined;
  if (modelId === "nvidia/nemotron-3-super-120b-a12b") {
    return { baseURL: NVIDIA_ENDPOINT, apiKey: NVIDIA_KEY, model: modelId };
  }
  if (modelId === "z-ai/glm-5.2") {
    return { baseURL: NVIDIA_ENDPOINT, apiKey: NVIDIA_KEY, model: modelId };
  }
  if (modelId === "huihui-ai/Qwen2.5-Coder-7B-Instruct-abliterated") {
    return { baseURL: FEATHERLESS_ENDPOINT, apiKey: settings?.featherlessApiKey ?? "", model: modelId };
  }
  if (modelId.startsWith("ollama/")) {
    return { baseURL: settings?.ollamaUrl ?? "http://localhost:11434/v1", apiKey: "none", model: modelId.replace("ollama/", "") };
  }
  return undefined;
}

/** The exact set of models RIDE offers — NVIDIA-hosted + one Hugging Face Inference Provider model. */
export const RIDE_MODELS: RideModel[] = [
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    provider: "nvidia-nemotron",
    kind: "remote",
    label: "Nemotron Super 120B",
    context: 131072,
    recommended: true,
    tasks: ["code", "refactor", "architecture", "explain"],
  },
  {
    id: "z-ai/glm-5.2",
    provider: "nvidia-nemotron",
    kind: "remote",
    label: "GLM-5.2 (Z.ai)",
    context: 131072,
    recommended: true,
    tasks: ["general", "chat", "reasoning", "planning"],
  },
  {
    id: "huihui-ai/Qwen2.5-Coder-7B-Instruct-abliterated",
    provider: "featherless",
    kind: "remote",
    label: "Qwen2.5 Coder 7B (uncensored)",
    context: 32768,
    recommended: true,
    tasks: ["code", "autocomplete", "small-edit"],
  },
];

/**
 * All models RIDE routes to. RIDE ships an exact set of recommended remote
 * models (NVIDIA Nemotron + GLM, and Featherless Qwen2.5-Coder).
 */
export async function listAllModels(_settings?: Partial<AgentSettings>): Promise<RideModel[]> {
  return RIDE_MODELS;
}
export type RideTaskKind = "autocomplete" | "explain" | "small-edit" | "refactor" | "architecture" | "planning" | "vision";

/** Task → model routing policy (small local for cheap ops, stronger for complex). */
export const TASK_ROUTING: Record<RideTaskKind, (models: RideModel[]) => string | undefined> = {
  autocomplete: (m) => pick(m, ["local", "remote"], ["code", "autocomplete"]) ?? pick(m, ["free"]),
  explain: (m) => pick(m, ["local", "remote"], ["explain", "general"]),
  "small-edit": (m) => pick(m, ["local", "remote"], ["code", "general"]),
  refactor: (m) => pick(m, ["remote", "free", "byok"], ["code", "general"]) ?? pick(m, ["local"]),
  architecture: (m) => pick(m, ["remote", "free", "byok"], ["general"]),
  planning: (m) => pick(m, ["remote", "free", "byok"], ["general", "planning"]),
  vision: (m) => pick(m, ["local", "remote"], ["vision"]),
};

function pick(models: RideModel[], kinds: RideModel["kind"][], taskHints: string[] = []): string | undefined {
  const pool = models.filter((m) => kinds.includes(m.kind));
  for (const hint of taskHints) {
    const hit = pool.find((m) => m.tasks?.includes(hint));
    if (hit) return hit.id;
  }
  return pool[0]?.id;
}

export interface LocalRuntime {
  ollama: { installed: boolean; models: string[] };
  models: RideModel[];
}

/** Detect local runtimes: Ollama first, llama.cpp optional. */
export async function detectLocalRuntimes(): Promise<LocalRuntime> {
  const ollamaModels: string[] = [];
  let installed = false;
  try {
    await exec("ollama", ["--version"]);
    installed = true;
  } catch {
    /* not installed */
  }
  if (installed) {
    try {
      const { stdout } = await exec("ollama", ["list"], { encoding: "utf8" });
      for (const line of stdout.split("\n").slice(1)) {
        const name = line.trim().split(/\s+/)[0];
        if (name && name !== "NAME") ollamaModels.push(name);
      }
    } catch {
      /* no models yet */
    }
  }

  const models: RideModel[] = [];
  for (const name of ollamaModels) {
    models.push({
      id: `ollama/${name}`,
      provider: "ollama",
      kind: "local",
      label: name,
      tasks: name.toLowerCase().includes("coder") ? ["code", "autocomplete"] : name.toLowerCase().includes("vl") ? ["vision"] : ["general", "explain"],
    });
  }

  return { ollama: { installed, models: ollamaModels }, models };
}
