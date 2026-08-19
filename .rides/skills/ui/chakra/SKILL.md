---
name: chakra
description: Chakra UI skill — React component library with inline style props and theme tokens. ChakraProvider, variants, sizes, dark mode, Grid/Stack. Use only in Chakra-based projects.
---

# Chakra UI

React component library styled with style props + theme. Props-first API: `bg`, `p`, `colorScheme`, `size`, `variant`.

## Setup

```bash
npm i @chakra-ui/react @emotion/react @emotion/styled framer-motion
```

```tsx
<ChakraProvider theme={theme}><ColorModeScript initialColorMode="system" /></ChakraProvider>
```

## Core API

1. **Style props**: `<Box bg="brand.500" p={4} rounded="lg" shadow="md" />` — spacing/colors from theme scales, not px.
2. **Variants & sizes** come from theme component config: `<Button colorScheme="blue" variant="solid|outline|ghost|link" size="md">`.
3. Layout: `Stack` (vertical), `HStack`/`VStack`, `Grid` (`templateColumns="repeat(4, 1fr)"`), `Flex`, `Container`.
4. Typography: `<Heading as="h1" size="xl">`, `<Text>`.
5. Dark mode: `useColorMode()` + `ColorModeScript`; tokens via `useColorModeValue("lightVal","darkVal")`.

## Components

- `Modal` (with `ModalOverlay`, `ModalContent`, `ModalHeader`, `ModalCloseButton`, `ModalBody`, `ModalFooter`).
- `Drawer` (side panel), `Popover`, `Tooltip`, `Tabs`, `Accordion`, `Menu`, `Select`, `InputGroup`.
- `FormControl` + `FormLabel` + `FormErrorMessage` for forms; `required` on FormLabel.
- `Table` with `variant="simple|striped"`; `Badge`, `Avatar`, `Alert`, `Toast` (`useToast`).

## Rules

1. Extend theme: `extendTheme({ colors: { brand: {...} }, components: {...} })` — tokens, not ad-hoc.
2. Use `useDisclosure()` for modal/drawer state.
3. Responsive: array or object props `w={{ base: '100%', md: '50%' }}`.
4. Chakra includes framer-motion animations on transitions — respect `prefers-reduced-motion`.
5. Don't mix with Tailwind classes inside Chakra components.

## Do / Don't

| Do | Don't |
|---|---|
| Use theme scales (`p={4}`) | Raw px in props |
| Extend theme for brand colors | Hex strings everywhere |
| `colorScheme` for consistent accents | Per-instance arbitrary colors |

## Verification

- [ ] No raw hex except in theme extension.
- [ ] ColorMode toggle works.
- [ ] Keyboard nav on menus/modals works.