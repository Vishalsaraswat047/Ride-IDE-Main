/**
 * RIDE Library Registry — library-first generation.
 *
 * The registry owns "which libraries does this template use". It is a catalog
 * of capabilities (UI components, icons, motion, scroll, 3D, shaders, charts,
 * maps, rich text, drag & drop, forms, carousels, tables, dates, images) plus
 * a curated per-archetype selection policy.
 *
 * RULES (per the RIDE master spec):
 *  - "ALL CAPABILITIES AVAILABLE" — never reinvent a capability an installed,
 *    appropriate library already provides.
 *  - NOT "FORCE EVERY LIBRARY INTO EVERY WEBSITE" — the selected stack is the
 *    best-fit set for the product's category, visual direction and required
 *    interactions. Nothing dead, nothing fake.
 *  - `deps` lists only what the generated code actually imports in the
 *    scaffold; `libraries` is the curated recommendation surfaced in the
 *    manifest and preview for the agent to install/use when permitted.
 */

export interface RecommendedLibrary {
  name: string;
  category: string;
  purpose: string;
}

export interface RegistryEntry {
  ui: string;
  icons: string;
  animation: string;
  graphics: string;
  charts: string;
  deps: string[];
  libraries: RecommendedLibrary[];
}

const BASE_REACT_DEPS = ["react", "react-dom", "lucide-react", "tailwindcss", "vite", "typescript"];

/* ─── Library catalog ─────────────────────────────────────────────────────── */

export const LIBRARY_CATALOG: Record<string, string[]> = {
  "UI components": ["Galaxy (uiverse.io)", "shadcn/ui", "Radix UI", "Headless UI", "React Aria", "Ark UI"],
  Icons: ["Lucide", "Tabler Icons", "Phosphor Icons", "Heroicons", "React Icons"],
  Motion: ["Motion (Framer)", "GSAP", "AutoAnimate", "Lottie"],
  Scroll: ["Lenis", "GSAP ScrollTrigger"],
  "3D": ["Three.js", "React Three Fiber", "Drei", "React Postprocessing"],
  Shaders: ["WebGL", "GLSL"],
  Charts: ["Recharts", "D3", "ECharts", "Visx"],
  Maps: ["MapLibre", "Leaflet"],
  "Rich text": ["Tiptap"],
  "Drag & drop": ["dnd-kit"],
  Forms: ["React Hook Form", "Zod"],
  Carousels: ["Embla", "Swiper"],
  Tables: ["TanStack Table"],
  Dates: ["date-fns"],
  Images: ["Responsive images", "Lazy loading", "AVIF/WebP"],
};

const LIB = (category: string, name: string, purpose: string): RecommendedLibrary => ({ name, category, purpose });

/** Galaxy (uiverse.io) is the default UI component source — every stack ships
 *  the gk-* kit (buttons, inputs, cards, toggles, loaders, toasts, tooltips,
 *  badges, progress) restyled on the Vercel DESIGN.md token system. */
const GALAXY_LIB = LIB("UI components", "Galaxy (uiverse.io)", "gk-* component kit on Vercel DESIGN.md tokens");

/* ─── Curated per-archetype stacks ────────────────────────────────────────── */

const STACKS: Record<string, RegistryEntry> = {
  /* Websites */
  portfolio: {
    ui: "Custom components",
    icons: "lucide-react",
    animation: "Motion + GSAP",
    graphics: "Procedural SVG & gradients",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Custom components", "art-directed, no generic cards"),
      LIB("Icons", "Lucide", "sharp 1.8px geometric icons"),
      LIB("Motion", "Motion (Framer)", "staggered reveals, text + image reveals"),
      LIB("Scroll", "Lenis", "smooth inertial scrolling for the showreel feel"),
      LIB("3D", "React Three Fiber", "interactive hero scene when art direction calls for it"),
      LIB("Images", "Lazy loading", "folio imagery loads below the fold"),
    ],
  },
  agency: {
    ui: "Headless UI + Custom",
    icons: "Lucide",
    animation: "GSAP",
    graphics: "Procedural SVG",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Custom components", "awards-grade campaign layout system"),
      LIB("Icons", "Lucide", "consistent stroke geometry"),
      LIB("Motion", "GSAP", "scroll-linked case-study transitions"),
      LIB("Scroll", "Lenis", "cinematic scrolling"),
      LIB("Carousels", "Embla", "project and client sliders"),
    ],
  },
  landing: {
    ui: "Custom components",
    icons: "lucide-react",
    animation: "Motion",
    graphics: "Procedural SVG & gradients",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Custom components", "conversion-first hero + proof sections"),
      LIB("Icons", "Lucide", "feature and integration marks"),
      LIB("Motion", "Motion (Framer)", "section reveals, button micro-interactions"),
      LIB("Forms", "React Hook Form", "lead capture with Zod validation"),
    ],
  },
  blog: {
    ui: "Custom components",
    icons: "lucide-react",
    animation: "CSS + Motion",
    graphics: "Procedural SVG",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Custom components", "editorial reading system"),
      LIB("Icons", "Lucide", "reading chrome icons"),
      LIB("Rich text", "Tiptap", "authoring-grade prose rendering"),
      LIB("Carousels", "Embla", "reading-list carousels"),
    ],
  },
  documentation: {
    ui: "Custom components",
    icons: "lucide-react",
    animation: "CSS",
    graphics: "Procedural SVG",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Custom components", "docs sidebar + stable nav"),
      LIB("Icons", "Lucide", "API reference chrome"),
      LIB("Rich text", "Tiptap", "spec prose semantics"),
      LIB("Search", "Command palette", "⌘K docs search"),
    ],
  },
  ecommerce: {
    ui: "Radix UI + Custom",
    icons: "lucide-react",
    animation: "Motion",
    graphics: "Procedural SVG & gradients",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Radix UI", "accessible dialogs, menus, toasts"),
      LIB("Icons", "Lucide", "product and commerce chrome"),
      LIB("Motion", "Motion (Framer)", "cart drawer, image swap transitions"),
      LIB("Carousels", "Embla", "product galleries"),
      LIB("Forms", "React Hook Form", "checkout with Zod"),
      LIB("Images", "Lazy loading", "catalog images stay fast"),
    ],
  },
  restaurant: {
    ui: "Custom components",
    icons: "lucide-react",
    animation: "CSS + Motion",
    graphics: "Procedural SVG",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Custom components", "menu, reservation, story system"),
      LIB("Icons", "Lucide", "menu and location marks"),
      LIB("Motion", "Motion (Framer)", "dish reveals and gallery fades"),
      LIB("Carousels", "Embla", "gallery carousels"),
      LIB("Maps", "MapLibre", "location and directions"),
    ],
  },
  "real-estate": {
    ui: "Radix UI + Custom",
    icons: "lucide-react",
    animation: "Motion",
    graphics: "Procedural SVG",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Radix UI", "filters, drawers, dialogs"),
      LIB("Icons", "Lucide", "listing chrome"),
      LIB("Maps", "MapLibre", "property map view"),
      LIB("Carousels", "Embla", "property galleries"),
      LIB("Forms", "React Hook Form", "booking/schedule enquiries"),
    ],
  },
  hospital: {
    ui: "Radix UI + Custom",
    icons: "lucide-react",
    animation: "CSS + Motion",
    graphics: "Procedural SVG",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Radix UI", "accessible appointment flows"),
      LIB("Icons", "Lucide", "care and specialty marks"),
      LIB("Forms", "React Hook Form", "appointment intake with Zod"),
      LIB("Dates", "date-fns", "booking calendar logic"),
    ],
  },
  education: {
    ui: "Headless UI + Custom",
    icons: "lucide-react",
    animation: "Motion",
    graphics: "Procedural SVG",
    charts: "—",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Custom components", "course catalog + curriculum system"),
      LIB("Icons", "Lucide", "discipline marks"),
      LIB("Carousels", "Embla", "curriculum previews"),
      LIB("Charts", "Visx", "learning-progress visualization"),
    ],
  },
  finance: {
    ui: "Radix UI + Custom",
    icons: "lucide-react",
    animation: "CSS + Motion",
    graphics: "Procedural SVG",
    charts: "ECharts",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "Radix UI", "accessible disclosure patterns"),
      LIB("Icons", "Lucide", "financial chrome"),
      LIB("Charts", "ECharts", "market and portfolio series"),
      LIB("Tables", "TanStack Table", "holdings and transactions"),
      LIB("Forms", "React Hook Form", "onboarding with Zod"),
    ],
  },

  /* Web-apps (browser archetypes) */
  dashboard: {
    ui: "shadcn/ui + Radix",
    icons: "lucide-react",
    animation: "Motion",
    graphics: "Procedural SVG",
    charts: "Recharts",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "shadcn/ui", "production dashboard primitives"),
      LIB("Icons", "Lucide", "workspace chrome"),
      LIB("Charts", "Recharts", "KPI and trend series"),
      LIB("Tables", "TanStack Table", "sortable, filterable data grids"),
      LIB("Forms", "React Hook Form", "settings with Zod"),
      LIB("Math", "date-fns", "time-range math"),
      LIB("Drag & drop", "dnd-kit", "kanban boards and reorder lists"),
    ],
  },
  analytics: {
    ui: "shadcn/ui + Custom",
    icons: "lucide-react",
    animation: "CSS + Motion",
    graphics: "Procedural SVG",
    charts: "Recharts",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "shadcn/ui", "data-dense layout primitives"),
      LIB("Charts", "Recharts", "event and funnel series"),
      LIB("Tables", "TanStack Table", "event and query tables"),
      LIB("Scroll", "Lenis", "smooth dense scrolling"),
    ],
  },
  "project-management": {
    ui: "shadcn/ui + Radix",
    icons: "lucide-react",
    animation: "Motion",
    graphics: "Procedural SVG",
    charts: "Recharts",
    deps: BASE_REACT_DEPS,
    libraries: [
      LIB("UI components", "shadcn/ui", "board + list workspace chrome"),
      LIB("Drag & drop", "dnd-kit", "kanban card movement"),
      LIB("Icons", "Lucide", "project chrome"),
      LIB("Rich text", "Tiptap", "task descriptions"),
      LIB("Charts", "Recharts", "burndown and velocity"),
    ],
  },
};

const DEFAULT_STACK: RegistryEntry = {
  ui: "Galaxy (uiverse.io) + Custom",
  icons: "lucide-react",
  animation: "CSS + Motion",
  graphics: "Procedural SVG & gradients",
  charts: "—",
  deps: BASE_REACT_DEPS,
  libraries: [
    GALAXY_LIB,
    LIB("Icons", "Lucide", "consistent 1.8px stroke icon set"),
    LIB("Motion", "CSS + Motion", "fast, purposeful, reduced-motion safe"),
  ],
};

/** Every curated stack's UI slot defaults to the Galaxy kit; the design
 *  system (Vercel DESIGN.md tokens) comes with it. Old hand-rolled
 *  "Custom components" entries are retired in favor of the kit. */
for (const entry of Object.values(STACKS)) {
  entry.ui = "Galaxy (uiverse.io) + Custom";
  entry.libraries = [
    GALAXY_LIB,
    ...entry.libraries.filter((l) => l.name !== "Galaxy (uiverse.io)" && l.name !== "Custom components"),
  ];
}
STACKS.landing!.ui = "Galaxy (uiverse.io)";
STACKS.portfolio!.ui = "Galaxy (uiverse.io)";

const NON_REACT_REGISTRY: Record<string, RegistryEntry> = {
  api: {
    ui: "—",
    icons: "—",
    animation: "—",
    graphics: "—",
    charts: "—",
    deps: ["express", "typescript", "tsx"],
    libraries: [LIB("Runtime", "Express", "typed HTTP service")],
  },
  cli: {
    ui: "—",
    icons: "—",
    animation: "—",
    graphics: "—",
    charts: "—",
    deps: ["typescript", "tsx"],
    libraries: [LIB("Runtime", "Node CLI", "zero-dep command surface")],
  },
  package: {
    ui: "—",
    icons: "—",
    animation: "—",
    graphics: "—",
    charts: "—",
    deps: ["typescript"],
    libraries: [LIB("Runtime", "TypeScript", "library authoring toolchain")],
  },
  extension: {
    ui: "Vanilla JS (MV3)",
    icons: "—",
    animation: "—",
    graphics: "—",
    charts: "—",
    deps: [],
    libraries: [LIB("Runtime", "Manifest V3", "browser extension surface")],
  },
};

const AI_STACK: RegistryEntry = {
  ui: "Galaxy (uiverse.io) + Custom",
  icons: "lucide-react",
  animation: "Motion",
  graphics: "Procedural SVG & gradients",
  charts: "—",
  deps: BASE_REACT_DEPS,
  libraries: [
    GALAXY_LIB,
    LIB("Icons", "Lucide", "assistant chrome"),
    LIB("Motion", "Motion (Framer)", "streaming bubbles, drawer transitions"),
    LIB("Rich text", "Tiptap", "prompt composition and results"),
    LIB("Drag & drop", "dnd-kit", "knowledge source reordering"),
  ],
};

const GAME_STACK: RegistryEntry = {
  ui: "Galaxy (uiverse.io) + Custom",
  icons: "lucide-react",
  animation: "Canvas + CSS",
  graphics: "Canvas renderer",
  charts: "—",
  deps: BASE_REACT_DEPS,
  libraries: [
    GALAXY_LIB,
    LIB("Animation", "Canvas + CSS", "frame loops and particle bursts"),
    LIB("Icons", "Lucide", "HUD marks"),
    LIB("3D", "Three.js", "3D stages when the game genre needs them"),
  ],
};

function computeStack(section: string, archetype: string): RegistryEntry {
  if (archetype === "ai-chatbot" || archetype === "rag") return AI_STACK;
  if (section === "games" || archetype === "arcade") return GAME_STACK;
  const curated = STACKS[archetype];
  if (curated) return curated;
  const bySection: Record<string, RegistryEntry> = {
    websites: STACKS.landing!,
    webapps: STACKS.dashboard!,
    ai: AI_STACK,
    mobile: {
      ui: "Galaxy (uiverse.io) + Custom",
      icons: "lucide-react",
      animation: "CSS + Motion",
      graphics: "Procedural SVG & gradients",
      charts: "—",
      deps: BASE_REACT_DEPS,
      libraries: [
        GALAXY_LIB,
        LIB("Icons", "Lucide", "mobile chrome"),
        LIB("Motion", "CSS + Motion", "fast native-feel transitions"),
        LIB("Carousels", "Embla", "feed carousels"),
      ],
    },
    developer: STACKS.documentation!,
  };
  return bySection[section] ?? DEFAULT_STACK;
}

export function registryFor(section: string, archetype: string): RegistryEntry {
  if (archetype === "api") return NON_REACT_REGISTRY.api!;
  if (archetype === "cli") return NON_REACT_REGISTRY.cli!;
  if (archetype === "package") return NON_REACT_REGISTRY.package!;
  if (archetype === "extension") return NON_REACT_REGISTRY.extension!;
  return computeStack(section, archetype);
}

/** Declared npm deps for the template's scaffold (nothing the code doesn't import). */
export function depsFor(section: string, archetype: string): string[] {
  return registryFor(section, archetype).deps;
}

/** Curated recommended libraries for the project — available to install when permitted. */
export function recommendedLibrariesFor(section: string, archetype: string): RecommendedLibrary[] {
  return registryFor(section, archetype).libraries;
}