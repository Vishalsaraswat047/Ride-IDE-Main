/**
 * RIDE command registry — the single source of truth for every action the
 * UI, keyboard, palette, menus, settings, and (later) the AI agent can trigger.
 */

export type CommandCategory = "file" | "view" | "git" | "ai" | "settings" | "help";

export interface RideCommand {
  id: string;
  title: string;
  category: CommandCategory;
  keybinding?: string;
  description?: string;
  icon?: string;
  run: () => void | Promise<void>;
}

export interface KeyEventLike {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  key: string;
}

interface ParsedBinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

const MODIFIER_ORDER = ["Ctrl", "Shift", "Alt", "Cmd"] as const;

/** Normalize a binding like "Ctrl+Shift+P" or "F5" into a comparable form. */
export function parseKeybinding(binding: string): ParsedBinding {
  const parts = binding.split("+").map((p) => p.trim());
  const out: ParsedBinding = { ctrl: false, shift: false, alt: false, key: "" };
  for (const part of parts) {
    if (part === "Ctrl" || part === "Cmd") out.ctrl = true;
    else if (part === "Shift") out.shift = true;
    else if (part === "Alt") out.alt = true;
    else out.key = part.toLowerCase();
  }
  return out;
}

export function bindingLabel(binding: string): string {
  const p = parseKeybinding(binding);
  const parts: string[] = [];
  if (p.ctrl) parts.push("Ctrl");
  if (p.shift) parts.push("Shift");
  if (p.alt) parts.push("Alt");
  if (p.key) parts.push(p.key.toUpperCase());
  return parts.join("+");
}

export function matchesEvent(binding: string, e: KeyEventLike): boolean {
  const p = parseKeybinding(binding);
  const ctrlPressed = e.ctrlKey || e.metaKey;
  if (p.ctrl !== ctrlPressed) return false;
  if (p.shift !== e.shiftKey) return false;
  if (p.alt !== e.altKey) return false;
  const key = e.key.toLowerCase();
  if (p.key === "space") return key === " ";
  return p.key === key;
}

export class CommandRegistry {
  private commands = new Map<string, RideCommand>();

  register(cmd: RideCommand): void {
    this.commands.set(cmd.id, cmd);
  }

  unregister(id: string): void {
    this.commands.delete(id);
  }

  get(id: string): RideCommand | undefined {
    return this.commands.get(id);
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }

  all(): RideCommand[] {
    return [...this.commands.values()].sort((a, b) => a.title.localeCompare(b.title));
  }

  byCategory(category: CommandCategory): RideCommand[] {
    return this.all().filter((c) => c.category === category);
  }

  /** Resolve a keyboard event to a registered command. */
  match(e: KeyEventLike): RideCommand | undefined {
    for (const cmd of this.commands.values()) {
      if (cmd.keybinding && matchesEvent(cmd.keybinding, e)) return cmd;
    }
    return undefined;
  }

  async execute(id: string): Promise<void> {
    const cmd = this.commands.get(id);
    if (cmd) await cmd.run();
  }

  /** Snapshot of registry as palette items (id, label, description, shortcut, category). */
  toPaletteItems(): { id: string; label: string; description?: string; shortcut?: string; category: CommandCategory }[] {
    return this.all().map((c) => ({
      id: c.id,
      label: c.title,
      description: c.description ?? c.category,
      shortcut: c.keybinding ? bindingLabel(c.keybinding) : undefined,
      category: c.category,
    }));
  }
}

export const commands = new CommandRegistry();

export { MODIFIER_ORDER };
