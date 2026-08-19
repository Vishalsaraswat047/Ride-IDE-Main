export interface ApiError {
  error?: string;
  status?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-RIDE-Master": "1",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("ride-master:unauthorized"));
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as ApiError;
      if (body.error) message = body.error;
    } catch {
      /* non-JSON */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
};

export function fmtTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(Number(ms));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtDay(ms: number): string {
  return new Date(Number(ms)).toLocaleDateString([], { day: "2-digit", month: "short" });
}

export function money(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function moneyCompact(paise: number): string {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export type StatusTone = "ok" | "error" | "warn" | "mute" | "accent";

export function toneOf(status: string, okWhen: string[] = ["live", "success", "active", "captured", "published", "paid", "released", "completed", "accepted", "configured"]): StatusTone {
  if (okWhen.includes(status)) return "ok";
  if (["failed", "error", "rejected", "refunded", "revoked", "rolled_back", "suspended", "failed"].includes(status)) return "error";
  if (["pending", "building", "deploying", "processing", "in_review", "in_development", "planned", "review", "invited", "draft", "expired"].includes(status)) return "warn";
  return "mute";
}