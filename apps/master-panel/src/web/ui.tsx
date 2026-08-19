import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fmtDay, moneyCompact, toneOf, type StatusTone } from "./api";

const toneCls: Record<StatusTone, string> = {
  ok: "bg-link/10 text-link",
  error: "bg-error/10 text-error",
  warn: "bg-warning/10 text-warning",
  mute: "bg-hairline/60 text-mute",
  accent: "bg-ember/10 text-ember",
};

export function Badge({ text, tone }: { text: string; tone?: StatusTone }): ReactNode {
  const t = tone ?? toneOf(text);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${toneCls[t]}`}>
      {t === "ok" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {t === "error" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {text}
    </span>
  );
}

export function Card({ title, children, className = "", actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }): ReactNode {
  return (
    <div className={`rounded-lg border border-hairline bg-canvas-soft ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-3.5 py-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-mute">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-3.5">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, sub, tone = "mute" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: StatusTone }): ReactNode {
  const dot = tone === "ok" ? "bg-link" : tone === "error" ? "bg-error" : tone === "warn" ? "bg-warning" : "bg-mute";
  return (
    <div className="rounded-lg border border-hairline bg-canvas-soft px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="text-[10.5px] font-medium uppercase tracking-wider text-mute">{label}</p>
      </div>
      <p className="mt-1.5 text-[22px] font-semibold leading-7 text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-mute">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }): ReactNode {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[17px] font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12px] text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Table<T extends { id: string | number }>({ columns, rows, onRowClick, empty }: {
  columns: Array<{ key: string; label: string; render?: (row: T) => ReactNode; className?: string }>;
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}): ReactNode {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-hairline px-4 py-10 text-center">
        {empty ?? <p className="text-[12px] text-mute">No data yet — nothing recorded in the database for this view.</p>}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline bg-canvas-soft">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((c) => (
              <th key={c.key} className={`whitespace-nowrap px-3.5 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-mute ${c.className ?? ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-hairline/60 last:border-0 ${onRowClick ? "cursor-pointer transition-colors hover:bg-canvas-soft2" : ""}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-3.5 py-2 text-[12px] text-body ${c.className ?? ""}`}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Spinner({ label }: { label?: string }): ReactNode {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-mute">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-[12px]">{label ?? "Loading…"}</span>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }): ReactNode {
  return <div className="rounded-lg border border-error/30 bg-error/10 px-3.5 py-2.5 text-[12px] text-error">{message}</div>;
}

export function Note({ children }: { children: ReactNode }): ReactNode {
  return <p className="rounded-lg border border-hairline bg-canvas-soft px-3 py-2 text-[11.5px] leading-5 text-mute">{children}</p>;
}

export function Btn({ children, onClick, variant = "ghost", disabled, title }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  title?: string;
}): ReactNode {
  const cls =
    variant === "primary"
      ? "bg-primary text-on-primary hover:opacity-85"
      : variant === "danger"
        ? "border border-error/40 bg-error/10 text-error hover:bg-error/20"
        : "border border-hairline bg-canvas-soft2 text-body hover:text-ink";
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

export function BarChart({ data, height = 120, moneyMode = false }: { data: Array<{ day: number; value: number }>; height?: number; moneyMode?: boolean }): ReactNode {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(2, Math.round((d.value / max) * height));
          return (
            <div key={d.day} className="group relative flex-1" title={`${fmtDay(d.day)} — ${moneyMode ? moneyCompact(d.value) : d.value.toLocaleString()}`}>
              <div className="w-full rounded-t-[2px] bg-link/40 transition-colors group-hover:bg-ember" style={{ height: h }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[9.5px] text-mute">
        <span>{fmtDay(data[0]?.day ?? 0)}</span>
        <span>{fmtDay(data[data.length - 1]?.day ?? 0)}</span>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: Array<{ id: T; label: string; count?: number }>; active: T; onChange: (t: T) => void }): ReactNode {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1 border-b border-hairline pb-0">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`-mb-px rounded-t-sm border-b-2 px-3 py-2 text-[12px] font-medium transition-colors ${active === t.id ? "border-ember text-ink" : "border-transparent text-mute hover:text-body"}`}
        >
          {t.label}
          {typeof t.count === "number" && t.count > 0 && <span className="ml-1.5 text-[10.5px] text-mute">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }): ReactNode {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search…"}
      className="h-7 w-56 rounded-sm border border-hairline bg-canvas-soft2 px-2.5 text-[12px] text-ink placeholder:text-mute focus:border-hairline-strong"
    />
  );
}

export function SelectInput<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: string; label: string }> }): ReactNode {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-7 rounded-sm border border-hairline bg-canvas-soft2 px-2 text-[12px] text-body"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || "dashboard");
  useEffect(() => {
    const onHash = () => setHash(window.location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

export function nav(hash: string): void {
  window.location.hash = hash;
}