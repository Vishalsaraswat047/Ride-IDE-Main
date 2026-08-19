import type { Row } from "./dbenv.js";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function money(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function moneyCompact(paise: number): string {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function fmtTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtDay(ms: number): string {
  return new Date(Number(ms)).toLocaleDateString([], { day: "2-digit", month: "short" });
}

export function dayStart(offsetDays = 0): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() - offsetDays * DAY_MS;
}

export function daysAgo(n: number): number {
  return Date.now() - n * DAY_MS;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function pageFrom(reqQuery: Record<string, unknown>): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, Number(reqQuery.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(5, Number(reqQuery.pageSize ?? 25) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function sliceRows<T>(rows: T[], offset: number, pageSize: number): { items: T[]; total: number } {
  return { items: rows.slice(offset, offset + pageSize), total: rows.length };
}

export function sumPaise(rows: Row[], key: string): number {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}
