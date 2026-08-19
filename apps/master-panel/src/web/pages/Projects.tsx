import { useEffect, useState } from "react";
import { api, fmtTime } from "../api";
import { Badge, Card, ErrorBox, Note, PageHeader, Spinner, StatCard, Table } from "../ui";

interface ProjectRow {
  id: string;
  projectId: string;
  name: string;
  ownerEmail: string;
  ownerName: string;
  ships: number;
  live: number;
  failed: number;
  lastShipAt: number;
  status: string;
  source: string;
}

export function ProjectsPage(): React.ReactElement {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [teamProjects, setTeamProjects] = useState<Array<{ id: string; name: string; createdAt: number; updatedAt: number }>>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ projects: ProjectRow[]; teamProjects: typeof teamProjects; note: string }>("/api/master/projects")
      .then((r) => { setProjects(r.projects); setTeamProjects(r.teamProjects); setNote(r.note); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!projects.length && !teamProjects.length && !error) return <Spinner label="Loading projects…" />;

  const live = projects.filter((p) => p.status === "live").length;

  return (
    <div>
      <PageHeader title="Projects" subtitle={`${projects.length} shipped projects · ${teamProjects.length} team projects · ${live} live`} />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="mb-3"><Note>{note}</Note></div>

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Shipped projects" value={projects.length} />
        <StatCard label="Team projects" value={teamProjects.length} />
        <StatCard label="Live now" value={live} tone="ok" />
        <StatCard label="Failed" value={projects.filter((p) => p.status === "error").length} tone={projects.some((p) => p.status === "error") ? "error" : "mute"} />
      </div>

      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Shipped projects (from deployments)</h3>
      <Table<ProjectRow>
        rows={projects}
        empty={<p className="text-[12px] text-mute">No projects shipped yet.</p>}
        columns={[
          { key: "name", label: "Project", render: (p) => <span className="font-medium text-ink">{p.name}</span> },
          { key: "ownerEmail", label: "Owner", render: (p) => <span>{p.ownerEmail || "—"}</span> },
          { key: "ships", label: "Ships", render: (p) => <span>{p.ships}</span> },
          { key: "live", label: "Live deployments", render: (p) => <span>{p.live}</span> },
          { key: "failed", label: "Failed", render: (p) => <span className={p.failed ? "text-error" : ""}>{p.failed}</span> },
          { key: "lastShipAt", label: "Last shipped", render: (p) => <span>{fmtTime(p.lastShipAt)}</span> },
          { key: "status", label: "Status", render: (p) => <Badge text={p.status} /> },
        ]}
      />

      <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-mute">Team projects</h3>
      <Card>
        {teamProjects.length === 0 ? (
          <p className="text-[12px] text-mute">No team projects yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {teamProjects.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-[12px]">
                <span className="text-ink">{t.name}</span>
                <span className="ml-auto text-mute">created {fmtTime(t.createdAt)} · updated {fmtTime(t.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}