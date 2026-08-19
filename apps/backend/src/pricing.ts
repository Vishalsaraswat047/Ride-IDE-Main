export type Region = "in" | "intl";

const GST_RATE = 0.18;

function computeTax(amountMinor: number): number {
  return Math.round(amountMinor * GST_RATE);
}

export type PlanKind = "student" | "developer" | "team" | "agency" | "enterprise";

export interface PlanPrice {
  /** Minor units: paise (INR) or cents (USD). */
  inPaise: number;
  intlMinor: number;
  currencyIn: "INR";
  currencyIntl: "USD";
  period: "project" | "seat_month" | "month" | "custom";
  minimumSeats?: number;
}

export interface Plan {
  kind: PlanKind;
  name: string;
  tagline: string;
  /** What the plan gates — project shipping (export/production) or workspace access. */
  price: PlanPrice;
  features: string[];
}

/**
 * RIDE pricing ladder:
 *   Student  → ₹49/project  (verified university students)
 *   Developer→ ₹99/project IN · $2/project intl
 *   Team     → ₹399/seat/mo IN · $5/seat/mo intl (min 2 seats)
 *   Agency   → ₹4,999/mo IN · $59/mo intl (up to 10 members, extra seats)
 *   Enterprise→ custom
 *
 * Everything is built for free — you pay only when shipping a project to
 * production/export, or per seat/month on shared workspaces.
 */
export const PLANS: readonly Plan[] = [
  {
    kind: "student",
    name: "RIDE Student",
    tagline: "For verified university/college students. Full RIDE, half the shipping price.",
    price: { inPaise: 4900, intlMinor: 100, currencyIn: "INR", currencyIntl: "USD", period: "project" },
    features: [
      "AI coding agent",
      "Unlimited project creation",
      "Free templates",
      "Full IDE + preview",
      "*.ride.in shareable previews",
      "AI-assisted development",
      "No AI-token charges, no subscription",
      "Pay ₹49 per project when shipping",
    ],
  },
  {
    kind: "developer",
    name: "Individual Developer",
    tagline: "Build for free. Pay ₹99/project (or $2) only when taking a project to production.",
    price: { inPaise: 9900, intlMinor: 200, currencyIn: "INR", currencyIntl: "USD", period: "project" },
    features: [
      "Everything in Student",
      "Pay per shipped project",
      "No subscription, no token packages",
    ],
  },
  {
    kind: "team",
    name: "Team",
    tagline: "Shared workspace for small teams — humans and AI agents build together.",
    price: { inPaise: 39900, intlMinor: 500, currencyIn: "INR", currencyIntl: "USD", period: "seat_month", minimumSeats: 2 },
    features: [
      "Shared workspace + projects",
      "Real-time collaboration + presence",
      "Roles & permissions",
      "Shared AI context + AI task delegation",
      "Git/GitHub, branches + PRs, code review",
      "Comments & mentions",
      "Shared components/design system",
      "Environment/secrets management",
      "Deployment approval + rollback",
      "Team project history",
    ],
  },
  {
    kind: "agency",
    name: "Agency",
    tagline: "For agencies building products for multiple clients.",
    price: { inPaise: 499900, intlMinor: 5900, currencyIn: "INR", currencyIntl: "USD", period: "month" },
    features: [
      "Up to 10 members",
      "Multiple client workspaces",
      "Unlimited projects",
      "Client collaboration + preview links",
      "White-label options",
      "Agency template + shared component library",
      "Advanced permissions, project transfer, client handoff",
      "Deployment management",
      "Priority support",
      "Additional seats: ₹399/seat or $5/seat",
    ],
  },
  {
    kind: "enterprise",
    name: "Enterprise",
    tagline: "Custom pricing for large teams, universities, companies and government.",
    price: { inPaise: 0, intlMinor: 0, currencyIn: "INR", currencyIntl: "USD", period: "custom" },
    features: [
      "SSO/SAML, SCIM, advanced RBAC",
      "Organization administration + audit logs",
      "Security controls, private deployment, dedicated infrastructure",
      "Custom integrations, SLA, priority support",
      "Procurement/invoicing, custom AI/model deployment",
      "Data residency options",
    ],
  },
];

export function getPlan(kind: PlanKind): Plan {
  const plan = PLANS.find((p) => p.kind === kind);
  if (!plan) throw new Error(`Unknown plan: ${kind}`);
  return plan;
}

export interface PricedPlan extends Plan {
  priceMinor: number;
  currency: "INR" | "USD";
  symbol: string;
  taxMinor: number;
  /** Human label: "₹49 / project" or "$2 / project". */
  display: string;
  /** Invoice number prefix, e.g. "₹49" / "$2". */
  short: string;
}

export function regionFor(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): Region {
  const header = pickHeader(req.headers["x-region"] ?? req.headers["region"]);
  if (header === "intl" || header === "us" || header === "global") return "intl";
  if (process.env.RIDE_REGION === "intl") return "intl";
  return "in";
}

function pickHeader(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function priceFor(planKind: PlanKind, region: Region): PricedPlan {
  const plan = getPlan(planKind);
  const intl = region === "intl";
  const priceMinor = intl ? plan.price.intlMinor : plan.price.inPaise;
  const currency = intl ? plan.price.currencyIntl : plan.price.currencyIn;
  const symbol = intl ? "$" : "₹";
  const taxMinor = currency === "INR" ? computeTax(priceMinor) : Math.round(priceMinor * 0.18);
  const per =
    plan.price.period === "seat_month" ? " / seat / month" : plan.price.period === "month" ? " / month" : plan.price.period === "project" ? " / project" : "";
  const fmt = intl ? (priceMinor / 100).toFixed(priceMinor % 100 === 0 ? 0 : 2) : (priceMinor / 100).toLocaleString("en-IN");
  return {
    ...plan,
    priceMinor,
    currency,
    symbol,
    taxMinor,
    display: `${symbol}${fmt}${per}`,
    short: `${symbol}${fmt}`,
  };
}

/** Seat example table (Team plan) for docs/UI — mirrors the pricing page. */
export function teamSeatExamples(region: Region): Array<{ seats: number; label: string; total: string }> {
  const intl = region === "intl";
  const seats = [2, 3, 5, 10, 20];
  return seats.map((n) => {
    const per = intl ? 5 : 399;
    const total = per * n;
    const fmt = intl ? `$${total}` : `₹${total.toLocaleString("en-IN")}`;
    return { seats: n, label: fmt, total: `${fmt}/mo` };
  });
}