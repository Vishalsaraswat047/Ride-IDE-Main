import { ipcMain } from "electron";
import { IpcChannel, type Artifact } from "@ride/contracts";
import { artifactStore } from "../services/artifacts";
import { sendToRenderer } from "../index";

function emit(event: unknown): void {
  sendToRenderer(IpcChannel.artifacts.events, event);
}

export function registerArtifactHandlers(): void {
  ipcMain.handle(IpcChannel.artifacts.list, (_e, sessionId?: string) => {
    return sessionId ? artifactStore.listForSession(sessionId) : artifactStore.list();
  });

  ipcMain.handle(IpcChannel.artifacts.create, (_e, input: { sessionId: string; kind: Artifact["kind"]; title: string; content: string; metadata?: Record<string, unknown> }) => {
    const artifact = artifactStore.create(input);
    emit({ type: "artifact.created", sessionID: input.sessionId, artifact });
    return artifact;
  });

  ipcMain.handle(IpcChannel.artifacts.update, (_e, id: string, patch: { title?: string; content?: string; metadata?: Record<string, unknown> }) => {
    const artifact = artifactStore.update(id, patch);
    if (artifact) emit({ type: "artifact.updated", sessionID: artifact.sessionId, artifact });
    return artifact;
  });

  ipcMain.handle(IpcChannel.artifacts.delete, (_e, id: string) => {
    const artifact = artifactStore.list().find((a) => a.id === id);
    const ok = artifactStore.delete(id);
    if (ok && artifact) emit({ type: "artifact.deleted", sessionID: artifact.sessionId, artifactId: id });
    return { ok };
  });

  ipcMain.handle(IpcChannel.artifacts.feedback, (_e, artifactId: string, feedback: string) => {
    const artifact = artifactStore.list().find((a) => a.id === artifactId);
    if (!artifact) return { ok: false };
    const updated = artifactStore.update(artifactId, { metadata: { ...(artifact.metadata ?? {}), feedback: (artifact.metadata?.feedback as string[] ?? []).concat(feedback) } });
    if (updated) emit({ type: "artifact.feedback", sessionID: updated.sessionId, artifactId, feedback });
    return { ok: Boolean(updated) };
  });
}