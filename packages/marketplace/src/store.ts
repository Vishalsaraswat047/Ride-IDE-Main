import { randomUUID } from "node:crypto";
import { getListing, listingForManifest } from "./catalog.js";
import { splitPrice } from "./schema.js";
import type { EarningsRecord, MarketplaceListing, PurchaseRecord } from "./schema.js";

/**
 * ─── Marketplace store ──────────────────────────────────────────────────────
 *
 * Client-side marketplace state: search/browse listings, purchase with the
 * 30/70 split recorded at capture time, creator earnings ledger, and
 * submissions (pending → published/rejected). Purchase "payment" is a
 * checkout-state machine; the ride-cloud backend performs the real gateway
 * capture — the same record shape is used on both sides.
 */

export interface MarketplacePersistence {
  loadPurchases(): PurchaseRecord[];
  savePurchases(purchases: PurchaseRecord[]): void;
  loadEarnings(): EarningsRecord[];
  saveEarnings(earnings: EarningsRecord[]): void;
  loadListings(): MarketplaceListing[];
  saveListings(listings: MarketplaceListing[]): void;
}

export class NoopPersistence implements MarketplacePersistence {
  loadPurchases(): PurchaseRecord[] {
    return [];
  }
  savePurchases(): void {}
  loadEarnings(): EarningsRecord[] {
    return [];
  }
  saveEarnings(): void {}
  loadListings(): MarketplaceListing[] {
    return [];
  }
  saveListings(): void {}
}

export interface SearchOptions {
  query?: string;
  category?: string;
  kind?: string;
  freeOnly?: boolean;
  verifiedOnly?: boolean;
  sortBy?: "popular" | "rating" | "newest" | "price-asc" | "price-desc";
}

export class MarketplaceStore {
  private purchases: PurchaseRecord[] = [];
  private earnings: EarningsRecord[] = [];
  private extraListings: MarketplaceListing[] = [];
  private persistence: MarketplacePersistence;

  constructor(persistence?: MarketplacePersistence) {
    this.persistence = persistence ?? new NoopPersistence();
    this.purchases = this.persistence.loadPurchases();
    this.earnings = this.persistence.loadEarnings();
    this.extraListings = this.persistence.loadListings();
  }

  // ── Browse ───────────────────────────────────────────────────────────────

  allListings(): MarketplaceListing[] {
    return [...this.extraListings, ...getAllCatalog()];
  }

  search(opts: SearchOptions = {}): MarketplaceListing[] {
    const q = opts.query?.toLowerCase().trim() ?? "";
    let out = this.allListings().filter((l) => l.status === "published");
    if (q) {
      out = out.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    if (opts.category && opts.category !== "all") out = out.filter((l) => l.category === opts.category);
    if (opts.kind) out = out.filter((l) => l.kind === opts.kind);
    if (opts.freeOnly) out = out.filter((l) => l.pricePaise === 0);
    if (opts.verifiedOnly) out = out.filter((l) => l.verified);
    switch (opts.sortBy) {
      case "popular":
        out = [...out].sort((a, b) => b.installCount - a.installCount);
        break;
      case "rating":
        out = [...out].sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        out = [...out].sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "price-asc":
        out = [...out].sort((a, b) => a.pricePaise - b.pricePaise);
        break;
      case "price-desc":
        out = [...out].sort((a, b) => b.pricePaise - a.pricePaise);
        break;
    }
    return out;
  }

  getListing(id: string): MarketplaceListing | undefined {
    return this.allListings().find((l) => l.id === id);
  }

  // ── Purchase (30% RIDE / 70% creator) ────────────────────────────────────

  /** Returns null when already purchased or the listing is missing. */
  purchase(listingId: string, buyerId: string, orderId?: string): PurchaseRecord | null {
    const listing = this.getListing(listingId);
    if (!listing || listing.pricePaise < 0) return null;
    if (this.hasPurchased(listingId, buyerId)) return null;

    const { commissionPaise, creatorPaise } = splitPrice(listing.pricePaise);
    const record: PurchaseRecord = {
      id: randomUUID(),
      listingId,
      buyerId,
      orderId: orderId ?? randomUUID(),
      pricePaise: listing.pricePaise,
      taxPaise: 0,
      commissionPaise,
      creatorPaise,
      status: "captured",
      createdAt: Date.now(),
    };
    this.purchases.push(record);
    this.persistence.savePurchases(this.purchases);
    return record;
  }

  hasPurchased(listingId: string, buyerId: string): boolean {
    return this.purchases.some((p) => p.listingId === listingId && p.buyerId === buyerId);
  }

  purchasesBy(buyerId: string): Array<{ purchase: PurchaseRecord; listing?: MarketplaceListing }> {
    return this.purchases
      .filter((p) => p.buyerId === buyerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((purchase) => ({ purchase, listing: this.getListing(purchase.listingId) }));
  }

  // ── Creator side ─────────────────────────────────────────────────────────

  submitListing(input: {
    creatorId: string;
    creatorName?: string;
    kind: MarketplaceListing["kind"];
    title: string;
    description: string;
    category: string;
    pricePaise: number;
    framework?: string;
    manifestId?: string;
    bundleRef?: string;
    version?: string;
    tags?: string[];
  }): MarketplaceListing {
    const listing: MarketplaceListing = {
      id: `lst-${randomUUID().slice(0, 8)}`,
      kind: input.kind,
      title: input.title,
      description: input.description,
      category: input.category,
      pricePaise: input.pricePaise,
      currency: "INR",
      creatorId: input.creatorId,
      creatorName: input.creatorName ?? "Creator",
      manifestId: input.manifestId,
      bundleRef: input.bundleRef,
      framework: input.framework ?? "",
      status: "pending",
      verified: false,
      rating: 0,
      ratingCount: 0,
      installCount: 0,
      version: input.version ?? "1.0.0",
      tags: input.tags ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.extraListings.push(listing);
    this.persistence.saveListings(this.extraListings);
    return listing;
  }

  reviewSubmission(listingId: string, approve: boolean, note = ""): MarketplaceListing | undefined {
    const listing = this.extraListings.find((l) => l.id === listingId);
    if (!listing) return undefined;
    listing.status = approve ? "published" : "rejected";
    listing.updatedAt = Date.now();
    this.persistence.saveListings(this.extraListings);
    return listing;
  }

  /** Creator removes one of their own listings (pending or rejected). */
  deleteListing(listingId: string): boolean {
    const before = this.extraListings.length;
    this.extraListings = this.extraListings.filter((l) => l.id !== listingId);
    if (this.extraListings.length !== before) {
      this.persistence.saveListings(this.extraListings);
      return true;
    }
    return false;
  }

  submissionsBy(creatorId: string): MarketplaceListing[] {
    return this.extraListings.filter((l) => l.creatorId === creatorId);
  }

  /** Pending submissions (admin review queue). */
  pendingSubmissions(): MarketplaceListing[] {
    return this.extraListings.filter((l) => l.status === "pending");
  }

  earningsFor(creatorId: string): {
    totalSalesPaise: number;
    commissionPaise: number;
    creatorPaise: number;
    pendingPaise: number;
    salesCount: number;
  } {
    const sales = this.purchases.filter((p) => {
      const listing = this.getListing(p.listingId);
      return listing?.creatorId === creatorId;
    });
    const total = sales.reduce((s, p) => s + p.pricePaise, 0);
    const commission = sales.reduce((s, p) => s + p.commissionPaise, 0);
    const creator = sales.reduce((s, p) => s + p.creatorPaise, 0);
    const paid = this.earnings.filter((e) => e.creatorId === creatorId && e.status === "paid").reduce((s, e) => s + e.amountPaise, 0);
    return {
      totalSalesPaise: total,
      commissionPaise: commission,
      creatorPaise: creator,
      pendingPaise: Math.max(0, creator - paid),
      salesCount: sales.length,
    };
  }

  /** Free listings never touch money — shortcut for the UI. */
  installFreeListing(listingId: string, buyerId: string): PurchaseRecord | null {
    const listing = this.getListing(listingId);
    if (listing?.pricePaise !== 0) return null;
    return this.purchase(listingId, buyerId);
  }

  /** Resolve the plugin manifest a listing installs. */
  manifestFor(listingId: string): string | undefined {
    return getListing(listingId)?.manifestId ?? listingForManifest(listingId)?.manifestId;
  }
}

import { CATALOG } from "./catalog.js";
function getAllCatalog(): MarketplaceListing[] {
  return CATALOG;
}