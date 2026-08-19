---
name: radix
description: Radix UI primitives skill — accessible unstyled building blocks: Dialog, Dropdown, Tabs, Tooltip, Popover, Select, Switch, etc. Use for custom components needing rock-solid keyboard/a11y behavior.
---

# Radix UI Primitives

Radix gives unstyled, fully-accessible primitives. Style with your own CSS/Tailwind/shadcn. Use directly when you need custom components beyond shadcn's set, or headless control.

## Key Primitives

- `Dialog` / `AlertDialog` — modals with focus trap, Esc, aria-modal.
- `DropdownMenu` / `ContextMenu` / `Menubar` — menus with arrow keys.
- `Popover` / `Tooltip` / `HoverCard` — floating layers (align, side, collision padding).
- `Tabs` — keyboard-navigable tabs.
- `Select` / `Combobox` / `RadioGroup` / `Switch` / `Checkbox` / `Slider` / `ToggleGroup`.
- `Accordion` / `Collapsible` / `NavigationMenu` / `ScrollArea` / `Separator` / `Tabs`.
- `Avatar` / `Progress` / `Toast` / `Label` / `Slot`.

## Installation

```bash
npm i @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs # per primitive
```

## Usage Rules

1. Import the root + sub-parts and wrap with your styled components:
   ```tsx
   <Dialog.Root open onOpenChange>
     <Dialog.Trigger asChild><Button>Open</Button></Dialog.Trigger>
     <Dialog.Portal>
       <Dialog.Overlay className="fixed inset-0 bg-black/50" />
       <Dialog.Content className="fixed ...">
         <Dialog.Title>Title</Dialog.Title>  {/* required */}
         <Dialog.Description>...</Dialog.Description>
       </Dialog.Content>
     </Dialog.Portal>
   </Dialog.Root>
   ```
2. `asChild` delegates to your button/link (uses Slot).
3. Do not set `display: none` on the trigger; use `asChild` on a Button.
4. Content layers: use `Dialog.Portal`; z-index via `fixed z-50`.
5. Never reimplement focus management, arrow keys, or aria — Radix owns it.
6. Style = your theme's tokens, not hardcoded colors.

## A11y contract Radix gives you for free

- Focus trap + restore, Esc to close, arrow-key navigation, `role` + `aria-*` wiring, scroll lock for dialogs, pointer/touch handling.

## Anti-Patterns

- ✗ Stacking multiple portals without z-index discipline (popover inside dialog gets cut).
- ✗ Disabling the close trigger but leaving no alternative (Esc always works — that's fine).
- ✗ `stopPropagation` hacks instead of Radix's `onInteractOutside`/`onPointerDownOutside`.