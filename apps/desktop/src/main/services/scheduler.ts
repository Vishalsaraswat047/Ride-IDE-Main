import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { ScheduledTask, TaskRunHistory } from "@ride/contracts";
import { resolveEndpoint } from "@ride/model-router";
import type { WorkspaceManager } from "./workspace";
import { buildToolResolver } from "./agentTools";
import { settingsManager } from "./settings";

const MS_MINUTE = 60_000;
const CHECK_INTERVAL = 30_000;

/**
 * Background task scheduler. Persists tasks + run history to userData,
 * runs due tasks through the same AgentBridge as the chat, and emits
 * { taskId, task, history } events on the "task" channel.
 */
class SchedulerService extends EventEmitter {
  private tasks: ScheduledTask[] = [];
  private history: TaskRunHistory[] = [];
  private timer: NodeJS.Timeout | null = null;
  private running = new Set<string>();
  private filePath = "";

  async init(): Promise<void> {
    this.filePath = join(app.getPath("userData"), "scheduled-tasks.json");
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as { tasks?: ScheduledTask[]; history?: TaskRunHistory[] };
      this.tasks = parsed.tasks ?? [];
      this.history = parsed.history ?? [];
    } catch {
      this.tasks = [];
      this.history = [];
    }
    this.refreshSchedules();
    this.timer = setInterval(() => this.tick(), CHECK_INTERVAL);
  }

  list(): ScheduledTask[] {
    return [...this.tasks].sort((a, b) => a.createdAt - b.createdAt);
  }

  historyFor(taskId: string): TaskRunHistory[] {
    return this.history
      .filter((h) => h.taskId === taskId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, 50);
  }

  async create(input: Omit<ScheduledTask, "id" | "createdAt" | "lastRunAt" | "nextRunAt" | "lastStatus" | "lastOutput">): Promise<ScheduledTask> {
    const task: ScheduledTask = {
      ...input,
      id: randomUUID(),
      createdAt: Date.now(),
      lastRunAt: null,
      nextRunAt: null,
      lastStatus: "idle",
      lastOutput: null,
    };
    task.nextRunAt = this.computeNextRun(task, Date.now());
    this.tasks.push(task);
    await this.persist();
    return task;
  }

  async update(id: string, patch: Partial<ScheduledTask>): Promise<ScheduledTask | null> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    const editable: (keyof ScheduledTask)[] = ["name", "prompt", "schedule", "intervalMinutes", "dayOfWeek", "hourOfDay", "workspaceRoot", "enabled", "model"];
    for (const key of editable) {
      if (key in patch) (task as Record<string, unknown>)[key] = patch[key];
    }
    task.nextRunAt = task.enabled ? this.computeNextRun(task, Date.now()) : null;
    await this.persist();
    return task;
  }

  async remove(id: string): Promise<boolean> {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.running.delete(id);
    if (this.tasks.length === before) return false;
    await this.persist();
    return true;
  }

  async runNow(id: string): Promise<TaskRunHistory | null> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return null;
    if (this.running.has(id)) return null;
    return this.execute(task);
  }

  private tick(): void {
    const now = Date.now();
    for (const task of this.tasks) {
      if (!task.enabled) continue;
      if (task.nextRunAt != null && task.nextRunAt <= now) {
        void this.execute(task);
      }
    }
  }

  private refreshSchedules(): void {
    const now = Date.now();
    for (const task of this.tasks) {
      task.nextRunAt = task.enabled ? this.computeNextRun(task, now) : null;
    }
  }

  private computeNextRun(task: ScheduledTask, from: number): number {
    if (!task.enabled) return 0;
    switch (task.schedule) {
      case "interval": {
        const minutes = task.intervalMinutes ?? 60;
        return from + minutes * MS_MINUTE;
      }
      case "hourly":
        return from + 60 * MS_MINUTE;
      case "daily": {
        const next = new Date(from);
        next.setHours(task.hourOfDay ?? 9, 0, 0, 0);
        if (next.getTime() <= from) next.setDate(next.getDate() + 1);
        return next.getTime();
      }
      case "weekly": {
        const next = new Date(from);
        next.setHours(task.hourOfDay ?? 9, 0, 0, 0);
        const targetDay = task.dayOfWeek ?? 1;
        while (next.getDay() !== targetDay) next.setDate(next.getDate() + 1);
        if (next.getTime() <= from) {
          next.setDate(next.getDate() + 7);
          while (next.getDay() !== targetDay) next.setDate(next.getDate() + 1);
        }
        return next.getTime();
      }
      default:
        return 0;
    }
  }

  private async execute(task: ScheduledTask): Promise<TaskRunHistory> {
    const history: TaskRunHistory = {
      id: randomUUID(),
      taskId: task.id,
      startedAt: Date.now(),
      finishedAt: null,
      status: "running",
      output: null,
      sessionId: null,
    };
    this.history.unshift(history);
    this.history = this.history.slice(0, 500);
    this.running.add(task.id);
    task.lastRunAt = Date.now();
    task.lastStatus = "running";
    task.lastOutput = null;
    task.nextRunAt = task.schedule === "manual" ? null : this.computeNextRun(task, Date.now());
    await this.persist();
    this.emit("task", { event: "started", taskId: task.id, history });

    const workspace = await this.resolveWorkspace(task);
    const cwd = task.workspaceRoot && workspace?.root ? workspace.root : app.getPath("home");
    const ai = settingsManager.get().ai;
    const modelId = task.model || ai.defaultModel;
    const endpoint = resolveEndpoint(modelId, ai);
    const { enrichPrompt, addCodebaseContext } = await import("../handlers/agent");
    let prompt = await enrichPrompt(cwd, task.prompt);
    if (workspace) prompt = await addCodebaseContext(workspace, prompt);

    let tools: ReturnType<typeof buildToolResolver> | undefined;
    try {
      if (workspace?.root) tools = buildToolResolver(workspace);
    } catch {
      tools = undefined;
    }

    const sessionId = randomUUID();
    try {
      const { agentBridge } = await import("../handlers/agent");
      const { createSkillLoader } = await import("./skills");
      const { mcpBridge } = await import("./agentTools");
      const { buildQuinnOptions } = await import("./quinn");
      const output = await agentBridge.runBackgroundTask({
        sessionId,
        prompt,
        model: modelId,
        endpoint,
        cwd,
        autoApprove: true,
        tools,
        skills: workspace ? createSkillLoader(workspace) : undefined,
        mcp: mcpBridge(),
        quinn: buildQuinnOptions({ prompt: task.prompt, endpoint, workspace, review: false }),
      });
      history.status = "success";
      history.output = output?.slice(-8000) ?? null;
      history.finishedAt = Date.now();
      task.lastStatus = "success";
      task.lastOutput = history.output;
    } catch (err) {
      history.status = "error";
      history.output = err instanceof Error ? err.message : String(err);
      history.finishedAt = Date.now();
      task.lastStatus = "error";
      task.lastOutput = history.output;
    } finally {
      this.running.delete(task.id);
      await this.persist();
      this.emit("task", { event: "finished", taskId: task.id, history });
    }
    return history;
  }

  private async resolveWorkspace(task: ScheduledTask): Promise<WorkspaceManager | null> {
    if (!task.workspaceRoot) return null;
    const { WorkspaceManager } = await import("./workspace");
    try {
      const manager = new WorkspaceManager();
      manager.setRoot(task.workspaceRoot);
      if (manager.projectDb) {
        await manager.scanIndex();
        return manager;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async persist(): Promise<void> {
    if (!this.filePath) return;
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify({ tasks: this.tasks, history: this.history }, null, 2), "utf8");
    } catch {
      /* disk failure — keep in-memory */
    }
  }
}

export const schedulerService = new SchedulerService();