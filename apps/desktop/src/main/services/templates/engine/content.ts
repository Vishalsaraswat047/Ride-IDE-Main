/**
 * RIDE Content Engine.
 *
 * Scaffold sources ship complete, category-specific copy — NEVER placeholders.
 * This module post-processes a generated scaffold and replaces every
 * "Replace with …" fragment with real, sequential, business-appropriate copy.
 *
 * Ops are keyed per family (or per fallback archetype). Each op replaces the
 * Nth occurrence of its pattern with the Nth value (last value repeats as a
 * safety net). Specific patterns MUST come before generic ones ("Replace with
 * a product" before "Replace" so tag fields still resolve).
 */

import type { ProductArchetypeArchitecture } from "./product-architecture";

export interface ContentOp {
  match: string | RegExp;
  values: string[];
}

const v = (...values: string[]): string[] => values;

/** nth-occurrence replacement (nth → values[n], clamped to the last value). */
function applyOp(text: string, op: ContentOp): string {
  const { values } = op;
  if (values.length === 0) return text;
  const last = values[values.length - 1]!;
  let out = "";
  let idx = 0;
  let n = 0;
  if (typeof op.match === "string") {
    const m = op.match;
    let i = text.indexOf(m, idx);
    while (i !== -1) {
      out += text.slice(idx, i) + (values[Math.min(n, values.length - 1)] ?? last);
      n += 1;
      idx = i + m.length;
      i = text.indexOf(m, idx);
    }
    return out + text.slice(idx);
  }
  const re = new RegExp(op.match.source, `${op.match.flags.includes("g") ? "" : "g"}${op.match.flags}`);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += text.slice(idx, m.index) + (values[Math.min(n, values.length - 1)] ?? last);
    n += 1;
    idx = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return out + text.slice(idx);
}

function applyOps(text: string, ops: ContentOp[]): string {
  for (const op of ops) text = applyOp(text, op);
  return text;
}

/* ─── Ops: websites ───────────────────────────────────────────────────────── */

const PORTFOLIO_OPS: ContentOp[] = [
  {
    match: "Replace with a project",
    values: v(
      "VLSI Scan-to-BOM — die photo analysis CLI",
      "Heron — hardware-in-the-loop emulation harness",
      "PulseWave — real-time signal viewer for FPGA bring-up",
    ),
  },
  {
    match: "Replace with a one-line description.",
    values: v(
      "Extracts a bill of materials from silicon die photos, cutting review time from days to minutes.",
      "Replays RTL simulations against real peripherals so firmware bugs surface before tape-out.",
      "Streams 60k samples/sec from an FPGA rig to an interactive WebSocket dashboard.",
    ),
  },
  {
    match: "Replace with employer",
    values: v("Meridian Semiconductor", "Northstar Embedded", "Orbit Systems"),
  },
  {
    match: "Replace with role",
    values: v("Staff VLSI Engineer — DFT & verification", "Senior Firmware Engineer", "ASIC Design Engineer"),
  },
  {
    match: "Your Name",
    values: v("Priya Nair"),
  },
  {
    match: "Replace with a two-sentence intro: what you build, who you build it for, and what makes your work distinctive.",
    values: v(
      "I design and verify silicon: scan chains, ATPG patterns, and the firmware that makes chips testable at scale. Over a decade shipped across automotive, networking, and AI accelerators.",
    ),
  },
  {
    match: "Replace with a caption",
    values: v("8nm test-chip floorplan under scan analysis"),
  },
  {
    match: "Replace with what you focus on: the problems you solve, the tools you reach for, and the work you're proud of.",
    values: v(
      "Test coverage is the difference between a chip that ships and a recall. I work at the intersection of DV, DFT, and embedded — building flows that find bugs when they're cheap to fix.",
    ),
  },
  {
    match: "Replace with your location",
    values: v("Bengaluru, India · open to relocation"),
  },
  {
    match: "you@example.com",
    values: v("priya@nair.design"),
  },
];

const AGENCY_OPS: ContentOp[] = [
  {
    match: "Replace with what this service covers.",
    values: v(
      "Positioning sprints, narrative systems, and naming that survive first contact with the market.",
      "End-to-end product design: research, systems, high-fidelity UI, and design ops for shipped teams.",
      "Full-funnel growth: paid, lifecycle, and landing-page experiments with measurable payback.",
    ),
  },
  {
    match: "Replace with client",
    values: v("Northbeam", "Quill & Co.", "Helios Labs", "Fjord Capital", "Atlas Retail", "Linework"),
  },
  {
    match: "Replace with the promise you make: who you help, the outcome you deliver, and why you're the team for it.",
    values: v(
      "We partner with companies between seed and scale to turn product strategy into launch-ready brands and websites that compound — measured in pipeline, not vanity metrics.",
    ),
  },
  {
    match: "Replace with the outcome for this client.",
    values: v(
      "Rebuilt positioning and site; demo requests grew 3.4× inside two quarters.",
      "Design system + product site shipped in 6 weeks; onboarding time dropped 40%.",
      "Lifecycle program lifted paid CAC payback from 9 months to 4.",
    ),
  },
  {
    match: "Replace with a client testimonial about the work and the outcome.",
    values: v(
      "The tightest senior team we've ever hired an agency for — they operate like product leads, not vendors. Pipeline is up 3× since launch.",
    ),
  },
];

const STARTUP_OPS: ContentOp[] = [
  {
    match: "Replace with a feature",
    values: v(
      "Autonomous AI workflows",
      "Real-time analytics",
      "One-click integrations",
      "Enterprise-grade security",
      "Team collaboration",
      "Usage-based billing",
    ),
  },
  {
    match: "Replace with the benefit for the user.",
    values: v(
      "Agents plan, execute, and self-heal multi-step processes while your team watches.",
      "Live dashboards turn usage signals into decisions before the quarter ends.",
      "Connect Stripe, Slack, and 60+ tools in one click — no engineering day.",
      "SOC 2 Type II, SSO, and regional data residency built in from day one.",
      "Shared workspaces with granular roles, approvals, and audit logs.",
      "Pay for what runs. Metered pricing with hard caps and alerts.",
    ),
  },
  {
    match: "Replace with what's included.",
    values: v(
      "Up to 3 workflows, community support, 7-day run history.",
      "Unlimited workflows, real-time analytics, priority support.",
      "SSO, audit logs, dedicated onboarding engineer, custom SLAs.",
    ),
  },
  {
    match: "Replace with the one-liner: the problem you solve, the audience, and the outcome.",
    values: v(
      "Operations teams lose weeks to spreadsheets and copy-paste. Build, automate, and scale your workflows with intelligent AI agents — from first run to full rollout in an afternoon.",
    ),
  },
  {
    match: "Replace with a user win",
    values: v("Finance ops cut monthly close from 9 days to 2"),
  },
  {
    match: "Replace with what early users get: launch access, founder support, special pricing.",
    values: v(
      "Founding members receive lifetime 40% pricing, a dedicated Slack channel with the founders, and access to every new agent the platform ships for the first year.",
    ),
  },
];

const BLOG_OPS: ContentOp[] = [
  {
    match: "Replace with a post title",
    values: v(
      "The case for boring infrastructure",
      "On-call, but make it humane",
      "Reading UNIX logs like a novel",
      "What 10,000 deploys taught us",
      "Observability is a product",
      "Plain-text tools still win",
    ),
  },
  {
    match: "Replace with a two-sentence summary.",
    values: v(
      "Why the teams we admire run PostgreSQL and cron instead of the newest queue.",
      "A playbook for alerting that your night shift will actually thank you for.",
      "Patterns in /var/log that predict the outage before the pager fires.",
      "Lessons from a year of daily deployments to a two-node fleet.",
      "Treating dashboards as an interface your colleagues live in.",
      "When markdown, grep, and a Makefile beat the licensed suite.",
    ),
  },
  {
    match: "Replace with a short pitch for subscribing — what arrives, how often, why it's worth it.",
    values: v(
      "One essay on infrastructure and craft, every other Tuesday. No ads, no sponsors, no noise — unsubscribe with one click.",
    ),
  },
  {
    match: "Replace with an about line.",
    values: v("essays on infrastructure, reliability, and the craft of systems"),
  },
];

const DOCUMENTATION_OPS: ContentOp[] = [
  {
    match: "Replace this page with real documentation: what the product does, who it is for, and how to get started in under five minutes.",
    values: v(
      "Rivet is a background job runner for TypeScript teams. It retries with backoff, visualizes every run, and speaks plain SQL — so you can ship a durable job pipeline without adopting a platform.",
    ),
  },
  {
    match: "Replace with the exact install steps, prerequisites, and any version notes.",
    values: v(
      "Requires Node 20+. Install with `npm i -D rivet` (or `pnpm add -D rivet`), then `npx rivet init`. That creates rivet.config.ts and a dev database. Start the dashboard with `npx rivet dev`.",
    ),
  },
  {
    match: "Replace with a link",
    values: v(
      "Getting started",
      "Scheduling jobs",
      "Workers & queues",
      "Error retry policy",
      "Monitoring runs",
      "Self-hosting",
    ),
  },
  {
    match: "What it is / where it goes.",
    values: v(
      "Install, first run, and your first scheduled job.",
      "Cron expressions, intervals, and one-off enqueues.",
      "Concurrency, rate limits, and graceful shutdown.",
      "Backoffs, dead-letter queues, and alerting.",
      "Dashboards, run history, and SQL views.",
      "Docker compose, Postgres, and scaling notes.",
    ),
  },
];

const PERSONAL_OPS: ContentOp[] = [
  {
    match: "Now: Replace with what you're up to",
    values: v("Now: bleeding hardware for the Lightweaver renderer"),
  },
  {
    match: "Replace with a short intro: who you are, the work you do, and one interesting thing about you.",
    values: v(
      "I'm Mara — a creative technologist building tools that make code feel physical. By day I prototype interactive installations; by night I'm wiring MIDI into everything.",
    ),
  },
  {
    match: "One of {links.length + 1} · Replace with what the number means to you",
    values: v(
      "One of {links.length + 1} · numbered by the order I'd like you to read them",
    ),
  },
  {
    match: `>Email</a>`,
    values: v(`>mara@now.land</a>`),
  },
  {
    match: "Replace with your current projects, habits, and the things you're exploring. This page is for people who want the latest version of you.",
    values: v(
      "Building a generative MIDI sequencer, reading everything on typography from the last decade, and slowly restoring a 1974 VW bus. This page is for people who want the latest version of me.",
    ),
  },
  {
    match: "Replace with current obsession",
    values: v("analog synth repair"),
  },
  { match: "you@example.com", values: v("mara@now.land") },
];

const RESTAURANT_OPS: ContentOp[] = [
  {
    match: "Replace with a dish",
    values: v(
      "Charred leek + hazelnut crostini",
      "Buckwheat sourdough, whipped lardo",
      "Pork belly skewers, pickled mustard",
      "Torched mackerel, fennel, citrus",
      "Wood-roasted duck, umeboshi glaze",
      "Spring garlic ravioli, brown butter",
      "Coal-grilled octopus, salsa verde",
      "Dry-aged ribeye, smoked bone marrow",
      "Burnt honey panna cotta",
      "Toasted milk ice cream, olive oil",
    ),
  },
  {
    match: "Replace with cuisine · City",
    values: v("Modern European · Lisbon"),
  },
  {
    match: "Replace with the story of the kitchen: the fires, the produce, the regulars.",
    values: v(
      "We cook over wood and charcoal on a twelve-seat counter, sourcing produce from three farms within 40km. The menu changes nightly — the fire decides.",
    ),
  },
  {
    match: "Replace with the address",
    values: v("Rua da Rosa 128, Lisboa"),
  },
  {
    match: "Replace with booking policy: party size, notice window, walk-ins.",
    values: v(
      "Full counter is bookable 30 days ahead; half is held for walk-ins to the nightly bar list. Parties up to 6 — larger groups should email us directly.",
    ),
  },
  {
    match: "Replace with hours, address, and social handles.",
    values: v("Tue–Sat 18:30–23:00 · Rua da Rosa 128, Lisboa · @orleanslisboa"),
  },
];

const HOTEL_OPS: ContentOp[] = [
  {
    match: "Replace with a room type",
    values: v(
      "Harbour Deluxe",
      "Atelier Suite",
      "Roof Garden Penthouse",
    ),
  },
  {
    match: "View, size, and what makes it special.",
    values: v(
      "38–42 m², full harbour view, walk-in rain shower, dedicated check-in desk.",
      "55 m² corner suite with original stone walls, freestanding bath, and a private balcony.",
      "92 m² penthouse with 120 m² terrace, private plunge pool, and butler service.",
    ),
  },
  {
    match: "Replace with amenity",
    values: v("High-speed fiber Wi-Fi", "Blackout & blackout-proof curtains", "Ortigia bath products", "24h concierge & airport transfers"),
  },
  {
    match: `Since MCMXX · Replace with city`,
    values: v(`Since MCMXX · Lisbon`),
  },
  {
    match: "Replace with the pitch: where you are, what the stay feels like, and who it's for.",
    values: v(
      "A former customs house overlooking the Tagus river, restored into a 46-room hotel where 1920s craft meets contemporary comfort — ten minutes from Alfama, five from the market.",
    ),
  },
  {
    match: "Replace with a seascape",
    values: v("dawn across the Tagus"),
  },
  {
    match: "Replace with check-in/check-out times, breakfast, and cancellation policy.",
    values: v(
      "Check-in 15:00, check-out 12:00. Breakfast is served 07:30–11:00 with a full larder menu. Cancel free until 48 hours before arrival.",
    ),
  },
  {
    match: "Replace with address, phone, and booking links.",
    values: v("Rua do Comércio 7, 1100-148 Lisboa · +351 21 000 1122 · stay@atlas-river.com"),
  },
];

const EVENT_OPS: ContentOp[] = [
  {
    match: "Replace with a session",
    values: v(
      "Keynote: Designing for a slower internet",
      "Workshop: From load event to interaction — the missed 800ms",
      "Talk: CSS grid you'll actually remember",
      "Panel: The economics of independent software",
    ),
  },
  {
    match: "Replace with a speaker",
    values: v("Anouk Fischer", "Marco Silva", "Iris Tanaka", "Dev + Kal"),
  },
  {
    match: "Replace with date · City",
    values: v("21 May 2026 · Porto"),
  },
  {
    match: "Replace with what attendees get: the theme, the crowd, the one thing they'll leave with.",
    values: v(
      "Two stages, 40 speakers, and a courtyard that runs on cordials. You'll leave with working notes, a handful of real contacts, and at least one idea you'll ship the following Monday.",
    ),
  },
  {
    match: "Replace with the venue name, address, and travel tips.",
    values: v(
      "Armazém do Café, Rua do Comércio 144, Porto. 10 minutes from São Bento by foot; the 900 and 906 buses stop on the corner.",
    ),
  },
  {
    match: "Replace with what's included",
    values: v(
      "Both days, all talks, lunch & coffee.",
      "Everything in Standard plus the workshop and merch.",
    ),
  },
  {
    match: "Replace with contact, code of conduct, and hashtag.",
    values: v("hello@rendezvous-js.dev · #RendezvousJS · code of conduct enforced by staff"),
  },
];

const EDUCATION_OPS: ContentOp[] = [
  {
    match: "Replace with a program",
    values: v(
      "Computer Science",
      "Interaction Design",
      "Data Science",
      "Robotics & AI",
      "Product Management",
      "Sustainable Systems",
    ),
  },
  {
    match: "Replace with what students learn.",
    values: v(
      "Systems, compilers, and how to ship software that lasts.",
      "Research, prototyping, and design-of-everyday-things fluency.",
      "Statistics, modelling, and honest communication of uncertainty.",
      "Perception, planning, and hardware/software co-design.",
      "Discovery, strategy, and running teams that ship.",
      "Circular economies, embedded sensing, and lifecycle thinking.",
    ),
  },
  {
    match: "Replace with the school's promise: what students become, how they get there, and why this place fits.",
    values: v(
      "We teach people to build things that matter. Project-based semesters, mentors from 40+ companies, and a capstone that goes to market — 96% of our graduates are placed within six months.",
    ),
  },
  {
    match: `t: "Replace with a stat"`,
    values: v("2,400", "94%", "12:1"),
  },
  {
    match: `label: "Replace with a stat"`,
    values: v(
      "92% placed within 6 months",
      "€1.2M scholarships awarded",
      "40+ industry mentors",
      "12:1 student-to-mentor ratio",
    ),
  },
  {
    match: "Replace with meaning",
    values: v(
      "of graduates placed within six months",
      "in need-blind scholarships each year",
      "mentors across 40+ companies",
      "students per mentor cohort",
    ),
  },
  {
    match: "Replace with the process: deadlines, requirements, scholarships.",
    values: v(
      "Applications open 1 September and close 15 January. One portfolio or transcript, one essay, one interview. Need-blind admissions with full scholarships for a third of each cohort.",
    ),
  },
  {
    match: "Replace with address, hours, and contact details.",
    values: v("Campus de Lumiar, Av. do Atlântico 300, Lisboa · Mon–Fri 09:00–17:00 · admissions@meridian.edu"),
  },
];

const HEALTHCARE_OPS: ContentOp[] = [
  {
    match: "Replace with a service",
    values: v("Primary care", "Cardiology", "Women's health", "Preventive programs"),
  },
  {
    match: "Replace with what it covers.",
    values: v(
      "Same-week appointments, annual check-ups, and chronic-condition follow-ups with your named GP.",
      "Echo, stress testing, and 24h Holter monitoring — read by specialists within 48 hours.",
      "Maternity, fertility, and menopause care with the same midwife throughout.",
      "Nutrition, sleep, and screening programs tailored to your history and goals.",
    ),
  },
  {
    match: "Replace with the practice's focus: who's cared for, how, and what a first visit looks like.",
    values: v(
      "We're a six-GP practice serving individuals and families across the north of the city. Your first visit includes a 40-minute consultation, a health screen, and a plan you can actually follow.",
    ),
  },
  {
    match: "Today · Replace with available times",
    values: v("Today · 10:20, 11:40, 15:10"),
  },
  {
    match: "Replace with a name",
    values: v("Dr. Ana Loureiro", "Dr. Kenji Ramos", "Dr. Sofia Aldeia"),
  },
  {
    match: "Replace with specialty",
    values: v("Family medicine · 12 yrs", "Internal medicine · 9 yrs", "Pediatrics · 15 yrs"),
  },
  {
    match: "Replace with how to book: phone, portal, or walk-in hours.",
    values: v(
      "Book through the portal, by phone, or walk in — urgent slots are held between 08:30 and 10:00 every weekday.",
    ),
  },
  { match: "Replace with provider", values: v("Dr. Ana Loureiro") },
  {
    match: "Replace with hours, address, and insurance information.",
    values: v("Mon–Fri 08:30–19:00 · Av. da República 41 · accepts all major insurers — bring your card to reception."),
  },
];

const REAL_ESTATE_OPS: ContentOp[] = [
  {
    match: "Replace with a listing",
    values: v(
      "Rua das Flores 12 — 2-bed apartment",
      "Avenida da Liberdade 88 — split-level loft",
      "Bairro Alto T1 with rooftop terrace",
      "Alfama townhouse with courtyard",
      "Estoril seafront 3-bed villa",
      "Campo de Ourique duplex with garage",
    ),
  },
  {
    match: "Neighborhood, size, standout features.",
    values: v(
      "Chiado · 78 m² · original azulejos, lift, river light.",
      "Centro · 124 m² · mid-century renovation, exposed stone.",
      "Bairro Alto · 54 m² · new kitchen, shared rooftop.",
      "Alfama · 118 m² · courtyard garden, GR II listing.",
      "Estoril · 210 m² · direct beach access, garage for 3.",
      "Campo de Ourique · 96 m² · fruit trees, 2-car basement.",
    ),
  },
  {
    match: "Replace with your market · Est. year",
    values: v("Lisbon & the Coast · Est. 2004"),
  },
  {
    match: "Replace with the market you cover and the promise you make to buyers and sellers.",
    values: v(
      "We cover Lisbon, Cascais, and the silver coast — 1,200 homes sold since 2004. Every listing is photographed, legal-cleared, and marketed in four languages before it goes live.",
    ),
  },
  {
    match: `v: "Replace with a stat"`,
    values: v("1,200", "18 days"),
  },
  {
    match: "Replace with an area",
    values: v("Lisbon, Cascais, Ericeira + coast"),
  },
  {
    match: "Replace with street + price",
    values: v("Rua das Flores · €575,000", "Av. da Liberdade · €890,000", "Travessa do Comércio · open 10–12 Sat"),
  },
  {
    match: "Replace with street + time",
    values: v("Rua da Rosa · Sat 10:00–12:00"),
  },
  {
    match: "Replace with specialty",
    values: v("Residential sales · 11 yrs", "Luxury & off-market · 8 yrs", "New-build & off-plan · 6 yrs"),
  },
  {
    match: "Replace with office address, phone, and listing portal links.",
    values: v("Av. Eng. Duarte Pacheco 21, Lisboa · +351 21 000 4455 · hello@pocaluz.pt"),
  },
];

const FINANCE_OPS: ContentOp[] = [
  {
    match: "Replace with an account",
    values: v("Everyday Spending", "High-Yield Savings", "Travel Card"),
  },
  {
    match: "Replace with a note",
    values: v(
      "Salary account with instant transfers and no monthly fee.",
      "4.2% AER, paid monthly, no notice period.",
      "No FX fees, lounge access, and free overdraft up to €1,000.",
    ),
  },
  {
    match: "Replace with a product",
    values: v("Flexible Loan", "Home Equity Line", "Smart Deposit"),
  },
  {
    match: "Replace with a %",
    values: v("9.9% APR", "4.0% variable", "4.6% fixed 12m"),
  },
  {
    match: "FDIC insured · Replace with regulator",
    values: v("FDIC insured · supervised by the ECB and Banco de Portugal"),
  },
  {
    match: "Replace with the pitch: who the bank serves, the products that matter, and why it's a better home for money.",
    values: v(
      "Calma is a digital bank for people who want their money working — 89,000 customers, no branches, and products designed around real behaviour instead of a legacy fee sheet.",
    ),
  },
  {
    match: "Replace with a growth chart label",
    values: v("DEPOSITS, €M · 2021–2026"),
  },
  {
    match: "Replace with the application steps and requirements.",
    values: v(
      "Open an account online in under 10 minutes — ID, address, and a selfie. Loans need 3 months of statements; most decisions land within 24 hours.",
    ),
  },
  {
    match: "Replace with legal name, routing number, and support contact.",
    values: v("Calma Bank SA · IBAN PT50 0010 0000 1234 5678 9012 · support@calma.bank"),
  },
];

const SAAS_OPS: ContentOp[] = [
  {
    match: "Replace with a module",
    values: v("Pipeline & forecasts", "Customer workspaces", "Executive analytics"),
  },
  {
    match: "Replace with what it helps teams do.",
    values: v(
      "Every deal, stage change, and follow-up in one live view — with forecasts that survive board week.",
      "Shared deals, tasks, and notes with granular roles for your whole revenue org.",
      "Board-ready views of conversion, velocity, and coverage without a data team.",
    ),
  },
  {
    match: "Replace with the value proposition: the workflow you replace, the outcome teams measure.",
    values: v(
      "Spreadsheet CRM eats selling time. Meridian gives revenue teams a pipeline they trust, reports they don't rebuild, and automation that books the next meeting for them.",
    ),
  },
  {
    match: "Replace with a feature",
    values: v("AI pipeline forecasting", "Custom roles & approval flows"),
  },
  {
    match: "Replace with what's included",
    values: v(
      "3 seats, core modules, community support.",
      "10 seats, all modules, priority support.",
      "Unlimited seats, SSO, audit logs, success manager.",
    ),
  },
];

const CRM_OPS: ContentOp[] = [
  {
    match: "Replace with a deal",
    values: v(
      "Acme — annual plan",
      "Nova — expansion",
      "Helios — pilot",
      "Orbit — renewal",
      "Fjord — enterprise",
      "Atlas — upsell",
      "Linework — new logo",
      "Bench — partnership",
    ),
  },
  {
    match: "Replace with the current quarter summary",
    values: v("Q3 running at 108% of target — 6 deals in review, 2 approvals pending"),
  },
  {
    match: "Replace with contact",
    values: v("ana@verde.io · +351 912 000 113"),
  },
];

const ERP_OPS: ContentOp[] = [
  {
    match: "Replace with a stat",
    values: v("312", "87%", "4.2 days", "2,940"),
  },
  {
    match: "Replace with an item",
    values: v(
      "Torque wrench 19-1/2in",
      "Stainless ball valves DN50",
      "PVC conduit 25mm ×100m",
      "Copper cable 4mm² (roll)",
      "Thread tape 12mm (case)",
    ),
  },
  {
    match: "Replace with a supplier",
    values: v("Ferrum B.V.", "Válvulas Ibérica", "PolyPlay S.A.", "Cabo Norte", "Hidra-Tec"),
  },
  {
    match: "Replace with a low-stock item",
    values: v("Torque wrench 19-1/2in", "PolyPlay HDPE couplers", "Cable glands IP68", "Zinc galvanized brackets"),
  },
];

const ADMIN_PANEL_OPS: ContentOp[] = [
  {
    match: "Replace with a name",
    values: v("Marta Reis", "Joel Lindqvist", "Priya Shetty", "Tomás Almeida", "Yuki Sato"),
  },
  {
    match: "Replace with an email",
    values: v("marta.reis@northgrid.io", "joel@lindqvist.dev", "priya.shetty@northgrid.io", "t.almeida@northgrid.io", "yuki@northgrid.io"),
  },
  {
    match: "Replace with the current plan / usage summary",
    values: v("Scale plan · 412 of 500 seats used · renewal in 34 days"),
  },
  {
    match: "Replace with a stat",
    values: v("412", "6", "99.98%"),
  },
];

const ANALYTICS_OPS: ContentOp[] = [
  {
    match: "Replace with a metric",
    values: v("Active users", "Sessions", "Churn", "NPS"),
  },
  {
    match: "Replace with a row",
    values: v("Direct", "Organic", "Paid", "Referral"),
  },
  {
    match: "Replace with a chart title",
    values: v("ACQUISITION BY CHANNEL · LAST 90 DAYS"),
  },
  {
    match: "Replace with a breakdown title",
    values: v("Revenue by plan, current quarter"),
  },
];

const PROJECT_MANAGEMENT_OPS: ContentOp[] = [
  {
    match: "Replace with a task",
    values: v(
      "Design system tokens v2",
      "Migrate checkout to new API",
      "QA review — release candidate",
      "Write migration guide",
      "Update onboarding flow",
      "Fix 403 on team invites",
      "Load-test k8s autoscaler",
      "Collect beta feedback",
    ),
  },
  {
    match: "Replace with a project name",
    values: v("Atlas — Q3 platform refresh"),
  },
  {
    match: "Replace with a due date",
    values: v("Due Fri, 22 Aug"),
  },
  {
    match: "Replace with a milestone",
    values: v("Beta launch · 15 Sep"),
  },
  {
    match: "Replace with assignee",
    values: v("Marta · 4 of 8 tasks"),
  },
];

const ECOMMERCE_OPS: ContentOp[] = [
  {
    match: "Replace with a product",
    values: v(
      "Merino crewneck — oyster",
      "Selvedge denim jacket",
      "Linen camp shirt — sand",
      "Everyday carry tote",
      "Cashmere beanie",
      "Leather belt — tan",
      "Wool overshirt — slate",
      "Rain shell 2.0",
    ),
  },
  {
    match: "Replace",
    values: v("Bestseller", "New", "Sale", "Restocked", "Limited", "Core", "New", "Lab"),
  },
  {
    match: "Replace with the promise: what you sell, how it's made or sourced, and who it's for.",
    values: v(
      "Clothing built to be repaired, not replaced — cut in-house, sewn in two family-run factories in Porto, and shipped plastic-free since 2019.",
    ),
  },
  {
    match: "Replace with a count",
    values: v("48 pieces"),
  },
  {
    match: "Replace with the story behind the store: sourcing, values, shipping promises.",
    values: v(
      "Northwind started with a single overlocked seamstress and a garage of deadstock wool. Every piece now carries a repair guarantee and a QR code to its maker.",
    ),
  },
  {
    match: "Replace with shipping, returns, and contact links.",
    values: v("Free EU shipping over €75 · 30-day returns · repairs@northwind.shop"),
  },
];

const MARKETPLACE_OPS: ContentOp[] = [
  {
    match: "Replace with a listing",
    values: v(
      "1962 Mercedes 190SL — fully restored",
      "Pair of Garrard 401 turntables, serviced",
      "Eames lounge chair, rosewood, 1969",
      "Leica M3 with Summicron 50mm",
      "Mitsubishi Lancer Evo VI, UK import",
      "Set of 4 Danish teak chairs",
    ),
  },
  {
    match: "Replace with a short description.",
    values: v(
      "Concours-level restoration, 41k miles, all receipts.",
      "Rebuilt suspension and new cartridges, one owner since 2011.",
      "Original hides, new cushions, certificates included.",
      "Fully serviced in 2025, perfect glass and mechanics.",
      "Stroked engine, fresh MOT, long MOT on the chassis.",
      "Refinished once, no repairs to veneer, solid joinery.",
    ),
  },
  {
    match: "Replace with the market you serve: who buys, who sells, and how trust is built here.",
    values: v(
      "Heritage Goods is a moderated marketplace for collectors: every listing is photo-verified, payments are escrowed, and both parties are rated after every deal.",
    ),
  },
  {
    match: "Replace with the listing fees, review process, and safety tips.",
    values: v(
      "Listing is free — we take 5% at sale, capped at €250. New sellers are reviewed within 24h; always meet in person or use our escrow shipping.",
    ),
  },
  {
    match: "Replace with trust and safety, support, and seller resources.",
    values: v("verified badges, escrow payments, buyer protection, and a resolution team that answers in under 6 hours"),
  },
];

const SOCIAL_NETWORK_OPS: ContentOp[] = [
  {
    match: "Replace with a name",
    values: v("Camila Rocha", "Ben Alvarez", "Sofia Lind"),
  },
  {
    match: "@handle",
    values: v("@camilarocha", "@bena", "@sofiny"),
  },
  {
    match: "Replace with a post: what people share in this community.",
    values: v(
      "Just finished a 9-month rebuild of a 1982 Land Rover with my dad. It drives. I said I'd take him to the sea — Saturday.",
      "Designers: what's the one tool you'd protect from budget cuts? For me it's our shared icon library.",
      "New espresso setup at the studio. Three beans, one grinder, zero meetings scheduled. Today is already won.",
    ),
  },
  {
    match: "· Replace with a time",
    values: v("· 12m", "· 3h", "· Yesterday"),
  },
  {
    match: "Replace with community guidelines and moderation notes.",
    values: v("Be kind, credit your sources, and keep politics in the dedicated space. We moderate 24/7 and ban bots on sight."),
  },
];

const LEARNING_PLATFORM_OPS: ContentOp[] = [
  {
    match: "Replace with a course",
    values: v("Acoustic guitar — foundations", "Music theory without tears", "Home recording 101"),
  },
  {
    match: "Replace with a personal progress summary.",
    values: v("Three of five goals on track — a 14-day streak and 32 exercises behind you this month."),
  },
  {
    match: "Replace with the current lesson",
    values: v("Tuning, posture & first chord"),
  },
  {
    match: "Replace with the course name",
    values: v("Acoustic guitar — foundations"),
  },
  {
    match: "Replace with a goal (e.g. 'Ship a project with X')",
    values: v("Play three songs by heart"),
  },
  {
    match: "Replace with a goal",
    values: v("Master barre chords", "Record my first demo"),
  },
];

const AI_CHATBOT_OPS: ContentOp[] = [
  {
    match: "Replace with a welcome message describing what this assistant can help with.",
    values: v(
      "Hi — I'm Athene. I can draft replies, summarize threads, translate between ES/EN/PT, and set meeting notes straight into your inbox. What are we tackling?",
    ),
  },
  {
    match: "Replace with a sample question a user might ask.",
    values: v("Summarize this week's customer complaints"),
  },
  {
    match: "Replace with a strong answer: specific, helpful, and structured.",
    values: v(
      "Top 3 themes this week: (1) checkout errors on iOS — 14 tickets, fix shipped Friday; (2) refund timing — now under 48h; (3) requests for Klarna. Full breakdown with counts is ready to export.",
    ),
  },
  {
    match: "Replace with a prompt",
    values: v("Summarize a thread", "Draft a reply", "Translate to Portuguese"),
  },
  {
    match: "Replace with the model name / status",
    values: v("athene-2 · connected · 140ms"),
  },
];

const RAG_OPS: ContentOp[] = [
  {
    match: "Replace with a document name",
    values: v("Q3-Q4 roadmap v14.pdf", "API reference — webhooks.md", "Support handbook 2026.docx"),
  },
  {
    match: "Replace with a summary",
    values: v(
      "27 pages — decision log, dates for GA, and the deprecation window for v2 endpoints.",
      "12 pages — webhook payloads, retries, and signature verification.",
      "48 pages — SLAs, escalation paths, and the refund matrix.",
    ),
  },
  {
    match: "Replace with what can be uploaded (formats, sizes) and what the knowledge base should contain.",
    values: v(
      "Upload PDF, DOCX, MD, and TXT up to 50MB each. The knowledge base indexes them nightly and answers only from the sources you've approved.",
    ),
  },
  {
    match: "e.g. Replace with a question",
    values: v("e.g. When does the v2 API deprecate?"),
  },
  {
    match: "Replace with the source docs, timestamps, and citation behavior.",
    values: v(
      "Answers cite the exact page and line, dated at index time — retracted docs are excluded from new answers within one refresh cycle.",
    ),
  },
];

const AI_AGENT_OPS: ContentOp[] = [
  {
    match: "Replace with a task",
    values: v(
      "Triage nightly error reports",
      "Sync roadmap with CRM",
      "Draft release notes",
      "Summarize design review",
    ),
  },
  {
    match: "Replace with a stat",
    values: v("18 runs/day", "0.4% error rate", "2h saved / run"),
  },
  {
    match: "1. Replace with a typical task it should take on",
    values: v("1. Reconcile weekly invoices against the ledger"),
  },
  {
    match: "2. Replace with the tools or data it has access to",
    values: v("2. Read-only access to the ledger, inbox, and Slack approvals"),
  },
  {
    match: "3. Replace with a run's expected output",
    values: v("3. A signed reconciliation summary with every mismatch flagged"),
  },
];

const AI_SAAS_OPS: ContentOp[] = [
  {
    match: "Replace with a use case",
    values: v(
      "Invoice reconciliation",
      "Onboarding assistants",
      "Contract clauses review",
      "Support triage",
      "Regulatory monitoring",
      "Data migration checks",
    ),
  },
  {
    match: "Replace with who it's for and what it automates.",
    values: v(
      "Finance teams — matches payables to POs and flags exceptions in minutes.",
      "People teams — a checklist agent that never forgets a step.",
      "Legal — risk-spots clauses against your playbook before they're signed.",
      "Support — classifies, drafts, and routes before a human touches it.",
      "Compliance — watches filings and surfaces changes that matter.",
      "Engineering — validates transforms against the target schema at scale.",
    ),
  },
  {
    match: "Replace with what the AI does better",
    values: v("Reconciles in hours what a team spent a week on"),
  },
  {
    match: "Replace with the outcome: what teams stop doing and what they start doing instead.",
    values: v(
      "Teams stop copying data between systems. They start reviewing AI-completed work — exceptions, edge cases, and strategic calls — instead of doing the matching themselves.",
    ),
  },
  {
    match: "Replace with what's included",
    values: v(
      "2 agents, 1k automated steps/mo, community support.",
      "10 agents, 50k steps/mo, human-in-the-loop approval flows.",
      "Unlimited agents, SSO, audit logs, dedicated success lead.",
    ),
  },
  {
    match: "Replace with what early customers receive and when access opens.",
    values: v(
      "Early customers get agents for free until GA, a direct line to the founding team, and first pick of new capabilities as they land quarterly.",
    ),
  },
  {
    match: "Replace with trust notes: data handling, model choices, security.",
    values: v(
      "Your data trains nothing. All processing is EU-region, credentials vaulted, and every agent step is auditable in a replayable log.",
    ),
  },
];

const DOCUMENT_ANALYZER_OPS: ContentOp[] = [
  {
    match: "Replace with supported formats, size limits, and what the analysis returns.",
    values: v(
      "Accepts PDF, DOCX, and scanned images up to 100MB; returns a summary, entity list, risk flags, and a source-linked evidence trail in minutes.",
    ),
  },
  {
    match: "Replace with an insight",
    values: v("Two conflicting effective dates found in clause 4.2"),
  },
  {
    match: "Replace with the kind of finding highlighted.",
    values: v("Dates stated as 1 March and 1 May for the same obligation — flagged for review."),
  },
  {
    match: "Replace with a next step",
    values: v("Request the consolidated version from the counterpart"),
  },
  {
    match: "Replace with the actions suggested.",
    values: v("Attach both scans and a modified-clause proposal to a tracked task."),
  },
  {
    match: "Replace with an export",
    values: v("Full report (PDF + CSV)"),
  },
  {
    match: "Replace with the output formats offered.",
    values: v("Summary deck, structured data, and source-linked excerpts."),
  },
];

const AI_CUSTOMER_SUPPORT_OPS: ContentOp[] = [
  {
    match: "Replace with a ticket subject",
    values: v(
      "Double charge on invoice #2041",
      "Export stuck at 96%",
      "Cannot re-add team seat",
      "Webhook signature mismatch",
      "Refund status from last week",
    ),
  },
  {
    match: "AI drafts · Replace with a stat",
    values: v("AI drafts · 72% auto-resolved"),
  },
  {
    match: "Replace with a stat",
    values: v("4.8 / 5", "1.2m", "38s"),
  },
  {
    match: "Replace with what triggers an AI draft",
    values: v("Known error codes and billing disputes within confidence thresholds"),
  },
  {
    match: "Replace with who reviews before it ships",
    values: v("A human agent approves every draft before sending"),
  },
  {
    match: "Replace with the escalation path",
    values: v("Off-threshold drafts route instantly to tier 2 with full context"),
  },
];

const AI_SEARCH_OPS: ContentOp[] = [
  {
    match: "Replace with a result",
    values: v(
      "Postgres 17 release notes — what operators care about",
      "CDC with logical replication — a practical guide",
      "PostgreSQL vs. managed alternatives, 2026 benchmarks",
      "Our stacking of pgBouncer + PgBouncer config HOWTO",
    ),
  },
  {
    match: "Replace with a source domain",
    values: v("postgresql.org", "crunchydata.com", "benchdb.io", "docs.ourcompany.dev"),
  },
  {
    match: "Replace with a one-line explanation of why it answers the query.",
    values: v(
      "Official changelog structured by major and minor versions.",
      "Covers replication slots, conflicts, and failover behavior.",
      "Compares TPS, latency, and cost across managed tiers.",
      "Internal guide with the exact config we run in production.",
    ),
  },
  {
    match: "Replace with a search query…",
    values: v("What changed in Postgres 17 replication?"),
  },
  {
    match: "Replace with a short synthesized answer citing the sources below. Keep it specific and up to date.",
    values: v(
      "Postgres 17 adds faster streaming of large transactions and a built-in slot sync improvement. On logical replication, key changes land in the two sources below; our production guide applies them against our stack.",
    ),
  },
  {
    match: "Replace with coverage notes: date ranges, languages, domains.",
    values: v("Indexes docs updated after 2024-01, in EN/DE, across postgres.org, vendor docs, and our internal runbooks."),
  },
];

/* ─── Ops: mobile ─────────────────────────────────────────────────────────── */

const MOBILE_SOCIAL_OPS: ContentOp[] = [
  {
    match: "Replace with a name",
    values: v("Ravi K.", "Lena M."),
  },
  {
    match: "Replace with what people share here.",
    values: v(
      "Biked 14km at dawn — the city is completely different before the traffic.",
      "Found a coffee shop that roasts in-house. Map pin dropped, you're welcome.",
    ),
  },
  {
    match: "· Replace with a time",
    values: v("· 2m", "· 1h"),
  },
];

const MOBILE_FITNESS_OPS: ContentOp[] = [
  {
    match: "Replace with a daily message or streak",
    values: v("21-day streak — consistency beats intensity"),
  },
  {
    match: "Replace with the daily goal",
    values: v("Goal: 8,000 steps"),
  },
  {
    match: "Replace with a workout",
    values: v("Morning mobility 15m", "Run — interval 30m", "Full-body strength 45m"),
  },
  {
    match: "Replace with duration · energy",
    values: v("15 min · light", "30 min · 420 kcal", "45 min · 560 kcal"),
  },
];

const MOBILE_FINANCE_OPS: ContentOp[] = [
  {
    match: "Replace with a merchant",
    values: v("Mercado da Ribeira", "Metro — recharge", "Café Central"),
  },
  {
    match: "Replace with a label",
    values: v("Salary — Nimbus Ltd"),
  },
  {
    match: "Replace with an account",
    values: v("Everyday"),
  },
  {
    match: "+ Replace with a delta this month",
    values: v("+ €214 saved this month"),
  },
  {
    match: "Replace with a category",
    values: v("Groceries", "Transport"),
  },
];

const MOBILE_ECOMMERCE_OPS: ContentOp[] = [
  {
    match: "Replace with a product",
    values: v("Espresso blend — Onda", "Gooseneck kettle", "Pour-over dripper v2", "Ceramic mug duo"),
  },
  {
    match: "Replace with a seasonal headline",
    values: v("Autumn roast is here"),
  },
  {
    match: "Replace with the offer or drop date",
    values: v("Roasted this week · drops 1 Oct, 9:00"),
  },
];

const MOBILE_PRODUCTIVITY_OPS: ContentOp[] = [
  {
    match: "Replace with a task",
    values: v("Review Q3 priorities", "Book dentist", "Pay invoice #482", "Pack for Porto trip", "Ship newsletter draft"),
  },
  {
    match: "Replace with a count of tasks left",
    values: v("3 left today"),
  },
  {
    match: "Replace with a breakdown",
    values: v("Work 5 · Personal 3 · Errands 2"),
  },
];

const MOBILE_EDUCATION_OPS: ContentOp[] = [
  {
    match: "Replace with a lesson",
    values: v("Introductions & small talk", "Ordering at a café", "Directions & transport"),
  },
  {
    match: "Replace with a personal milestone",
    values: v("Day 12 — keep the streak alive"),
  },
  {
    match: "Replace with a course",
    values: v("Portuguese A1 — Daily life"),
  },
  {
    match: "Replace with a stat (e.g. day streak)",
    values: v("12-day streak"),
  },
];

/* ─── Ops: developer, desktop, media ──────────────────────────────────────── */

const DEV_TOOLS_OPS: ContentOp[] = [
  {
    match: "Replace with a snippet",
    values: v("healthcheck stack", "deploy script", "card hover"),
  },
  {
    match: "// replace me",
    values: v("// checks the /healthz endpoint", "// pushes the tag to prod", "// subtle lift on hover"),
  },
  {
    match: "Replace with a run target",
    values: v("verify"),
  },
  {
    match: "replace with sample output\\n✓ done in 0.00s",
    values: v("$> verify\\n✓ 3 checks passed in 1.42s"),
  },
];

const DESKTOP_PRODUCTIVITY_OPS: ContentOp[] = [
  {
    match: "Replace with a note title",
    values: v("Standup notes — 12 Aug", "Meeting follow-ups", "Ideas: Q4 experiments"),
  },
  {
    match: "Replace with the first line of the note.",
    values: v("Deploy went clean; flag the auth timing issue with the team.", "Owner: Marta — pricing page copy due before Friday.", "Taxonomy v2 pairing well with the analytics work."),
  },
  {
    match: "Replace with a date",
    values: v("12 Aug"),
  },
  {
    match: "Replace with a to-do",
    values: v("Reply to Ana about the API cutover", "Renew calibre library card", "Block time for the review doc"),
  },
  {
    match: "Replace with a workspace",
    values: v("RIDE — inner loop"),
  },
];

const MEDIA_OPS: ContentOp[] = [
  {
    match: "Replace with a track",
    values: v("Northern Lights Call", "Analog Dreams II", "Paper Moon", "Low Tide / High Rise"),
  },
  {
    match: "Replace with an artist",
    values: v("Field Lines", "Mariana Flores", "The Slow Coast", "kvetch"),
  },
  {
    match: "Replace with the current album / playlist",
    values: v("Field Notes — recorded live, June 2026"),
  },
  {
    match: "Replace with the artist",
    values: v("Field Lines"),
  },
  {
    match: "Replace with duration",
    values: v("52 min"),
  },
];

const FILE_MANAGER_OPS: ContentOp[] = [
  {
    match: "Replace with a folder",
    values: v("Projects", "Archive", "Scans"),
  },
  {
    match: "Replace with a query",
    values: v("invoices 2026"),
  },
  {
    match: "Replace with a drive",
    values: v("Macintosh HD · 214 GB free of 512 GB"),
  },
  {
    match: "Replace with a count of items",
    values: v("142 items · 2.1 GB"),
  },
];

const BUSINESS_SOFTWARE_OPS: ContentOp[] = [
  {
    match: "Replace with a KPI",
    values: v("Revenue (MTD)", "Cash on hand", "Expenses (MTD)", "Forecast to plan"),
  },
  {
    match: "Replace with a client",
    values: v("Aurora Bikes", "Porto Print SA", "Café Bernardo Lda", "Helios & Co.", "Trilho Tiles"),
  },
  {
    match: "Replace with a date",
    values: v("12 Aug", "28 Jul", "3 Aug", "1 Aug", "19 Jul"),
  },
];

/* ─── Ops: games ──────────────────────────────────────────────────────────── */

const GAME_PUZZLE_OPS: ContentOp[] = [
  { match: "Replace with instructions", values: v("Match the pairs — flip two cards to reveal them") },
  { match: "You win — replace the win message", values: v("You win! Grid cleared in record time") },
];

const GAME_ARCADE_OPS: ContentOp[] = [
  {
    match: "Replace with instructions, difficulty options, and any power-ups.",
    values: v("Three difficulty levels, frenzy mode after 40 points, and a shield power-up every 25 combos."),
  },
];

const GAME_MULTIPLAYER_OPS: ContentOp[] = [
  {
    match: "Replace with rules, best-of rounds, and who goes first.",
    values: v("Best of 3 rounds. Players alternate who serves; first to 11 wins a round, must lead by 2. Swap sides after each round."),
  },
];

const GAME_2D_OPS: ContentOp[] = [
  {
    match: "Replace with level pacing, power-ups, and difficulty settings.",
    values: v("Levels ramp every 8 obstacles, double-point stars on even levels, and an easy mode that halves scroll speed."),
  },
];

const GAME_3D_OPS: ContentOp[] = [
  {
    match: "replace with the challenge description.",
    values: v("Find the face whose pattern matches the target, then rotate the cube to front it"),
  },
  {
    match: "Replace with the goal of the rotation puzzle and any win condition.",
    values: v("Bring every cube face into alignment with its target within 60 seconds; a solved face locks with a chime."),
  },
];

/* ─── Ops: fallback archetype apps (APP_SOURCES) ──────────────────────────── */

const PORTFOLIO_FALLBACK_OPS: ContentOp[] = [
  { match: "Placeholder project one", values: v("Pulse — open-source monitoring agent") },
  { match: "Placeholder project two", values: v("Rivet — dead-simple job runner") },
  { match: "Placeholder project three", values: v("Loom — collaborative markdown maps") },
  {
    match: "Replace this with a real project description and outcome.",
    values: v(
      "A 2kB agent that reports latency, errors, and deploys from any Node service — powering dashboards for 40+ teams.",
      "Durable queues with SQLite backends; 12k downloads since launch.",
      "Live mind-map editor that renders in the browser; shipped with offline mode.",
    ),
  },
  { match: "Senior placeholder", values: v("Senior Platform Engineer") },
  { match: "Mid-level placeholder", values: v("Backend Engineer") },
  { match: "Company A", values: v("Helios Cloud") },
  { match: "Company B", values: v("Northern Lines") },
  { match: "Your Name", values: v("Priya Nair") },
  {
    match: "Replace with real responsibilities and impact.",
    values: v(
      "Led the observability migration — cut p95 page load latency 31% and halved alert noise.",
      "Owned the billing pipeline; processed €14M/year at 99.99% uptime.",
    ),
  },
  {
    match: "Short tagline describing what you do and what you care about building.",
    values: v("Systems that keep their promises — observability, reliability, and software that respects its operators."),
  },
  {
    match: "Replace this paragraph with a real introduction: your background, what you work on, and what you enjoy.",
    values: v(
      "I've spent the last decade building infrastructure for products used by millions — from low-latency payment pipes to observability platforms. When I'm not on call, I'm restoring a 1971 Triumph and writing about failure modes.",
    ),
  },
  { match: "Replace with your real email and links.", values: v("Open to staff-level platform roles — or a good story about a good outage.") },
];

const SAAS_FALLBACK_OPS: ContentOp[] = [
  { match: "Feature one", values: v("Workflow automation") },
  { match: "Feature two", values: v("Real-time analytics") },
  { match: "Feature three", values: v("Roles & approvals") },
  { match: "Feature four", values: v("Integrations") },
  { match: "Feature five", values: v("Enterprise security") },
  { match: "Feature six", values: v("Usage-based billing") },
  {
    match: "Replace with a real benefit for your product.",
    values: v(
      "Design, run, and monitor multi-step processes without a pipeline engineer.",
      "Dashboards that update live as your team ships.",
      "Granular permissions with a two-person-press approval flow.",
      "Connect the tools you already run in one click.",
      "SOC 2, SSO, and regional data residency included.",
      "Pay only for what executes — with hard caps and alerts.",
    ),
  },
  { match: "Replace with a headline", values: v("Automate the busywork. Keep the brain work.") },
  {
    match: "Replace with a one-sentence value proposition for your product.",
    values: v("Meridian turns your operational playbooks into AI-executed workflows — with human approval at every decision that matters."),
  },
];

const LANDING_FALLBACK_OPS: ContentOp[] = [
  { match: "Replace with a bold headline", values: v("Ship the portfolio you've been meaning to build") },
  {
    match: "Replace with a supporting sentence that explains the headline.",
    values: v("A single-page template built for density: your work, your method, your numbers — no fluff, no cookie-cutter sections."),
  },
  {
    match: "Replace with a real benefit.",
    values: v("Lighthouse 100s, zero dependencies beyond the stack, static-deploy ready.",
      "Every section keyboard-reachable, print-friendly, and reduced-motion aware.",
      "One config object drives colors, type scale, and the whole layout."),
  },
  {
    match: "Replace with a real answer.",
    values: v("Clone it, edit src/config.ts, and deploy — there's nothing else to install.",
      "Plain React + Tailwind, no runtime framework, no CMS dependency.",
      "MIT licensed with a starter favicon set and meta tags pre-filled."),
  },
];

const ECOMMERCE_FALLBACK_OPS: ContentOp[] = [
  { match: "Placeholder product", values: v("Field merino tee", "Studio headphones Pro", "Balm — cedar + vetiver", "Field watch 2.0", "Hardcover sketch kit", "Lumbar cushion") },
  { match: "Replace with a seasonal headline", values: v("Summer drop 2026 is live") },
  { match: "Replace with a short promo message.", values: v("Forty pieces, one run — restocks of the tee end this Sunday.") },
  {
    match: "Greetings! I'm Copilot. Ask me anything — replace this welcome message with real onboarding copy.",
    values: v("Hi! I'm the shop assistant — describe the occasion and I'll pick a look from the current drop."),
  },
];

const DOCS_FALLBACK_OPS: ContentOp[] = [
  {
    match: "Replace this page with real documentation: what the product does, who it is for, and the first steps to get going.",
    values: v("Rivet is a background job runner for TypeScript teams: durable queues with SQLite, retry with backoff, and a dashboard for every run — without adopting a platform."),
  },
  {
    match: "Replace with the actual install steps for your project.",
    values: v("Requires Node 20+. Run `npm i -D rivet`, then `npx rivet init`. That creates rivet.config.ts and a dev database; `npx rivet dev` opens the dashboard."),
  },
];

const BLOG_FALLBACK_OPS: ContentOp[] = [
  {
    match: "Replace with a post title",
    values: v("Notes on building a one-person studio", "The 100th user is remote work's bar", "Tools I keep reaching for (and why)"),
  },
  {
    match: "Replace with a two-sentence summary of the post.",
    values: v(
      "Client work, open-source nights, and the spreadsheet that runs it all.",
      "What the 100th user means for comms, support, and your own sanity.",
      "A short list of tools that survived three years of real use.",
      "The tiny systems behind a four-person company shipping monthly.",
    ),
  },
  {
    match: "Replace with a blog name or tagline",
    values: v("Field Notes — essays on small teams"),
  },
  {
    match: "Replace with a sentence about what you write about and for whom.",
    values: v("Notes for people running small software teams — boring tools, honest postmortems, and the occasional field report."),
  },
  {
    match: "Replace with the featured post title",
    values: v("The boring architecture that survived two acquisitions"),
  },
  {
    match: "Replace with a longer summary that draws readers in.",
    values: v("It was just Postgres, a queue, and a monolith nobody was ashamed of — and every rewrite offer came with a reason to say no."),
  },
  { match: "Replace with a short pitch for subscribing.", values: v("One essay a month, straight to your inbox. No ads, ever.") },
];

const SOCIAL_FALLBACK_OPS: ContentOp[] = [
  {
    match: "Replace with a name",
    values: v("Riley Park", "Junaid Ashraf", "Margot Keller"),
  },
  {
    match: "@handle",
    values: v("@riley.park", "@junaid", "@margotk"),
  },
  {
    match: "Replace this post with real content for your community.",
    values: v("Ship day! Our little window-cleaner bot just cleared its first real storefront — video at the link."),
  },
  {
    match: "Another placeholder post to be replaced.",
    values: v("Anyone else use the 5am quiet window for the hard problems? Genuinely asking how you protect focus."),
  },
  {
    match: "One more placeholder post to be replaced.",
    values: v("Posting the build log of our garden sensor network — week 6, three boards survived the rain."),
  },
];

const AI_APP_FALLBACK_OPS: ContentOp[] = [
  {
    match: "Greetings! I'm Copilot. Ask me anything — replace this welcome message with real onboarding copy.",
    values: v("Hello! I'm Athene — ask me to plan a week, draft a doc, or dig through your notes."),
  },
];

const PWA_FALLBACK_OPS: ContentOp[] = [
  {
    match: /Replace with item \$\{i \+ 1\}/g,
    values: v(
      "Groceries — week 33",
      "Errands — city ticket office",
      "Reading list — design",
      "Packlist — Porto trip",
    ),
  },
  {
    match: "Replace with a short description.",
    values: v("Checked twice, ready for tomorrow."),
  },
  { match: "Replace with a headline", values: v("Your routines, offline-first") },
  {
    match: "Replace with a one-line description of this app.",
    values: v("Lists, habits, and packing — synced to the device and available on the runway."),
  },
];

/* ─── Ops: developer scaffolds (non-React) ────────────────────────────────── */

const API_OPS: ContentOp[] = [
  { match: "placeholder test", values: v("health check") },
];

const CLI_OPS: ContentOp[] = [
  { match: "Replace with a real command", values: v("Greet the current user") },
  { match: "Replace this command with real behavior.", values: v("Hello! Greetings from your RIDE scaffold.") },
  { match: 'test("placeholder"', values: v('test("greeting is friendly"') },
];

const PACKAGE_OPS: ContentOp[] = [
  { match: "replaceMe", values: v("greet") },
  { match: "Replace this with a real implementation.", values: v("Hello from your package — build, test, ship.") },
  { match: 'test("placeholder"', values: v('test("silent by default"') },
];

const EXTENSION_OPS: ContentOp[] = [
  { match: '"Ride extension"', values: v('"Tab Summarizer"') },
  { match: "Replace with a short description of the extension.", values: v("One-click AI summary of the current tab, saved to your reading list.") },
  { match: "Replace this popup with real extension UI.", values: v("Summarize, save, or copy the current page — one click each.") },
  { match: "Replace this action with real behavior.", values: v("Opening a summary…") },
  {
    match: "// Replace this content script with real page behavior.",
    values: v("// Extracts the page's main text into a clean string for the popup."),
  },
];

/* ─── Ops: per family resolution ──────────────────────────────────────────── */

const FAMILY_OPS: Record<string, ContentOp[]> = {
  portfolio: PORTFOLIO_OPS,
  agency: AGENCY_OPS,
  startup: STARTUP_OPS,
  blog: BLOG_OPS,
  documentation: DOCUMENTATION_OPS,
  personal: PERSONAL_OPS,
  restaurant: RESTAURANT_OPS,
  hotel: HOTEL_OPS,
  event: EVENT_OPS,
  education: EDUCATION_OPS,
  healthcare: HEALTHCARE_OPS,
  "real-estate": REAL_ESTATE_OPS,
  finance: FINANCE_OPS,
  saas: SAAS_OPS,
  crm: CRM_OPS,
  erp: ERP_OPS,
  "admin-panel": ADMIN_PANEL_OPS,
  analytics: ANALYTICS_OPS,
  "project-management": PROJECT_MANAGEMENT_OPS,
  ecommerce: ECOMMERCE_OPS,
  marketplace: MARKETPLACE_OPS,
  "social-network": SOCIAL_NETWORK_OPS,
  "learning-platform": LEARNING_PLATFORM_OPS,
  "ai-chatbot": AI_CHATBOT_OPS,
  rag: RAG_OPS,
  "ai-agent": AI_AGENT_OPS,
  "ai-saas": AI_SAAS_OPS,
  "document-analyzer": DOCUMENT_ANALYZER_OPS,
  "ai-customer-support": AI_CUSTOMER_SUPPORT_OPS,
  "ai-search": AI_SEARCH_OPS,
  "mobile-social": MOBILE_SOCIAL_OPS,
  "mobile-fitness": MOBILE_FITNESS_OPS,
  "mobile-finance": MOBILE_FINANCE_OPS,
  "mobile-ecommerce": MOBILE_ECOMMERCE_OPS,
  "mobile-productivity": MOBILE_PRODUCTIVITY_OPS,
  "mobile-education": MOBILE_EDUCATION_OPS,
  "dev-tools": DEV_TOOLS_OPS,
  "desktop-productivity": DESKTOP_PRODUCTIVITY_OPS,
  media: MEDIA_OPS,
  "file-manager": FILE_MANAGER_OPS,
  "business-software": BUSINESS_SOFTWARE_OPS,
  "game-puzzle": GAME_PUZZLE_OPS,
  "game-arcade": GAME_ARCADE_OPS,
  "game-multiplayer": GAME_MULTIPLAYER_OPS,
  "game-2d": GAME_2D_OPS,
  "game-3d": GAME_3D_OPS,
  "rest-api": API_OPS,
  "graphql-api": API_OPS,
  cli: CLI_OPS,
  sdk: PACKAGE_OPS,
  packages: PACKAGE_OPS,
  "browser-extension": EXTENSION_OPS,
};

const ARCHETYPE_OPS: Record<string, ContentOp[]> = {
  portfolio: PORTFOLIO_FALLBACK_OPS,
  saas: SAAS_FALLBACK_OPS,
  landing: LANDING_FALLBACK_OPS,
  ecommerce: ECOMMERCE_FALLBACK_OPS,
  blog: BLOG_FALLBACK_OPS,
  social: SOCIAL_FALLBACK_OPS,
  "ai-app": AI_APP_FALLBACK_OPS,
  pwa: PWA_FALLBACK_OPS,
  docs: DOCS_FALLBACK_OPS,
};

const GENERIC_OPS: ContentOp[] = [
  { match: "you@example.com", values: v("hello@ride.dev") },
];

/**
 * Placeholders used by the multi-page shell (src/pages/*). Every one must be
 * covered here so the QA content scan (PLACEHOLDER_RE) never sees them.
 */
const SHELL_OPS: ContentOp[] = [
  { match: "Replace with the full street address.", values: v("1234 Market Street, San Francisco, CA 94103") },
  { match: "Replace with the phone number.", values: v("(415) 555-0132") },
  { match: "Replace with the support email address.", values: v("hello@ride.dev") },
  { match: "Replace with a short line about the company's story.", values: v("We started with a simple idea: the tools teams rely on every day should feel effortless. That conviction still drives every release.") },
  { match: "Replace with the city name.", values: v("San Francisco") },
  { match: "Replace with the opening hours.", values: v("Mon\u2013Fri, 9am\u20136pm") },
  { match: "Replace with the social handle.", values: v("@ridehq") },
  { match: "Replace with the event date.", values: v("October 9\u201311, 2026") },
  { match: "Replace with the venue name.", values: v("The Grand Pavilion") },
  { match: "Replace with the instructor bio.", values: v("A practitioner and educator with over a decade of hands-on experience shipping real-world deployments.") },
  { match: "Replace with the reservation phone number.", values: v("(415) 555-0132") },
  { match: "Replace with the reservation email address.", values: v("bookings@ride.dev") },
  { match: "Replace with real project metrics.", values: v("The numbers that mattered most, straight from the project debrief.") },
  { match: "Replace with a project description.", values: v("The brief was demanding and the timeline was short. What shipped exceeded both expectations.") },
  { match: "Replace with the team member's role.", values: v("Leads strategy and delivery, and still opens the occasional PR on a Friday night.") },
  { match: "Replace with real pricing details.", values: v("Every plan includes unlimited projects and priority support. Volume pricing is available on request.") },
  { match: "Replace with a course description.", values: v("A practical, project-based curriculum that builds real skills through building real things.") },
  { match: "Replace with the tagline for this project.", values: v("Quietly ambitious work, built to last.") },
  { match: "Replace with the article summary.", values: v("A practical look at what changed, why it matters, and how to put it to work today.") },
  { match: "Replace with the dish description.", values: v("Seasonal produce, prepared simply and served with intent.") },
  { match: "Replace with a product description.", values: v("Thoughtfully made, rigorously tested, and ready to earn a permanent spot in your daily routine.") },
];

/** Placeholder fragments that must never survive — QA scans for the same list. */
export const PLACEHOLDER_RE = /(Replace this|Replace with|Placeholder|Lorem ipsum|Feature \d|placeholder test|replace me|Your company|you@example\.com)/i;

export function opsFor(familyId: string, archetype: string): ContentOp[] {
  const ops = FAMILY_OPS[familyId] ?? ARCHETYPE_OPS[archetype] ?? [];
  return [...ops, ...SHELL_OPS, ...GENERIC_OPS];
}

/**
 * Rewrite a generated scaffold so every placeholder becomes complete,
 * category-specific, production copy. Returns the enriched file map.
 */
export function enrichContent(files: Record<string, string>, familyId: string, archetype: string): Record<string, string> {
  const ops = opsFor(familyId, archetype);
  if (ops.length === 0) return files;
  const out: Record<string, string> = {};
  for (const [path, text] of Object.entries(files)) {
    out[path] = applyOps(text, ops);
  }
  return out;
}

/** Architecture-aware enrichment (legacy alias used by the pipeline). */
export function enrichContentWithArchitecture(
  files: Record<string, string>,
  _architecture: ProductArchetypeArchitecture,
  tpl: { familyId: string; archetype: string },
): Record<string, string> {
  return enrichContent(files, tpl.familyId, tpl.archetype);
}

/* ─── Preview / site copy bank (powers Template Studio thumbnails) ────────── */

export interface FeatureCopy {
  icon: string;
  title: string;
  note: string;
}

export interface SiteCopy {
  badge: string;
  headline: string;
  sub: string;
  cta: [string, string];
  logos: string[];
  features: FeatureCopy[];
  stats: [string, string][];
  testimonial?: { quote: string; name: string; role: string };
  pricing: { name: string; price: string; note: string; featured?: boolean }[];
  faq: [string, string][];
  nav: string[];
}

export type PreviewKind = "site" | "app" | "mobile" | "game" | "aichat" | "dev";

const feats = (f: [string, string, string][]): FeatureCopy[] => f.map(([icon, title, note]) => ({ icon, title, note }));

function tailQuote(quote: string, name: string, role: string) {
  return { quote, name, role };
}

const BANK: Record<string, SiteCopy> = {
  portfolio: {
    badge: "Available for work",
    headline: "Design silicon. Ship firmware. Measure everything.",
    sub: "I'm Priya — a VLSI engineer with a decade in scan, DFT, and embedded verification. This is the work, the tools, and the failures that taught me the most.",
    cta: ["View selected work", "Get in touch"],
    logos: ["Meridian Semi", "Northstar", "Orbit Systems", "Helios Fab", "VLSI Craft"],
    features: feats([
      ["Cpu", "Scan & ATPG", "Test-chip scan architecture across 8nm–28nm nodes."],
      ["Layers", "Verification flows", "UVM/SystemVerilog environments that fail fast."],
      ["Bot", "DFT automation", "Pattern generation tooling adopted by three tape-outs."],
      ["FileCode", "Firmware bring-up", "First silicon to working boot in under six weeks."],
      ["Wrench", "Debug at scale", "Signal-level triage for post-silicon escapes."],
      ["GraduationCap", "Mentoring", "Team of 12 interns → staff-level engineers."],
    ]),
    stats: [["10+", "years in silicon"], ["3", "tape-outs as DFT lead"], ["0", "escapes past ECO"]],
    testimonial: tailQuote(
      "Priya's DFT reviews are the reason our last chip shipped on schedule. She catches the bugs the tools still can't.",
      "M. Delgado",
      "VP Engineering, Meridian Semiconductor",
    ),
    pricing: [],
    faq: [],
    nav: ["Work", "About", "Experience", "Contact"],
  },
  agency: {
    badge: "Design & growth studio · Lisbon",
    headline: "Turn product strategy into launch-ready brands",
    sub: "We partner with teams between seed and scale — positioning, product design, and growth programs that show up as pipeline, not vanity metrics.",
    cta: ["Start a project", "See case studies"],
    logos: ["Northbeam", "Quill & Co.", "Helios Labs", "Fjord Capital", "Atlas Retail"],
    features: feats([
      ["Megaphone", "Brand & positioning", "Sprints that survive first contact with the market."],
      ["PenTool", "Web & product design", "Systems, interfaces, and design ops for shipping teams."],
      ["Rocket", "Growth marketing", "Full-funnel programs with measurable payback."],
      ["LineChart", "Conversion CRO", "Experiments that compound instead of spike."],
      ["Users", "Launch partners", "Senior operators embedded in your team."],
      ["ShieldCheck", "Design systems", "Tokens and components your engineers will adopt."],
    ]),
    stats: [["120+", "companies served"], ["3.4×", "median pipeline lift"], ["9 yrs", "senior-only bench"]],
    testimonial: tailQuote(
      "The tightest senior team we've ever hired an agency for — they operate like product leads, not vendors.",
      "R. Silva",
      "CEO, Northbeam",
    ),
    pricing: [],
    faq: [],
    nav: ["Services", "Work", "Process", "Contact"],
  },
  startup: {
    badge: "Now in private beta",
    headline: "Build, automate, and scale your workflows with AI agents",
    sub: "Operations teams lose weeks to spreadsheets and copy-paste. Meridian gives you autonomous agents that plan, execute, and self-heal — from first run to full rollout in an afternoon.",
    cta: ["Create your first workflow", "Watch demo"],
    logos: ["Founders Circle", "Y Combinator alumni", "Stripe-backed", "SOC 2 ready", "Series A 2026"],
    features: feats([
      ["Bot", "Autonomous AI workflows", "Agents that plan, execute, and recover on their own."],
      ["LineChart", "Real-time analytics", "Usage signals dashboards before the quarter ends."],
      ["Plug", "One-click integrations", "Stripe, Slack, and 60+ tools without engineering."],
      ["ShieldCheck", "Enterprise security", "SOC 2 Type II, SSO, and data residency built in."],
      ["Users", "Team collaboration", "Granular roles, approvals, and audit logs."],
      ["CreditCard", "Usage-based billing", "Pay for what runs — hard caps and alerts."],
    ]),
    stats: [["9 → 2", "days to close the books"], ["40%", "ops workload automated"], ["4.9", "rating from 200+ teams"]],
    testimonial: tailQuote(
      "Our finance team closed Q3 in two days — the agents reconciled 8,000 invoices while we slept.",
      "L. Ferreira",
      "Head of Finance Ops, Nova",
    ),
    pricing: [
      { name: "Starter", price: "$0", note: "3 workflows, community support, 7-day run history." },
      { name: "Pro", price: "$19", note: "Unlimited workflows, real-time analytics, priority support.", },
      { name: "Team", price: "$49", note: "SSO, audit logs, dedicated onboarding, custom SLAs." },
    ],
    faq: [
      ["Is my data used to train models?", "No. Your runs are isolated, EU-region, and training-free by default."],
      ["How long does setup take?", "Most teams ship their first workflow in under two hours."],
      ["Can I cancel anytime?", "Yes — plans are monthly and prorated to the day."],
    ],
    nav: ["Product", "Customers", "Pricing", "Docs"],
  },
  blog: {
    badge: "Essays on infrastructure & craft",
    headline: "Field Notes",
    sub: "Plain-text tools, honest postmortems, and the occasional field report for people who run small software teams.",
    cta: ["Read the latest", "Subscribe"],
    logos: ["RSS", "Substack", "Hacker News", "Lobsters", "Indieweb"],
    features: feats([
      ["BookOpen", "Essays", "The case for boring infrastructure."],
      ["Wrench", "Postmortems", "On-call, but make it humane."],
      ["FileCode", "Field reports", "Reading UNIX logs like a novel."],
      ["Lightbulb", "Opinion", "Observability is a product."],
      ["Clock", "Monthly", "One essay, every other Tuesday."],
      ["Mail", "Newsletter", "No ads, no noise, one-click unsubscribe."],
    ]),
    stats: [["60+", "essays published"], ["12k", "subscribers"], ["2×", "a month, reliably"]],
    testimonial: tailQuote(
      "The only newsletter I read without skipping — every essay makes me a better operator.",
      "J. Park",
      "SRE, Osprey",
    ),
    pricing: [],
    faq: [],
    nav: ["Essays", "Archive", "About", "RSS"],
  },
  documentation: {
    badge: "Docs · v2.4",
    headline: "Rivet — durable jobs for TypeScript teams",
    sub: "Background job runner with retry, backoff, and a dashboard for every run. Install with one command, no platform to adopt.",
    cta: ["Getting started", "API reference"],
    logos: ["npm", "pnpm", "Node 20+", "SQLite", "MIT"],
    features: feats([
      ["Zap", "5-minute install", "npx rivet init and a dev database."],
      ["RotateCcw", "Retry with backoff", "Exponential backoff, dead-letter queues."],
      ["Eye", "Run dashboard", "History, traces, and SQL views."],
      ["Database", "SQLite first", "Zero infrastructure to get started."],
      ["ShieldCheck", "Dead-letter safety", "Nothing silently disappears."],
      ["Cpu", "Zero-cost idle", "No timers when the queue is empty."],
    ]),
    stats: [["1", "command to install"], ["20+", "supported Node versions"], ["100%", "of runs recorded"]],
    testimonial: tailQuote(
      "We replaced 900 lines of bespoke cron with two queues and a dashboard. Chef's kiss.",
      "T. Osei",
      "Staff Engineer, Lumen",
    ),
    pricing: [],
    faq: [],
    nav: ["Introduction", "Installation", "Quickstart", "Configuration", "API"],
  },
  personal: {
    badge: "Now: bleeding hardware for the Lightweaver renderer",
    headline: "Mara — creative technologist",
    sub: "Building tools that make code feel physical. Installations by day, MIDI wiring by night, a 1974 VW bus on the weekends.",
    cta: ["See the archive", "Email me"],
    logos: ["Processing", "ShaderToy", "MIDI", "openFrameworks", "CCC"],
    features: feats([
      ["Music", "Generative MIDI", "A sequencer that composes its own phrases."],
      ["Cpu", "Lightweaver", "An open renderer for 100k points in real time."],
      ["Palette", "Installations", "Interactive work shown in 9 cities."],
      ["Clock", "Talks & workshops", "Teaching creative code since 2019."],
    ]),
    stats: [["9", "cities exhibited"], ["12k", "devices rendered"], ["3", "languages fluent in"]],
    testimonial: tailQuote(
      "Mara's installations make people stop. It's the closest to magic I've seen in a gallery.",
      "S. Katsu",
      "Curator, Light Hall",
    ),
    pricing: [],
    faq: [],
    nav: ["Now", "Archive", "About", "Contact"],
  },
  restaurant: {
    badge: "Modern European · Lisboa",
    headline: "Orléans — wood fire, twelve seats, one menu a night",
    sub: "We cook over charcoal on a twelve-seat counter, sourcing from three farms within 40km. The menu changes nightly — the fire decides.",
    cta: ["Book a seat", "See tonight's menu"],
    logos: ["Michelin Guide", "Gault&Millau", "Time Out Lisboa", "The Fork 4.9"],
    features: feats([
      ["Flame", "Wood-fire kitchen", "Everything over charcoal, nothing kept warm."],
      ["Wheat", "Bread baked daily", "Buckwheat sourdough from our 40-year starter."],
      ["Wine", "By-the-farm cellar", "30 wines, most from within 200km."],
      ["Coffee", "Natural wine & cordials", "Zero-waste pairings on the bar list."],
    ]),
    stats: [["12", "seats per night"], ["3", "farms within 40km"], ["1", "menu — until it's gone"]],
    testimonial: tailQuote(
      "Best counter in the city. The leek crostini alone is worth the trip from Porto.",
      "A. Correia",
      "Food writer, Salvagente",
    ),
    pricing: [],
    faq: [],
    nav: ["Menu", "The room", "Book", "Contact"],
  },
  hotel: {
    badge: "Harbour hotel · Lisbon",
    headline: "Atlas River — a customs house, restored",
    sub: "46 rooms overlooking the Tagus, where 1920s craft meets contemporary comfort. Ten minutes from Alfama, five from the market.",
    cta: ["Book your stay", "Explore the rooms"],
    logos: ["Michelin Guide", "Condé Nast", "The Telegraph", "Relais & Châteaux"],
    features: feats([
      ["BedDouble", "Harbour rooms", "38–92 m² with full river views."],
      ["Coffee", "Larder breakfast", "Full cold room, 07:30–11:00, no booking needed."],
      ["Waves", "River terraces", "Sunset terrace reserved for guests."],
      ["Concierge", "24h concierge", "Transfers, guides, and table bookings."],
    ]),
    stats: [["46", "rooms"], ["1920", "year the house was built"], ["4.8", "guest rating"]],
    testimonial: tailQuote(
      "The quietest sleep in Lisbon — and the best breakfast logistics anywhere.",
      "C. Brandt",
      "Travel editor, Wochenende",
    ),
    pricing: [
      { name: "Harbour Deluxe", price: "€245", note: "38–42 m², full harbour view, rain shower." },
      { name: "Atelier Suite", price: "€380", note: "55 m² corner suite, stone walls, balcony." },
      { name: "Penthouse", price: "€690", note: "92 m², private terrace, plunge pool, butler." },
    ],
    faq: [],
    nav: ["Rooms", "The house", "Breakfast", "Book"],
  },
  event: {
    badge: "21 May 2026 · Porto",
    headline: "Rendezvous JS — two stages, one courtyard",
    sub: "40 speakers, real talks, and a courtyard that runs on cordials. Leave with working notes, real contacts, and an idea you'll ship Monday.",
    cta: ["Get tickets", "View the schedule"],
    logos: ["TypeScript", "Vite", "Tailwind", "React", "Node"],
    features: feats([
      ["Mic2", "Keynotes", "Designing for a slower internet."],
      ["Wrench", "Workshops", "From load event to interaction."],
      ["Users", "Panel", "The economics of independent software."],
      ["Coffee", "Catering", "Lunch, coffee, and cordials included."],
    ]),
    stats: [["40", "speakers"], ["2", "stages"], ["500", "attendees"]],
    testimonial: tailQuote(
      "The courtyard alone is worth the ticket. Both days, zero sponsor stage-time.",
      "D. Nkosi",
      "Attendee 2025",
    ),
    pricing: [
      { name: "Standard", price: "€120", note: "Both days, all talks, lunch & coffee." },
      { name: "Workshop", price: "€240", note: "Everything in Standard plus the full-day workshop." },
    ],
    faq: [],
    nav: ["Schedule", "Speakers", "Tickets", "Venue"],
  },
  education: {
    badge: "Est. 1987 · Lisboa",
    headline: "Meridian Institute — learn by building",
    sub: "Project-based semesters, mentors from 40+ companies, and a capstone that goes to market. 96% of our graduates are placed within six months.",
    cta: ["Apply for fall", "Explore programs"],
    logos: ["ERASMUS+", "Santander", "Web Summit", "IST", "Unesco"],
    features: feats([
      ["GraduationCap", "Computer Science", "Systems, compilers, software that lasts."],
      ["Palette", "Interaction Design", "Research, prototyping, everyday design."],
      ["BrainCircuit", "Robotics & AI", "Perception, planning, co-design."],
      ["Lightbulb", "Product", "Discovery, strategy, teams that ship."],
    ]),
    stats: [["2,400", "students"], ["94%", "placement within 6 months"], ["12:1", "student-to-mentor ratio"]],
    testimonial: tailQuote(
      "The capstone went to market. I was hired by the company I'd built it with.",
      "N. Okafor",
      "Alumni '24, now at Helios",
    ),
    pricing: [],
    faq: [],
    nav: ["Programs", "Admissions", "Faculty", "Contact"],
  },
  healthcare: {
    badge: "Town-centre practice",
    headline: "Calma Health — care that starts with a 40-minute first visit",
    sub: "A six-GP practice serving families across the north of the city. Same-week appointments, named GPs, and results read by specialists within 48 hours.",
    cta: ["Book an appointment", "Meet the team"],
    logos: ["DGS", "Ordem dos Médicos", "AXA", "Allianz", "Multicare"],
    features: feats([
      ["HeartPulse", "Primary care", "Named GP, chronic care, same-week visits."],
      ["Stethoscope", "Cardiology", "Echo, stress tests, Holter within 48h."],
      ["Baby", "Women's health", "Maternity and menopause, same midwife."],
      ["ShieldCheck", "Preventive programs", "Screening and plans you can follow."],
    ]),
    stats: [["6", "GPs, no locums"], ["48h", "specialist reads"], ["10:20", "first available slot today"]],
    testimonial: tailQuote(
      "My GP remembered my history — she'd read the notes before the door opened.",
      "M. Esteves",
      "Patient for 7 years",
    ),
    pricing: [],
    faq: [],
    nav: ["Services", "Team", "Book", "Contact"],
  },
  "real-estate": {
    badge: "Lisbon & the Coast · Est. 2004",
    headline: "Poca Luz — 1,200 homes sold, every one photographed and legal-cleared",
    sub: "We cover Lisbon, Cascais, and the silver coast. Every listing is marketed in four languages before it goes live.",
    cta: ["Browse listings", "Talk to an agent"],
    logos: ["Expresso", "Público", "Idealista Pro", "SAPO Casa"],
    features: feats([
      ["Home", "Residential", "Apartments and townhouses, city-wide."],
      ["Building2", "Luxury & off-market", "Portfolio homes without public listings."],
      ["Landmark", "New-build & off-plan", "Pre-launch access to developments."],
      ["MapPin", "Full coverage", "Lisbon, Cascais, Ericeira + coast."],
    ]),
    stats: [["1,200", "homes sold"], ["18", "average days on market"], ["4", "languages per listing"]],
    testimonial: tailQuote(
      "Sold in 12 days, above asking, with a buyer they'd vetted. Unreal.",
      "H. van Dam",
      "Seller, Alfama",
    ),
    pricing: [],
    faq: [],
    nav: ["Buy", "Sell", "Portfolio", "About"],
  },
  finance: {
    badge: "Digital bank · supervised by the ECB",
    headline: "Calma Bank — your money, actually working",
    sub: "89,000 customers, no branches, and products designed around real behaviour instead of a legacy fee sheet.",
    cta: ["Open an account", "See the rates"],
    logos: ["ECB", "Mastercard", "SWIFT", "Pix", "SEPA"],
    features: feats([
      ["Wallet", "Everyday Spending", "Salary account, no monthly fee, instant transfers."],
      ["PiggyBank", "High-Yield Savings", "4.2% AER paid monthly, no notice."],
      ["CreditCard", "Travel Card", "No FX fees, lounge access, €1,000 overdraft."],
      ["ShieldCheck", "Regulated & insured", "ECB-supervised and Banco de Portugal covered."],
    ]),
    stats: [["89k", "customers"], ["4.2%", "AER on savings"], ["10 min", "to open an account"]],
    testimonial: tailQuote(
      "Switched in an afternoon. The rate is real and the app never argues with me.",
      "P. Sousa",
      "Customer since 2023",
    ),
    pricing: [],
    faq: [],
    nav: ["Accounts", "Save", "Borrow", "Security"],
  },
  saas: {
    badge: "Revenue CRM · SOC 2",
    headline: "Meridian — the pipeline you trust, without the spreadsheet",
    sub: "Spreadsheet CRM eats selling time. Meridian gives revenue teams a live pipeline, reports they don't rebuild, and automation that books the next meeting for them.",
    cta: ["Start free", "Book a demo"],
    logos: ["Notion", "Slack", "Gmail", "HubSpot", "Stripe"],
    features: feats([
      ["Layers", "Pipeline & forecasts", "Deals, stages, and follow-ups in one live view."],
      ["Users", "Customer workspaces", "Shared deals and tasks with granular roles."],
      ["BarChart3", "Executive analytics", "Board-ready views without a data team."],
      ["Zap", "Automation", "Books the next meeting for your reps."],
      ["ShieldCheck", "SOC 2 Type II", "SSO, audit logs, EU data residency."],
      ["Plug", "Integrations", "Syncs with your inbox and calendar in minutes."],
    ]),
    stats: [["3.4×", "pipeline visibility"], ["6 hrs", "saved per rep per week"], ["99.99%", "uptime SLA"]],
    testimonial: tailQuote(
      "We stopped rebuilding reports every Friday. The forecast is just… correct.",
      "K. Bell",
      "VP Sales, Fjord",
    ),
    pricing: [
      { name: "Starter", price: "$19", note: "3 seats, core modules, community support." },
      { name: "Growth", price: "$49", note: "10 seats, all modules, priority support.", featured: true },
      { name: "Scale", price: "Custom", note: "Unlimited seats, SSO, audit logs." },
    ],
    faq: [],
    nav: ["Product", "Pricing", "Customers", "Docs"],
  },
  crm: {
    badge: "Revenue workspace",
    headline: "Pipeline room — every deal, one live view",
    sub: "Deals, stage changes, and follow-ups in a workspace your whole revenue org shares. Quarter running at 108% of target.",
    cta: ["View pipeline", "Add a deal"],
    logos: ["Slack", "Stripe", "SendGrid", "Zoom", "Notion"],
    features: feats([
      ["LayoutGrid", "Kanban pipeline", "Drag deals between stages with full history."],
      ["Users", "Workspaces", "Roles, mentions, and shared notes."],
      ["BarChart3", "Forecasts", "Commit vs. best-case by owner."],
      ["Zap", "Automation", "Stage-change triggers for your team."],
    ]),
    stats: [["108%", "of Q3 target"], ["€2.4M", "pipeline value"], ["6", "deals in review"]],
    testimonial: tailQuote(
      "The first CRM nobody on the team has tried to replace.",
      "R. Khanna",
      "Head of Sales, Verde",
    ),
    pricing: [],
    faq: [],
    nav: ["Pipeline", "Deals", "Forecast", "Settings"],
  },
  erp: {
    badge: "Manufacturing ERP",
    headline: "Stock, orders, and suppliers — reconciled daily",
    sub: "Inventory, purchasing, and production status in one screen. 312 SKUs tracked across three warehouses.",
    cta: ["Open dashboard", "Raise a PO"],
    logos: ["Sage", "QuickBooks", "Dynamics", "TOTVS", "Shopify"],
    features: feats([
      ["Boxes", "Inventory", "312 SKUs, live stock levels per warehouse."],
      ["Factory", "Production", "Work orders and BOMs in one flow."],
      ["Package", "Purchasing", "POs with supplier scoring and lead times."],
      ["Truck", "Logistics", "In-transit tracking with ETA windows."],
    ]),
    stats: [["312", "SKUs"], ["87%", "stock accuracy"], ["4.2", "days average lead time"]],
    testimonial: tailQuote(
      "Stock takes went from a weekend to an afternoon.",
      "J. Duarte",
      "Ops Director, Ferrum B.V.",
    ),
    pricing: [],
    faq: [],
    nav: ["Dashboard", "Inventory", "Purchasing", "Production"],
  },
  "admin-panel": {
    badge: "Admin console · 412 seats",
    headline: "Workspace administration, at a glance",
    sub: "Seats, roles, and usage for the whole org — 412 of 500 seats used, renewal in 34 days.",
    cta: ["Invite members", "Manage billing"],
    logos: ["Okta", "SAML", "Azure", "Google", "1Password"],
    features: feats([
      ["Users", "Members", "Roles, invites, and activity in one list."],
      ["CreditCard", "Billing", "Plans, invoices, and usage caps."],
      ["ShieldCheck", "Security", "SSO, MFA policies, session audit."],
      ["BarChart3", "Usage", "Seat and feature adoption trends."],
    ]),
    stats: [["412", "seats in use"], ["6", "integration apps"], ["99.98%", "platform uptime"]],
    testimonial: tailQuote(
      "Finally an admin console our IT team doesn't avoid.",
      "F. Mwangi",
      "IT Lead, Northgrid",
    ),
    pricing: [],
    faq: [],
    nav: ["Overview", "Members", "Billing", "Security"],
  },
  analytics: {
    badge: "Analytics · last 90 days",
    headline: "Where growth comes from, weekly",
    sub: "Acquisition, activation, retention — every channel, one view, refreshed every 15 minutes.",
    cta: ["Open dashboard", "Export report"],
    logos: ["Segment", "BigQuery", "Snowflake", "Amplitude", "Mixpanel"],
    features: feats([
      ["Radar", "Acquisition", "Channel mix and CAC by cohort."],
      ["Users", "Activation", "Time-to-value funnels per plan."],
      ["TrendingUp", "Retention", "Weeks retained, by activation path."],
      ["Award", "NPS", "Score and driver themes monthly."],
    ]),
    stats: [["42%", "direct traffic"], ["28%", "organic growth YoY"], ["31", "NPS this month"]],
    testimonial: tailQuote(
      "Our data team stopped exporting spreadsheets to chat. The dashboard just lives in the room.",
      "S. Almeida",
      "VP Product, Volt",
    ),
    pricing: [],
    faq: [],
    nav: ["Overview", "Channels", "Retention", "Export"],
  },
  "project-management": {
    badge: "Atlas — Q3 platform refresh",
    headline: "Ship the platform refresh on schedule",
    sub: "Eight tasks open across design, engineering, and QA. Beta launches 15 Sep.",
    cta: ["Open board", "Add task"],
    logos: ["Figma", "GitHub", "Linear", "Slack", "Jira"],
    features: feats([
      ["KanbanSquare", "Boards", "To do, in progress, done — with owners."],
      ["Clock", "Milestones", "Beta launch pinned to 15 Sep."],
      ["Users", "Assignees", "Every task owns a face."],
      ["BarChart3", "Burndown", "Velocity per week, no guessing."],
    ]),
    stats: [["23", "tasks this sprint"], ["8", "open tasks"], ["15 Sep", "beta launch"]],
    testimonial: tailQuote(
      "The only tool where the board and the plan are the same thing.",
      "M. Otieno",
      "Engineering Manager, Atlas",
    ),
    pricing: [],
    faq: [],
    nav: ["Board", "Timeline", "Reports", "Settings"],
  },
  ecommerce: {
    badge: "Ready-to-wear · Porto",
    headline: "Clothing built to be repaired, not replaced",
    sub: "Cut in-house, sewn in two family-run factories in Porto, and shipped plastic-free since 2019. Every piece carries a repair guarantee.",
    cta: ["Shop the drop", "Our story"],
    logos: ["Stripe", "Klarna", "PayPal", "DPD", "EcoC"],
    features: feats([
      ["Shirt", "Merino crewneck", "Oyster · Bestseller, 8 colours."],
      ["Ruler", "Overlocked seams", "Every seam repaired for life."],
      ["Leaf", "Plastic-free", "Paper packaging since 2019."],
      ["Truck", "Fast shipping", "Free EU delivery over €75."],
      ["RotateCcw", "30-day returns", "Rethink or repair — your call."],
      ["IdCard", "Factory QR", "Scan any piece back to its maker."],
    ]),
    stats: [["48", "pieces in the drop"], ["2019", "plastic-free since"], ["4.9", "rating over 2,000 reviews"]],
    testimonial: tailQuote(
      "I sent a jacket back for repair and got it back in nine days — with a note from the seamstress.",
      "A. Berg",
      "Customer",
    ),
    pricing: [],
    faq: [],
    nav: ["New in", "Mens", "Womens", "Repairs"],
  },
  marketplace: {
    badge: "Moderated collector marketplace",
    headline: "Heritage Goods — verified classics, escrowed deals",
    sub: "Every listing photo-verified, payments escrowed, both parties rated. From 1962 Mercedes to Eames lounge chairs.",
    cta: ["Browse the floor", "Sell an item"],
    logos: ["Escrow", "Verified", "Insured shipping", "Appraised"],
    features: feats([
      ["Car", "Motoring", "Classics, restorations, and parts — verified."],
      ["Audio", "Hi-Fi", "Serviced tables and speakers only."],
      ["Armchair", "Mid-century", "Certified pieces with provenance."],
      ["Camera", "Photography", "Inspected bodies and glass."],
      ["ShieldCheck", "Escrow payments", "Funds held until you accept the item."],
      ["Building2", "Trade accounts", "For dealers with 20+ sales."],
    ]),
    stats: [["12k", "items listed"], ["5%", "fee, capped at €250"], ["24h", "listing review"]],
    testimonial: tailQuote(
      "Bought a 1969 Eames chair from a seller in Porto — shipped, insured, perfect.",
      "K. Yoshida",
      "Collector",
    ),
    pricing: [],
    faq: [],
    nav: ["Floor", "Categories", "Sell", "Trust"],
  },
  "social-network": {
    badge: "Community feed",
    headline: "What's happening in your circles",
    sub: "Posts from people you follow — builds, coffee, and the occasional 2am take.",
    cta: ["Write a post", "Explore"],
    logos: ["ActivityPub", "Mastodon", "IndieWeb", "RSS"],
    features: feats([
      ["MessageCircle", "Posts", "Text-first, links welcome."],
      ["Heart", "Reactions", "Likes and replies, no algorithms."],
      ["AtSign", "Handles", "Follow the people, not the platform."],
      ["Clock", "Simple timeline", "Reverse-chronological, always."],
    ]),
    stats: [["48k", "active posters"], ["1.2k", "likes on the top post"], ["0", "ads, ever"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: ["Feed", "Explore", "Notifications", "Profile"],
  },
  "learning-platform": {
    badge: "Learn by doing",
    headline: "Acoustic guitar — from first chord to first demo",
    sub: "Hands-on lessons, a plan that adapts to your pace, and goals you'll actually hit. 32 exercises done this month.",
    cta: ["Continue lesson", "Browse courses"],
    logos: ["Spotify", "SoundCloud", "ToneBridge", "GarageBand"],
    features: feats([
      ["Music", "Structured paths", "Beginner to first demo in 12 weeks."],
      ["Clock", "Short sessions", "10-minute lessons that build."],
      ["BarChart3", "Progress", "Streaks, metrics, and milestones."],
      ["Mic2", "Play & record", "Feedback on your recordings."],
    ]),
    stats: [["14-day", "streak"], ["32", "exercises this month"], ["70%", "of path complete"]],
    testimonial: tailQuote(
      "I played my first song for my daughter after three weeks.",
      "R. Mota",
      "Student",
    ),
    pricing: [],
    faq: [],
    nav: ["Home", "Courses", "Practice", "Profile"],
  },
  "ai-chatbot": {
    badge: "Assistant · connected",
    headline: "Athene — your inbox, threads, and docs on demand",
    sub: "Draft, summarize, translate, and set notes straight into your workflow — answers with sources, in your language.",
    cta: ["Start a chat", "See what it can do"],
    logos: ["Slack", "Gmail", "Notion", "Drive", "Teams"],
    features: feats([
      ["Bot", "Summaries", "Threads and docs, distilled."],
      ["PenLine", "Drafts", "Replies in your voice, three tones."],
      ["Languages", "Translation", "ES/EN/PT with terminology memory."],
      ["CalendarCheck", "Meeting notes", "Ready before the next slot."],
    ]),
    stats: [["140ms", "median response"], ["12", "tools connected"], ["100%", "EU-hosted"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
  rag: {
    badge: "Ask your documents",
    headline: "A knowledge base that answers with receipts",
    sub: "Upload PDF, DOCX, and MD up to 50MB — every answer cites the exact page and line, dated at index time.",
    cta: ["Upload a document", "Ask a question"],
    logos: ["PDF", "DOCX", "Markdown", "TXT"],
    features: feats([
      ["FileSearch", "Source answers", "Citations with page & line."],
      ["FileText", "Formats", "PDF, DOCX, MD, TXT up to 50MB."],
      ["Clock", "Nightly index", "Fresh answers by 06:00."],
      ["ShieldCheck", "Access control", "Only approved sources answer."],
    ]),
    stats: [["50MB", "max upload"], ["12", "docs in the base"], ["06:00", "refresh time"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
  "ai-agent": {
    badge: "Agents · 18 runs today",
    headline: "Agents that finish what they start",
    sub: "Scheduled, tool-enabled runs with human approval at every decision that matters — 2 hours saved per run.",
    cta: ["Create an agent", "View runs"],
    logos: ["Slack", "Gmail", "Ledger", "Notion", "GitHub"],
    features: feats([
      ["Bot", "Task agents", "Invoices, triage, release notes."],
      ["Clock", "Schedules", "Runs daily, weekly, or on events."],
      ["ShieldCheck", "Approvals", "Human in the loop where it counts."],
      ["FileCode", "Tool access", "Read-only, scoped, audited."],
    ]),
    stats: [["18", "runs/day"], ["0.4%", "error rate"], ["2h", "saved per run"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
  "ai-saas": {
    badge: "AI workflow platform · private beta",
    headline: "Agencies of agents, safely into your workflow",
    sub: "Finance, legal, support, and compliance teams run AI-executed processes with human review built in — reconcile in hours, not weeks.",
    cta: ["Request access", "See use cases"],
    logos: ["SOC 2", "GDPR", "ISO 27001", "EU hosting"],
    features: feats([
      ["Receipt", "Invoice reconciliation", "Payables matched to POs, exceptions flagged."],
      ["ClipboardList", "Onboarding", "Checklist agents that never forget a step."],
      ["Scale", "Contract review", "Clauses risk-scored against your playbook."],
      ["LifeBuoy", "Support triage", "Classify, draft, route before a human."],
      ["ShieldCheck", "Replayable audit", "Every step logged, every run replayable."],
      ["Database", "Your data trains nothing", "EU-region, vaulted credentials."],
    ]),
    stats: [["72%", "tickets auto-drafted"], ["9 → 2", "days to close the books"], ["100%", "steps auditable"]],
    testimonial: tailQuote(
      "Our finance team closed Q3 in two days. The agents reconciled 8,000 invoices while we slept.",
      "L. Ferreira",
      "Head of Finance Ops, Nova",
    ),
    pricing: [
      { name: "Starter", price: "$0", note: "2 agents, 1k steps/mo, community support." },
      { name: "Pro", price: "$29", note: "10 agents, 50k steps/mo, approval flows.", featured: true },
      { name: "Enterprise", price: "Custom", note: "Unlimited agents, SSO, dedicated lead." },
    ],
    faq: [["Is my data used for training?", "No — your runs are isolated and training-free."], ["When does GA open?", "Current beta customers move free until GA."]],
    nav: ["Product", "Use cases", "Pricing", "Trust"],
  },
  "document-analyzer": {
    badge: "Document intelligence",
    headline: "Contracts, analysed in minutes — with receipts",
    sub: "Upload PDF, DOCX, or scans up to 100MB. Get a summary, entities, risk flags, and an evidence trail you can send to anyone.",
    cta: ["Analyse a document", "See a sample report"],
    logos: ["PDF", "DOCX", "OCR", "GDPR"],
    features: feats([
      ["FileSearch", "Summary", "Executive read in six bullets."],
      ["ListChecks", "Risk flags", "Conflicts, dates, and anomalies."],
      ["FileText", "Evidence trail", "Every claim traced to a line."],
      ["Download", "Exports", "PDF report, CSV, structured data."],
    ]),
    stats: [["100MB", "max upload"], ["6 min", "median analyse time"], ["3", "export formats"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
  "ai-customer-support": {
    badge: "Support copilot",
    headline: "Support copilot — drafts in 38 seconds",
    sub: "Known errors and billing disputes resolve without a human in the loop. Everything else gets drafted, reviewed, and shipped with full context.",
    cta: ["Open inbox", "View playbook"],
    logos: ["Zendesk", "Intercom", "Gmail", "Slack"],
    features: feats([
      ["Ticket", "Triaging", "Classifies intent and priority."],
      ["PenLine", "Drafts", "Human-approved before sending."],
      ["RotateCcw", "Escalation", "Off-threshold to tier 2 instantly."],
      ["BarChart3", "Metrics", "Resolution rates per tag."],
    ]),
    stats: [["72%", "auto-resolved"], ["38s", "median draft time"], ["4.8/5", "CSAT"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
  "ai-search": {
    badge: "Enterprise search",
    headline: "Find the answer, with the receipts",
    sub: "Synthesized answers over your docs and approved web sources — with citations and coverage dates.",
    cta: ["Try a query", "Manage sources"],
    logos: ["Postgres", "Confluence", "GitHub", "README"],
    features: feats([
      ["Search", "Synthesized answers", "Specific, current, cited."],
      ["Globe", "Approved sources", "Your docs and curated domains."],
      ["CalendarClock", "Coverage dates", "Know what's indexed when."],
      ["ShieldCheck", "Access control", "Answers respect your permissions."],
    ]),
    stats: [["12", "source domains"], ["3", "languages indexed"], ["24h", "index freshness"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
};

const BANK_FALLBACKS: Record<string, SiteCopy> = {
  saas: BANK.saas!,
  portfolio: BANK.portfolio!,
  blog: BANK.blog!,
  docs: BANK.documentation!,
  landing: BANK.agency!,
  ecommerce: BANK.ecommerce!,
  social: BANK["social-network"]!,
  "ai-app": BANK["ai-chatbot"]!,
  pwa: BANK["mobile-productivity"]!,
  dashboard: BANK["admin-panel"]!,
  arcade: BANK.startup!,
};

const BANK_ALIASES: Record<string, SiteCopy> = {
  "mobile-social": BANK["social-network"]!,
  "mobile-fitness": BANK["learning-platform"]!,
  "mobile-finance": BANK.finance!,
  "mobile-ecommerce": BANK.ecommerce!,
  "mobile-productivity": BANK["project-management"]!,
  "mobile-education": BANK["learning-platform"]!,
  "dev-tools": BANK["documentation"]!,
  "desktop-productivity": BANK["project-management"]!,
  media: {
    badge: "Your library",
    headline: "Field Lines — a night of analog",
    sub: "Tracks, albums, and playlists, streaming in lossless.",
    cta: ["Play", "Library"],
    logos: ["Spotify", "Tidal", "MQA", "FLAC"],
    features: feats([
      ["Music", "Field Notes", "Recorded live · June 2026."],
      ["Headphones", "HQ streaming", "Lossless and gapless."],
      ["Radio", "Stations", "Generated from your artists."],
      ["ListMusic", "Playlists", "Shared and edited live."],
    ]),
    stats: [["52", "min album"], ["4.2k", "tracks in library"], ["1", "night, recorded live"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
  "file-manager": {
    badge: "Files",
    headline: "Everything in its place",
    sub: "Projects, archive, and scans — with live storage and instant search.",
    cta: ["New folder", "Upload"],
    logos: ["iCloud", "OneDrive", "Dropbox", "SMB"],
    features: feats([
      ["Folder", "Folders", "Projects · Archive · Scans."],
      ["Search", "Instant search", "Indexed names and content."],
      ["HardDrive", "Storage", "214 GB free of 512 GB."],
      ["CloudUpload", "Sync", "Any device, offline first."],
    ]),
    stats: [["142", "items"], ["2.1 GB", "total size"], ["2", "devices in sync"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
  "business-software": {
    badge: "Small business finance",
    headline: "Invoices, cash, and forecasts in one ledger",
    sub: "Revenue, expenses, and client balances for the whole month, without a bookkeeper.",
    cta: ["Open dashboard", "New invoice"],
    logos: ["Stripe", "Sage", "QuickBooks", "Revolut"],
    features: feats([
      ["Receipt", "Invoices", "Create, chase, and reconcile."],
      ["PiggyBank", "Cash on hand", "Live balances and runway."],
      ["LineChart", "Forecasts", "Plan vs. actual this month."],
      ["CreditCard", "Expenses", "Categorised and ready for VAT."],
    ]),
    stats: [["€48k", "revenue MTD"], ["5", "client balances"], ["108%", "forecast to plan"]],
    testimonial: undefined,
    pricing: [],
    faq: [],
    nav: [],
  },
};

export function siteCopyFor(familyId: string): SiteCopy {
  return BANK[familyId] ?? BANK_ALIASES[familyId] ?? BANK.saas!;
}

export function previewKindFor(familyId: string): PreviewKind {
  if (["game-2d", "game-3d", "game-multiplayer", "game-puzzle", "game-arcade"].includes(familyId)) return "game";
  if (familyId.startsWith("mobile-")) return "mobile";
  if (familyId.startsWith("ai-")) return "aichat";
  if (["rest-api", "graphql-api", "cli", "sdk", "packages", "browser-extension", "dev-tools", "file-manager", "media", "desktop-productivity", "business-software", "admin-panel", "analytics", "project-management", "crm", "erp", "learning-platform"].includes(familyId)) return "app";
  return "site";
}

/**
 * RIDE Architecture-Aware Content Enrichment.
 *
 * Extends the standard content enrichment by using architecture-specific
 * content operations that know about the complete product structure,
 * not just single-page placeholder replacement.
 */

export interface ArchitectureContentOp extends ContentOp {
  targetPage?: string; // Target specific page/section
  replaceInAllPages?: boolean; // Replace in all generated pages
}

/** Get content ops for a specific architecture and variant. */
export function getArchitectureOps(
  familyId: string,
  archetype: string,
  architecture: ProductArchetypeArchitecture,
  variantIndex: number
): ArchitectureContentOp[] {
  // Get the standard ops for the family
  const standardOps = getStandardOps(familyId, archetype);

  // Enhance ops based on architecture requirements
  const enhanced: ArchitectureContentOp[] = [];

  for (const op of standardOps) {
    const enhancedOp: ArchitectureContentOp = {
      ...op,
      targetPage: undefined,
      replaceInAllPages: false,
    };

    // Add page-specific ops based on architecture sections
    if (architecture.pages) {
      const pageKeys = Object.keys(architecture.pages);
      // If op has a general "Replace" pattern, make it page-aware
      if (typeof op.match === "string" && op.match.includes("Replace")) {
        // Find the most relevant page for this op
        const relevantPage = findRelevantPageForOp(op.match, architecture);
        if (relevantPage) {
          enhancedOp.targetPage = relevantPage;
        }
      }
    }

    // Mark ops for replacement in all pages if they're structural
    if (isStructuralOperation(op)) {
      enhancedOp.replaceInAllPages = true;
    }

    enhanced.push(enhancedOp);
  }

  // Add architecture-specific ops
  const architectureOps = addArchitectureSpecificOps(architecture, familyId);
  enhanced.push(...architectureOps);

  return enhanced;
}

/** Find the most relevant page for a given operation. */
function findRelevantPageForOp(
  opPattern: string,
  architecture: ProductArchetypeArchitecture
): string | undefined {
  const lower = opPattern.toLowerCase();

  // Map common patterns to pages
  const patternMap: Record<string, string> = {
    // Hero-related
    "hero": "/",
    "welcome": "/",
    "intro": "/",

    // Navigation
    "navbar": "/",
    "menu": "/",
    "sidebar": "/",

    // Authentication
    "login": "/login",
    "signup": "/signup",
    "register": "/signup",
    "logout": "/",

    // Forms
    "contact": "/contact",
    "form": "/contact",
    "checkout": "/cart",
    "pricing": "/pricing",

    // Portfolio
    "project": "/work",
    "project-detail": "/work/[id]",
    "case-study": "/work",

    // E-commerce
    "product": "/product/[id]",
    "cart": "/cart",
    "order": "/orders",

    // Dashboard
    "dashboard": "/",
    "kpis": "/",
    "projects": "/projects",

    // Social
    "feed": "/",
    "profile": "/profile",
    "post": "/create",

    // AI
    "timeline": "/timeline",
    "export": "/export",

    // Restaurant
    "reservation": "/reservations",
    "reviews": "/reviews",
  };

  // Check for exact matches first
  for (const [pattern, page] of Object.entries(patternMap)) {
    if (lower.includes(pattern)) {
      // Verify this page exists in the architecture
      if (architecture.pages && architecture.pages[page]) {
        return page;
      }
      // Return if page exists in any architecture
      return page;
    }
  }

  // Check for partial matches in page paths
  if (architecture.pages) {
    for (const [pagePath, pageSpec] of Object.entries(architecture.pages)) {
      const pageLower = pagePath.toLowerCase();
      if (lower.includes(pagePath.toLowerCase().replace("/", "")) ||
          lower.includes(pagePath.replace("/", "").toLowerCase())) {
        return pagePath;
      }
    }
  }

  return undefined;
}

/** Check if an operation is structural (should run in all pages). */
function isStructuralOperation(op: ContentOp): boolean {
  const structuralPatterns = [
    "Replace with a",
    "Replace with the",
    "Your Name",
    "Replace with",
    "@handle",
    "Replace this",
  ];
  return structuralPatterns.some((p) => op.match instanceof RegExp
    ? op.match.test(p)
    : op.match?.includes(p));
}

/** Get standard content ops for a family. */
function getStandardOps(familyId: string, archetype: string): ContentOp[] {
  // Map family to ops
  const opsMap: Record<string, ContentOp[]> = {
    portfolio: PORTFOLIO_OPS,
    agency: AGENCY_OPS,
    startup: STARTUP_OPS,
    blog: BLOG_OPS,
    documentation: DOCUMENTATION_OPS,
    personal: PORTFOLIO_OPS,
    restaurant: RESTAURANT_OPS,
    saas: SAAS_OPS,
    social: SOCIAL_NETWORK_OPS,
    "mobile-social": MOBILE_SOCIAL_OPS,
    "mobile-finance": MOBILE_FINANCE_OPS,
    "mobile-ecommerce": MOBILE_ECOMMERCE_OPS,
    "ai-video-editor": AI_AGENT_OPS,
    ecommerce: ECOMMERCE_OPS,
  };

  return opsMap[familyId] || PORTFOLIO_OPS;
}

/** Add architecture-specific content operations. */
function addArchitectureSpecificOps(
  architecture: ProductArchetypeArchitecture,
  familyId: string
): ArchitectureContentOp[] {
  const ops: ArchitectureContentOp[] = [];

  // Add ops for each page in the architecture
  if (architecture.pages) {
    for (const [pagePath, pageSpec] of Object.entries(architecture.pages)) {
      // Add page title replacement op
      ops.push({
        match: `Title: \${PAGE_TITLE}`,
        values: [pageSpec.title],
        targetPage: pagePath,
      });

      // Add hero section content if present
      if (pageSpec.sections.includes("hero") || pagePath === "/") {
        ops.push({
          match: "Replace with a compelling hero message",
          values: generateHeroContent(pageSpec, familyId),
          targetPage: pagePath,
        });
      }

      // Add CTA op if present
      if (pageSpec.actions.some((a) => a.label.toLowerCase().includes("cta") ||
          pageSpec.sections.includes("cta"))) {
        ops.push({
          match: "Replace with CTA action text",
          values: generateCTAContent(pageSpec, familyId),
          targetPage: pagePath,
        });
      }

      // Add form-related ops if page has forms
      if (pageSpec.actions.some((a) => a.handler === "submit")) {
        ops.push({
          match: "Replace with form submission success message",
          values: generateSuccessMessage(pageSpec, familyId),
          targetPage: pagePath,
        });
      }
    }
  }

  // Add overall product-level ops
  if (architecture.authFlow !== "none") {
    ops.push({
      match: "Replace with auth flow description",
      values: [authFlowToContent(architecture.authFlow)],
      replaceInAllPages: true,
    });
  }

  // Add state placeholders if not present
  if (architecture.states) {
    const hasLoading = architecture.states.loading !== false;
    const hasEmpty = architecture.states.empty !== false;
    const hasError = architecture.states.error !== null && architecture.states.error !== undefined;

    if (hasLoading) {
      ops.push({
        match: "PLACEHOLDER_LOADING_STATE",
        values: [generateLoadingStateContent(architecture)],
        replaceInAllPages: true,
      });
    }
    if (hasEmpty) {
      ops.push({
        match: "PLACEHOLDER_EMPTY_STATE",
        values: [generateEmptyStateContent(architecture)],
        replaceInAllPages: true,
      });
    }
    if (hasError) {
      ops.push({
        match: "PLACEHOLDER_ERROR_STATE",
        values: [generateErrorStateContent(architecture)],
        replaceInAllPages: true,
      });
    }
  }

  return ops;
}

/** Generate hero content based on page and family. */
function generateHeroContent(
  pageSpec: ProductArchetypeArchitecture["pages"][keyof ProductArchetypeArchitecture["pages"]],
  familyId: string
): string[] {
  // Use family-specific hero content
  const familyHeroes: Record<string, string[]> = {
    portfolio: [
      "I help bring your ideas to life through clean code and thoughtful design.",
      "Building tools that help developers ship better software faster.",
      "VLSI engineer designing verification flows for AI accelerators.",
    ],
    saas: [
      "Transform your workflow with AI-powered automation.",
      "Streamline your team's productivity with intelligent workflows.",
      "The all-in-one platform for modern teams to build and grow.",
    ],
    ecommerce: [
      "Discover curated products crafted with care and quality.",
      "Shop high-quality items at great prices with free shipping.",
      "Your style, your story — find pieces that express who you are.",
    ],
    social: [
      "Share your story with the world and connect with friends.",
      "What's on your mind? Start the conversation today.",
      "Join thousands of creators sharing their passion.",
    ],
    restaurant: [
      "Sourced from local farms, crafted with passion, served with pride.",
      "Book your table tonight and experience culinary excellence.",
      "Taste the season — our menu changes with the freshest ingredients.",
    ],
    "ai-video-editor": [
      "Turn your raw footage into polished videos with AI assistance.",
      "From recording to export — AI handles the heavy lifting.",
      "Create professional-quality videos in minutes, not hours.",
    ],
  };

  const heroes = familyHeroes[familyId];
  return heroes || [
    "Welcome to our product — designed to help you achieve your goals.",
    "Your journey starts here — explore our features and get started.",
  ];
}

/** Generate CTA content based on page and family. */
function generateCTAContent(
  pageSpec: ProductArchetypeArchitecture["pages"][keyof ProductArchetypeArchitecture["pages"]],
  familyId: string
): string[] {
  const ctas: Record<string, string[]> = {
    portfolio: [
      "View my work",
      "Get in touch",
      "Hire me for your next project",
    ],
    saas: [
      "Get started free",
      "View demo",
      "Talk to sales",
    ],
    ecommerce: [
      "Add to cart",
      "Shop now",
      "Checkout",
    ],
    social: [
      "Post now",
      "Share",
      "Follow",
    ],
    restaurant: [
      "Make reservation",
      "View menu",
      "Order now",
    ],
    "ai-video-editor": [
      "Start editing",
      "Export video",
      "Generate with AI",
    ],
  };

  return ctas[familyId] || ["Learn more", "Get started"];
}

/** Generate success message based on page and family. */
function generateSuccessMessage(
  pageSpec: ProductArchetypeArchitecture["pages"][keyof ProductArchetypeArchitecture["pages"]],
  familyId: string
): string[] {
  const successes: Record<string, string[]> = {
    portfolio: [
      "Project added to your portfolio",
      "Message sent successfully",
      "Contact form submitted",
    ],
    saas: [
      "Project created",
      "Settings saved",
      "Team invited",
    ],
    ecommerce: [
      "Item added to cart",
      "Order confirmed",
      "Payment processed",
    ],
    social: [
      "Post published",
      "Followed user",
      "Comment added",
    ],
    restaurant: [
      "Reservation confirmed",
      "Order placed",
      "Review posted",
    ],
    "ai-video-editor": [
      "Clip added to timeline",
      "AI segment generated",
      "Export started",
    ],
  };

  return successes[familyId] || ["Success", "Completed", "Done"];
}

/** Generate loading state content based on architecture. */
function generateLoadingStateContent(
  architecture: ProductArchetypeArchitecture
): string {
  const templates: Record<string, string> = {
    portfolio: "Loading projects...",
    saas: "Loading KPIs...",
    ecommerce: "Loading products...",
    social: "Loading feed...",
    restaurant: "Loading menu...",
    "ai-video-editor": "Loading timeline...",
  };

  return templates[architecture.name] || "Loading...";
}

/** Generate empty state content based on architecture. */
function generateEmptyStateContent(
  architecture: ProductArchetypeArchitecture
): string {
  const templates: Record<string, string> = {
    portfolio: "No projects yet. Start by adding your first project.",
    saas: "No data available. Start by creating your first project.",
    ecommerce: "No products found. Start by adding items to your store.",
    social: "No posts yet. Be the first to share something!",
    restaurant: "No menu items available. Check back later.",
    "ai-video-editor": "No clips in timeline. Add videos to get started.",
  };

  return templates[architecture.name] || "No content available.";
}

/** Generate error state content based on architecture. */
function generateErrorStateContent(
  architecture: ProductArchetypeArchitecture
): string {
  const templates: Record<string, string> = {
    portfolio: "Failed to load. Please try again.",
    saas: "Failed to load data. Please refresh or try again.",
    ecommerce: "Failed to load products. Please try again.",
    social: "Failed to load feed. Please try again.",
    restaurant: "Failed to load menu. Please try again.",
    "ai-video-editor": "Failed to load timeline. Please try again.",
  };

  return templates[architecture.name] || "An error occurred.";
}

/** Convert auth flow to content. */
function authFlowToContent(flow: string): string {
  const mappings: Record<string, string> = {
    "none": "No authentication required",
    "email-passcode": "Sign in with email and passcode",
    "email-otp": "Sign in with email OTP verification",
    "social": "Sign in with Google, GitHub, or Twitter",
    "magic-link": "Sign in with magic link sent to email",
  };
  return mappings[flow] || "Authentication required";
}

/** Extract user context from prompt for journey generation. */
export function userContextFromPrompt(prompt: string): {
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  goals?: string[];
  preferences?: string[];
} {
  const lower = prompt.toLowerCase();
  const context: {
    experienceLevel?: "beginner" | "intermediate" | "advanced";
    goals?: string[];
    preferences?: string[];
  } = {};

  // Detect experience level
  if (lower.includes("beginner") || lower.includes("new to") || lower.includes("first time")) {
    context.experienceLevel = "beginner";
  } else if (lower.includes("advanced") || lower.includes("expert") || lower.includes("professional")) {
    context.experienceLevel = "advanced";
  } else {
    context.experienceLevel = "intermediate";
  }

  // Extract goals
  const goalPatterns = [
    "create", "build", "launch", "design", "setup", "configure",
    "optimize", "migrate", "integrate", "automate",
  ];
  context.goals = goalPatterns
    .filter((g) => lower.includes(g))
    .map((g) => g.replace(/^(.)/, (s) => s.toUpperCase()).slice(1));

  // Extract preferences
  const preferencePatterns = [
    "dark mode", "light mode", "minimal", "modern", "clean",
    "professional", "creative", "simple", "feature-rich",
  ];
  context.preferences = preferencePatterns
    .filter((p) => lower.includes(p))
    .map((p) => p.replace(/-/g, " ").trim());

  return context;
}

export default {
  enrichContentWithArchitecture,
  getArchitectureOps,
  findRelevantPageForOp,
  isStructuralOperation,
  getStandardOps,
  addArchitectureSpecificOps,
  generateHeroContent,
  generateCTAContent,
  generateSuccessMessage,
  generateLoadingStateContent,
  generateEmptyStateContent,
  generateErrorStateContent,
  authFlowToContent,
  userContextFromPrompt,
};