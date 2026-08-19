import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, CornerDownLeft } from "lucide-react";
import { cn } from "../lib/cn";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
  emptyText?: string;
}

export function CommandBar({
  open,
  onOpenChange,
  items,
  placeholder = "Type a command or search…",
  emptyText = "No matching commands",
}: CommandBarProps) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  React.useEffect(() => setActive(0), [filtered.length, query]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px] data-[state=closed]:animate-fade-out" />
        <Dialog.Content
          className="fixed left-1/2 top-[18%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-5 data-[state=closed]:animate-fade-out"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 border-b border-hairline px-3">
            <Search className="h-4 w-4 shrink-0 text-mute" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && filtered[active]) {
                  filtered[active]!.onSelect();
                  onOpenChange(false);
                }
              }}
              placeholder={placeholder}
              className="h-11 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-mute"
            />
            <kbd className="flex items-center gap-0.5 rounded-sm border border-hairline px-1.5 py-0.5 text-[10px] text-mute">
              <CornerDownLeft className="h-3 w-3" />
            </kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-mute">{emptyText}</div>
            )}
            {filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  item.onSelect();
                  onOpenChange(false);
                }}
                onMouseEnter={() => setActive(idx)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm text-ink transition-colors ride-focus-ring",
                  idx === active && "bg-canvas-soft-2",
                )}
              >
                {item.icon && <span className="text-mute">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
                {item.description && (
                  <span className="truncate text-xs text-mute">{item.description}</span>
                )}
                {item.shortcut && (
                  <kbd className="rounded-sm border border-hairline px-1.5 py-0.5 text-[10px] text-mute">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
