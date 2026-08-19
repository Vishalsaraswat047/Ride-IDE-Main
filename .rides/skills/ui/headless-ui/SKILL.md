---
name: headless-ui
description: Headless UI skill — unstyled, accessible components for React/Vue by Tailwind Labs. Menu, Listbox, Dialog, Transition. Style entirely with your own Tailwind classes.
---

# Headless UI

Tailwind Labs' unstyled accessible components (React + Vue). Bring your own Tailwind styling — perfect when you want Tailwind + a11y without shadcn's Radix set.

## Install

```bash
npm i @headlessui/react
```

## Components (React)

- `Menu` (dropdown) — `Menu.Button`, `Menu.Items`, `Menu.Item`.
- `Listbox` (select) — options with keyboard nav.
- `Combobox` (autocomplete), `Dialog` (modal + `Dialog.Title`), `Popover`, `Switch`, `RadioGroup`, `Tabs`, `Transition` (enter/leave animations), `Disclosure` (accordion).
- v2 note: `<Dialog>` API restructured (uses `Dialog` as root with `DialogPanel`). Check installed version's docs.

## Patterns

```tsx
<Menu as="div" className="relative">
  <Menu.Button className="...">Options</Menu.Button>
  <Menu.Items className="absolute ...">
    <Menu.Item>
      {({ active }) => <button className={active ? "bg-gray-100" : ""}>Item</button>}
    </Menu.Item>
  </Menu.Items>
</Menu>
```

1. `as` prop lets you render as any element (div, section).
2. Render-prop children receive `active`/`open`/`disabled` state for styling.
3. `Transition` wraps show/hide: `show={open}`, `enter="transition ..."`, `enterFrom=...`, `leaveTo=...`.

## Rules

1. All styling is YOUR Tailwind classes — no default chrome; that's the point.
2. Use `unmount={false}` on dialogs to keep exit animations.
3. For rich datasets prefer `Listbox`/`Combobox` over custom selects.
4. Keep focus management to Headless UI — don't override `autoFocus` hacks.

## Do / Don't

| Do | Don't |
|---|---|
| Tailwind classes for everything visual | Inline styles / styled-components |
| `Transition` for enter/leave | CSS-only show/hide |
| Use `as` for semantic elements | Div soup without `as` |
| Accessible defaults (aria wired) | Re-adding role/aria manually |

## Verification

- [ ] Esc closes menus/dialogs; arrow keys navigate items.
- [ ] Focus lands inside dialog on open, returns on close.
- [ ] No hardcoded styling outside Tailwind utilities.