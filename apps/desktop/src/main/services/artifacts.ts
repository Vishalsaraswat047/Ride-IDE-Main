import { randomUUID } from "node:crypto";
import type { Artifact } from "@ride/contracts";

/**
 * In-memory artifact store for the active app session.
 * Artifacts are evidence produced by agents: plans, diffs, code, reports,
 * screenshots, test results. The store is kept in memory for the session and
 * broadcast to the renderer via the artifacts:events channel.
 */
export class ArtifactStore {
  private artifacts = new Map<string, Artifact>();

  list(): Artifact[] {
    return [...this.artifacts.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  listForSession(sessionId: string): Artifact[] {
    return this.list().filter((a) => a.sessionId === sessionId);
  }

  create(input: {
    sessionId: string;
    kind: Artifact["kind"];
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Artifact {
    const now = Date.now();
    const artifact: Artifact = {
      id: randomUUID(),
      sessionId: input.sessionId,
      kind: input.kind,
      title: input.title,
      content: input.content,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  update(id: string, patch: { title?: string; content?: string; metadata?: Record<string, unknown> }): Artifact | undefined {
    const existing = this.artifacts.get(id);
    if (!existing) return undefined;
    const next: Artifact = {
      ...existing,
      ...patch,
      metadata: patch.metadata ? { ...(existing.metadata ?? {}), ...patch.metadata } : existing.metadata,
      updatedAt: Date.now(),
    };
    this.artifacts.set(id, next);
    return next;
  }

  delete(id: string): boolean {
    return this.artifacts.delete(id);
  }

  clear(): void {
    this.artifacts.clear();
  }
}

export const artifactStore = new ArtifactStore();