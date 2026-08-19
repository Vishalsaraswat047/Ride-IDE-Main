import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@ride/ui";

interface PendingRequest {
  requestID: string;
  tool: string;
  summary: string;
  input: unknown;
  impact: string;
}

export function PermissionGate() {
  const [request, setRequest] = useState<PendingRequest | null>(null);

  useEffect(() => {
    return window.ride.agent.onEvent((raw) => {
      const ev = raw as { type: string; requestID?: string; tool?: string; summary?: string; input?: unknown; impact?: string; decision?: string };
      if (ev.type === "permission.request") {
        setRequest({
          requestID: ev.requestID!,
          tool: ev.tool ?? "tool",
          summary: ev.summary ?? "Agent action requires approval",
          input: ev.input,
          impact: ev.impact ?? "medium",
        });
      }
      if (ev.type === "permission.result") {
        setRequest((cur) => (cur?.requestID === ev.requestID ? null : cur));
      }
    });
  }, []);

  const decide = (decision: "allow-once" | "always" | "deny") => {
    if (!request) return;
    void window.ride.agent.decide({ requestID: request.requestID, decision });
    setRequest(null);
  };

  return (
    <Dialog.Root open={!!request} onOpenChange={(o) => !o && decide("deny")}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hairline bg-canvas p-5 shadow-level-5">
          <div className="flex items-start gap-3">
            <span
              className={
                request?.impact === "high"
                  ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-error/10 text-error"
                  : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning"
              }
            >
              {request?.impact === "high" ? <ShieldX className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-sm font-semibold text-ink">
                {request?.impact === "high" ? "High-impact action" : "Agent permission"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-body break-words">
                {request?.summary}
              </Dialog.Description>
              <div className="mt-2 rounded-md bg-canvas-soft px-2.5 py-1.5 font-mono text-[11px] leading-4 text-mute">
                {request?.tool}
                {request?.input ? ` · ${JSON.stringify(request.input).slice(0, 160)}` : ""}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => decide("deny")}>
              <ShieldX className="h-3.5 w-3.5" /> Deny
            </Button>
            <Button variant="secondary" size="sm" onClick={() => decide("allow-once")}>
              <ShieldCheck className="h-3.5 w-3.5" /> Allow once
            </Button>
            <Button size="sm" onClick={() => decide("always")}>
              Always allow
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
