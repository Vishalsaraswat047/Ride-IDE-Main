import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api, fmtTime } from "../api";
import { Card, ErrorBox, PageHeader, Spinner, StatCard } from "../ui";

interface DashboardData {
  users: { total: number; newToday: number; newThisWeek: number; newThisMonth: number; active30d: number; active7d: number; creators: number; verifiedStudents: number; suspended: number };
  logins: { total: number; today: number; failed: number; failedToday: number; dau: number; wau: number; mau: number };
  feedback: { new: number; total: number };
}

export function CommunicationsPage(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<DashboardData>("/api/master/dashboard")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!data && !error) return <Spinner label="Loading communications…" />;

  return (
    <div>
      <PageHeader title="Communications" subtitle="Privacy-safe audience overview — no mass-email system is built into the master panel" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="All users" value={data?.users.total.toLocaleString() ?? "—"} />
        <StatCard label="Students" value={data?.users.verifiedStudents.toLocaleString() ?? "—"} tone="ok" />
        <StatCard label="Creators" value={data?.users.creators.toLocaleString() ?? "—"} tone="accent" />
        <StatCard label="Open feedback" value={data?.feedback.new.toLocaleString() ?? "—"} />
      </div>

      <Card title="Announcements">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5 rounded-md border border-hairline bg-canvas-soft2 px-3 py-2.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-mute" />
            <p className="text-[12px] leading-5 text-mute">
              Sending email to thousands of users requires proper mailing infrastructure (a dedicated provider, verified sending domains and
              recipient-safe batching). Drafts and templates can be managed here later — recipient lists should never leave the database as plain
              address dumps.
            </p>
          </div>
          <p className="text-[11px] text-mute">Last system activity: {fmtTime(Date.now())}</p>
        </div>
      </Card>
    </div>
  );
}