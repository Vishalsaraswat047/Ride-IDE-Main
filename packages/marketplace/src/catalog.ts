import { OFFICIAL_PLUGINS, PLUGIN_CATEGORY_META } from "@ride/plugins";
import type { MarketplaceListing } from "./schema.js";

/**
 * ─── Catalog ────────────────────────────────────────────────────────────────
 *
 * Seed catalog: every official RIDE plugin listed FREE (section 24 of the
 * brief — creation shouldn't be paywalled), plus sample third-party paid
 * listings at the brief's reference prices:
 *   templates ₹499 · components ₹199 · plugins ₹999
 *   integrations ₹1,999 · starter kits ₹2,999
 */

const RIDE_STORE = "ride-store";
const STAMP = Date.now();

function officialPluginListings(): MarketplaceListing[] {
  return OFFICIAL_PLUGINS.map((m, i) => ({
    id: `listing-${m.id}`,
    kind: "plugin" as const,
    title: m.displayName,
    description: m.description,
    category: m.category,
    pricePaise: 0,
    currency: "INR",
    creatorId: RIDE_STORE,
    creatorName: "RIDE Official",
    manifestId: m.id,
    framework: "",
    status: "published" as const,
    verified: true,
    rating: 4.9 - (i % 5) * 0.1,
    ratingCount: 120 + i * 37,
    installCount: 340 + i * 91,
    version: m.version,
    tags: m.tags,
    createdAt: STAMP - (OFFICIAL_PLUGINS.length - i) * 86_400_000,
    updatedAt: STAMP,
  }));
}

function paidListings(): MarketplaceListing[] {
  const t = (id: string, kind: MarketplaceListing["kind"], title: string, description: string, category: string, pricePaise: number, creatorId: string, creatorName: string, framework: string, tags: string[], daysAgo: number, rating: number, count: number): MarketplaceListing => ({
    id,
    kind,
    title,
    description,
    category,
    pricePaise,
    currency: "INR",
    creatorId,
    creatorName,
    framework,
    status: "published",
    verified: false,
    rating,
    ratingCount: count,
    installCount: 0,
    version: "1.0.0",
    tags,
    createdAt: STAMP - daysAgo * 86_400_000,
    updatedAt: STAMP - daysAgo * 86_400_000,
  });

  return [
    // Templates ₹499 / ₹2,999
    t("lst-tpl-saas-dash", "template", "SaaS Dashboard", "Admin dashboard with charts, tables, settings and dark mode.", "web", 49900, "cre-sahil", "Sahil Kumar", "React + Tailwind", ["saas", "dashboard", "admin"], 41, 4.8, 127),
    t("lst-tpl-storefront", "template", "Storefront Pro", "Full e-commerce storefront: product grid, cart drawer, checkout flow.", "ecommerce", 299900, "cre-priya", "Priya Sharma", "React + Tailwind", ["ecommerce", "store"], 23, 4.7, 64),
    t("lst-tpl-portfolio", "template", "Portfolio Pro", "Modern portfolio with smooth scroll animations and a blog.", "web", 49900, "cre-aria", "Aria Designs", "React + Tailwind", ["portfolio"], 88, 4.6, 342),
    t("lst-tpl-course", "template", "Course Platform Kit", "Online course platform: lesson pages, progress, subscriptions.", "education", 299900, "cre-rahul", "Rahul Verma", "React + Tailwind", ["courses", "education"], 12, 4.9, 28),
    // Components ₹199
    t("lst-comp-pricing", "component", "Pricing Table Pack", "12 pricing tier layouts with toggles and feature lists.", "web", 19900, "cre-aria", "Aria Designs", "React", ["components", "pricing"], 30, 4.5, 210),
    t("lst-comp-forms", "component", "Form Builder Components", "Validation-ready form components with loading states.", "web", 19900, "cre-neo", "Neo Labs", "React", ["components", "forms"], 18, 4.4, 156),
    // Plugins ₹999
    t("lst-plg-subscriptions", "plugin", "Advanced Subscription Manager", "Trial periods, plan switching, proration, dunning emails.", "payments", 99900, "cre-neo", "Neo Labs", "", ["payments", "subscriptions"], 9, 4.6, 41),
    t("lst-plg-referrals", "plugin", "Referral & Coupons Plugin", "Referral codes, coupon engine and loyalty points.", "ecommerce", 99900, "cre-priya", "Priya Sharma", "", ["ecommerce", "coupons"], 15, 4.3, 19),
    // Integrations ₹1,999
    t("lst-int-whatsapp-store", "integration", "WhatsApp Store Automation", "Order updates, abandoned-cart recovery and OTP via WhatsApp.", "communication", 199900, "cre-rahul", "Rahul Verma", "", ["whatsapp", "automation"], 7, 4.8, 33),
    t("lst-int-multi-gateway", "integration", "Multi-Gateway Payments", "Razorpay + Stripe + Cashfree with one unified checkout.", "payments", 199900, "cre-neo", "Neo Labs", "", ["payments"], 5, 4.7, 22),
    // Starter kits ₹2,999
    t("lst-kit-saas", "starter-kit", "SaaS Starter Kit", "Auth, billing, team seats, admin and docs — production-ready base.", "web", 299900, "cre-sahil", "Sahil Kumar", "React + Node + Postgres", ["saas", "starter"], 20, 4.9, 87),
    t("lst-kit-marketplace", "starter-kit", "Marketplace Starter Kit", "Vendor onboarding, payouts, commissions and catalog.", "ecommerce", 299900, "cre-priya", "Priya Sharma", "React + Node + Postgres", ["marketplace", "ecommerce"], 11, 4.8, 52),
  ];
}

export const CATALOG: MarketplaceListing[] = [...officialPluginListings(), ...paidListings()];

export function getListing(id: string): MarketplaceListing | undefined {
  return CATALOG.find((l) => l.id === id);
}

export function listingForManifest(manifestId: string): MarketplaceListing | undefined {
  return CATALOG.find((l) => l.manifestId === manifestId);
}

/** Category options for the browse UI, derived from the plugin taxonomy. */
export const BROWSE_CATEGORIES: Array<{ id: string; label: string }> = [
  ...Object.entries(PLUGIN_CATEGORY_META).map(([id, meta]) => ({ id, label: meta.label })),
  { id: "web", label: "Web" },
  { id: "education", label: "Education" },
  { id: "all", label: "All" },
];

export function totalMarketplaceValuePaise(): number {
  return CATALOG.filter((l) => l.pricePaise > 0).reduce((sum, l) => sum + l.pricePaise, 0);
}