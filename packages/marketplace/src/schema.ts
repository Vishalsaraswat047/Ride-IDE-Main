import { z } from "zod";
import { PluginCategorySchema } from "@ride/plugins";

/**
 * ─── RIDE marketplace contract ─────────────────────────────────────────────
 *
 * Listings for plugins AND templates (section 25 of the brief). Every sale
 * splits 30% to RIDE and 70% to the creator. Official RIDE plugins are free;
 * third-party creators price their own work.
 */

/** RIDE keeps 30%; creators receive 70% (paise math keeps it integer-safe). */
export const RIDE_COMMISSION_RATE = 0.3;
export const CREATOR_RATE = 1 - RIDE_COMMISSION_RATE;

export const MarketplaceKindSchema = z.enum(["plugin", "template", "component", "integration", "starter-kit"]);
export type MarketplaceKind = z.infer<typeof MarketplaceKindSchema>;

export const MarketplaceListingStatusSchema = z.enum(["pending", "published", "rejected"]);
export type MarketplaceListingStatus = z.infer<typeof MarketplaceListingStatusSchema>;

/** Full listing: a sellable plugin or template on the RIDE store. */
export const MarketplaceListingSchema = z.object({
  id: z.string(),
  kind: MarketplaceKindSchema,
  title: z.string(),
  description: z.string(),
  category: z.union([PluginCategorySchema, z.string()]),
  /** Price in paise. 0 = free. */
  pricePaise: z.number().default(0),
  currency: z.string().default("INR"),
  creatorId: z.string(),
  creatorName: z.string().default("RIDE Store"),
  /** When set, this listing installs an official plugin bundle. */
  manifestId: z.string().optional(),
  /** When set, this listing is a template bundle (framework + files). */
  bundleRef: z.string().optional(),
  framework: z.string().default(""),
  status: MarketplaceListingStatusSchema.default("published"),
  verified: z.boolean().default(false),
  rating: z.number().default(0),
  ratingCount: z.number().default(0),
  installCount: z.number().default(0),
  version: z.string().default("1.0.0"),
  tags: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type MarketplaceListing = z.infer<typeof MarketplaceListingSchema>;

/** A completed sale. The split is recorded at purchase time. */
export const PurchaseRecordSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  buyerId: z.string(),
  orderId: z.string(),
  pricePaise: z.number(),
  taxPaise: z.number().default(0),
  commissionPaise: z.number(),
  creatorPaise: z.number(),
  status: z.enum(["pending", "captured", "refunded"]).default("captured"),
  createdAt: z.number(),
});
export type PurchaseRecord = z.infer<typeof PurchaseRecordSchema>;

/** Earnings ledger entry for a creator. */
export const EarningsRecordSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  purchaseId: z.string(),
  amountPaise: z.number(),
  status: z.enum(["pending", "paid", "refunded"]).default("pending"),
  createdAt: z.number(),
});
export type EarningsRecord = z.infer<typeof EarningsRecordSchema>;

export function splitPrice(pricePaise: number): { commissionPaise: number; creatorPaise: number } {
  const commissionPaise = Math.round(pricePaise * RIDE_COMMISSION_RATE);
  return { commissionPaise, creatorPaise: pricePaise - commissionPaise };
}

export function formatPrice(pricePaise: number, currency = "INR"): string {
  if (pricePaise === 0) return "Free";
  if (currency === "INR") return `₹${(pricePaise / 100).toLocaleString("en-IN")}`;
  return `${currency} ${(pricePaise / 100).toFixed(2)}`;
}