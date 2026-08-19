import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { RideTemplate } from "@ride/contracts";
import { CheckCircle2, Loader2, X } from "lucide-react";

const CATEGORIES = ["websites", "webapps", "ai", "games", "developer", "agent"];

export function SaveTemplateModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("webapps");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<RideTemplate | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setCategory("webapps");
      setTags("");
      setError(null);
      setSaved(null);
    }
  }, [open]);

  const save = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await window.ride.template.save({
        name: name.trim(),
        description: description.trim(),
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (!result.ok) {
        setError(result.error ?? "Failed to save template");
      } else if (result.template) {
        setSaved(result.template);
        setTimeout(() => onOpenChange(false), 1400);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-hairline bg-canvas shadow-level-4">
          <div className="flex h-11 items-center gap-2 border-b border-hairline bg-canvas-soft px-4">
            <span className="text-sm font-medium text-ink">Save project as template</span>
            <Dialog.Close className="ml-auto rounded-sm p-1.5 text-mute transition-colors hover:bg-canvas-soft-2 hover:text-ink ride-focus-ring">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="p-4">
            {saved ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <p className="text-sm font-medium text-ink">Saved “{saved.name}”</p>
                <p className="text-xs text-mute">Find it under My templates on the start screen.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-ink">Name *</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Modern SaaS Dashboard"
                      className="h-8 w-full rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-ink">Description</span>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What makes this template useful?"
                      className="h-8 w-full rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-ink">Category</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-8 w-full rounded-sm border border-hairline bg-canvas px-2 text-xs text-ink outline-none ride-focus-ring"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c === "webapps" ? "Web Apps" : c === "websites" ? "Websites" : c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-ink">Tags</span>
                    <input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="React, Tailwind, dark-mode"
                      className="h-8 w-full rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
                    />
                  </label>
                </div>
                {error && <p className="mt-3 rounded-sm bg-error/10 px-2.5 py-1.5 text-[11px] text-error">{error}</p>}
                <p className="mt-3 text-[11px] leading-5 text-mute">
                  Copies the current workspace (excluding node_modules, .git, dist) into your RIDE template
                  library.
                </p>
              </>
            )}
          </div>
          {!saved && (
            <div className="flex items-center justify-end gap-2 border-t border-hairline px-4 py-3">
              <Dialog.Close className="h-8 rounded-sm border border-hairline bg-canvas px-3 text-xs text-body transition-colors hover:bg-canvas-soft hover:text-ink ride-focus-ring">
                Cancel
              </Dialog.Close>
              <button
                onClick={() => void save()}
                disabled={busy}
                className="flex h-8 items-center gap-1.5 rounded-sm bg-primary px-4 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-60 ride-focus-ring"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save template
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}