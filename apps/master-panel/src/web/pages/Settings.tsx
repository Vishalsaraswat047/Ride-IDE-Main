import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, fmtTime } from "../api";
import { Badge, Card, ErrorBox, PageHeader, Spinner } from "../ui";

interface SettingsData {
  admin: { id: string; email: string; name: string; role: string };
  admins: Array<{ id: string; email: string; display_name: string; role: string; created_at: number; last_login_at: number | null }>;
  sessions: Array<{ token: string; admin_id: string; email: string; display_name: string; created_at: number; expires_at: number; ip: string; revoked: number }>;
  gatewayProvider: string;
  commissionRate: number;
  dataDir: string;
}

export function SettingsPage(): React.ReactElement {
  const [data, setData] = useState<SettingsData | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    void api.get<SettingsData>("/api/master/settings")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(load, []);

  const revoke = async (token: string) => {
    try {
      await api.post(`/api/master/sessions/${encodeURIComponent(token)}/revoke`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!data && !error) return <Spinner label="Loading settings…" />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Administration, security, payments and marketplace configuration" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Admin profile">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ember/15 text-ember">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-ink">{data?.admin.name}</p>
              <p className="text-[12px] text-mute">{data?.admin.email} · {data?.admin.role}</p>
            </div>
          </div>
        </Card>

        <Card title="Configuration">
          <div className="flex flex-col gap-1.5 text-[12px]">
            <p>Payment gateway: <span className="font-semibold text-ink">{data?.gatewayProvider}</span></p>
            <p>Marketplace commission: <span className="font-semibold text-ink">{(data?.commissionRate ?? 0) * 100}% RIDE / 70% creator</span></p>
            <p>Database: <span className="font-mono text-[11px] text-body">{data?.dataDir}</span></p>
          </div>
        </Card>

        <Card title="Admin accounts">
          {data?.admins.length === 0 ? (
            <p className="text-[12px] text-mute">No admin accounts.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data?.admins.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-[12px]">
                  <span className="font-medium text-ink">{a.email}</span>
                  <Badge text={a.role} tone="accent" />
                  <span className="ml-auto text-[11px] text-mute">last login {fmtTime(a.last_login_at)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-mute">
            Password changes and new admin accounts are managed from the terminal bootstrap (RIDE_ADMIN_EMAIL / RIDE_ADMIN_PASSWORD) — adding a
            password-change flow is a follow-up.
          </p>
        </Card>

        <Card title="Admin sessions">
          <div className="flex flex-col gap-2">
            {data?.sessions.map((s) => (
              <div key={s.token} className="flex items-center gap-2 text-[12px]">
                <span className="text-body">{s.email}</span>
                <span className="font-mono text-[10.5px] text-mute">{s.token.slice(0, 8)}…</span>
                <span className="text-[11px] text-mute">{s.ip || "local"}</span>
                <span className="ml-auto text-[11px] text-mute">expires {fmtTime(s.expires_at)}</span>
                {!s.revoked ? (
                  <button type="button" onClick={() => void revoke(s.token)} className="text-[11px] text-error hover:underline">
                    Revoke
                  </button>
                ) : (
                  <Badge text="revoked" tone="mute" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="mt-3 text-[11.5px] text-mute">
        Security notes: sessions expire after 12 hours, cookies are HttpOnly + SameSite=Strict, mutating requests require the X-RIDE-Master guard
        header, and every administrative action is written to the audit log.
      </p>
    </div>
  );
}