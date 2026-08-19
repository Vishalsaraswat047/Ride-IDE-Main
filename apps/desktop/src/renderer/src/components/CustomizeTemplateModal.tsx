import { useState } from "react";
import type { RideTemplate, TemplateQuestion } from "@ride/contracts";
import { Loader2, Sparkles, X } from "lucide-react";
import { customizeTemplate } from "../lib/hooks";

interface CustomizeTemplateModalProps {
  template: RideTemplate;
  modelId?: string;
  onClose: () => void;
}

export function CustomizeTemplateModal({ template, modelId, onClose }: CustomizeTemplateModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.questions.map((q) => [q.id, q.defaultValue ?? ""])),
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAnswer = (q: TemplateQuestion, value: string) => setAnswers((a) => ({ ...a, [q.id]: value }));

  const generate = async () => {
    const missing = template.questions.filter((q) => q.required && !answers[q.id]?.trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((q) => q.label).join(", ")}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await customizeTemplate(template, answers, notes, modelId);
      if (!result) {
        setBusy(false);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scaffold the project");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={() => !busy && onClose()}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline bg-canvas-soft px-4">
          <Sparkles className="h-3.5 w-3.5 text-violet" />
          <span className="text-sm font-medium text-ink">Customize {template.name} with AI</span>
          <button onClick={onClose} disabled={busy} className="ml-auto rounded-sm p-1.5 text-mute transition-colors hover:bg-canvas-soft-2 hover:text-ink ride-focus-ring">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="text-xs leading-5 text-mute">
            Answer a few questions — RIDE scaffolds {template.name}, then the agent rewrites it to match.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {template.questions.length === 0 && (
              <p className="rounded-sm border border-hairline bg-canvas-soft px-3 py-2 text-xs text-body">
                This template has no customization questions — describe what you want in the notes below.
              </p>
            )}
            {template.questions.map((q) => (
              <label key={q.id} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink">
                  {q.label}
                  {q.required && <span className="text-error"> *</span>}
                </span>
                {q.kind === "text" ? (
                  <input
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q, e.target.value)}
                    placeholder={q.placeholder}
                    className="h-8 w-full rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
                  />
                ) : (
                  <select
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q, e.target.value)}
                    className="h-8 w-full rounded-sm border border-hairline bg-canvas px-2 text-xs text-ink outline-none ride-focus-ring"
                  >
                    {q.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            ))}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink">Extra instructions for the agent</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Make it a VLSI engineer portfolio — skills, projects, resume…"
                rows={3}
                className="w-full resize-none rounded-sm border border-hairline bg-canvas px-2.5 py-2 text-xs leading-5 text-ink outline-none placeholder:text-mute ride-focus-ring"
              />
            </label>
          </div>
          {error && <p className="mt-3 rounded-sm bg-error/10 px-2.5 py-1.5 text-[11px] text-error">{error}</p>}
        </div>
        <div className="flex items-center gap-2 border-t border-hairline px-4 py-3">
          <span className="text-[11px] text-mute">Pick a folder after Generate — the agent then starts automatically.</span>
          <button
            onClick={() => void generate()}
            disabled={busy}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-sm bg-primary px-4 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-60 ride-focus-ring"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {busy ? "Scaffolding…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}