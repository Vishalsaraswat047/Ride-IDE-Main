import { useCallback, useEffect, useState } from "react";
import { Package } from "lucide-react";
import { api, fmtTime } from "../api";
import { Badge, Btn, Card, ErrorBox, PageHeader, Spinner, StatCard, Table } from "../ui";

interface ReleaseRow {
  id: string;
  version: string;
  title: string;
  notes: string;
  status: string;
  usersAffected: number;
  releasedAt: number | null;
  createdAt: number;
}

interface AdoptionRow {
  version: string;
  downloads: number;
  installs: number;
  updates: number;
}

export function ReleasesPage(): React.ReactElement {
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [adoption, setAdoption] = useState<AdoptionRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ version: "", title: "", notes: "" });

  const load = useCallback(() => {
    void api.get<{ releases: ReleaseRow[]; adoption: AdoptionRow[] }>("/api/master/releases")
      .then((r) => { setReleases(r.releases); setAdoption(r.adoption); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(load, [load]);

  const create = async () => {
    setBusy("create");
    try {
      await api.post("/api/master/releases", form);
      setForm({ version: "", title: "", notes: "" });
      setCreating(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  const act = async (id: string, action: "publish" | "rollback") => {
    setBusy(`${id}:${action}`);
    try {
      await api.post(`/api/master/releases/${id}/${action}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  if (!releases.length && !adoption.length && !error) return <Spinner label="Loading releases…" />;

  const latest = releases.find((r) => r.status === "released");
  const previous = releases.filter((r) => r.status === "released" && r.id !== latest?.id);

  return (
    <div>
      <PageHeader
        title="Releases"
        subtitle="Version history, changelogs and update adoption"
        actions={
          <Btn variant="primary" onClick={() => setCreating(!creating)}>
            <Package className="h-3.5 w-3.5" /> New release
          </Btn>
        }
      />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      {creating && (
        <Card title="Create release" className="mb-4">
          <div className="grid gap-2 md:grid-cols-3">
            <input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="v1.5.0" className="h-7 rounded-sm border border-hairline bg-canvas-soft2 px-2 text-[12px] text-ink placeholder:text-mute" />
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Release title" className="h-7 rounded-sm border border-hairline bg-canvas-soft2 px-2 text-[12px] text-ink placeholder:text-mute" />
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Changelog summary" className="h-7 rounded-sm border border-hairline bg-canvas-soft2 px-2 text-[12px] text-ink placeholder:text-mute" />
          </div>
          <div className="mt-2">
            <Btn variant="primary" onClick={() => void create()} disabled={busy === "create" || !form.version.trim()}>Save draft</Btn>
          </div>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Current version" value={latest?.version ?? "—"} tone="ok" />
        <StatCard label="Released" value={releases.filter((r) => r.status === "released").length} />
        <StatCard label="Drafts" value={releases.filter((r) => r.status === "draft").length} />
        <StatCard label="Rolled back" value={releases.filter((r) => r.status === "rolled_back").length} tone="warn" />
      </div>

      {latest && (
        <Card title={`Current release — ${latest.version}`} className="mb-4">
          <p className="text-[12px] font-semibold text-ink">{latest.title || "Release"}</p>
          {latest.notes && <p className="mt-1 text-[12px] leading-5 text-body">{latest.notes}</p>}
          <p className="mt-2 text-[11px] text-mute">Released {fmtTime(latest.releasedAt)} · affected users {latest.usersAffected.toLocaleString()}</p>
        </Card>
      )}

      {previous.length > 0 && (
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Previous versions</h3>
      )}

      <Table<ReleaseRow>
        rows={releases}
        empty={<p className="text-[12px] text-mute">No releases recorded yet — create the first one above.</p>}
        columns={[
          { key: "version", label: "Version", render: (r) => <span className="font-mono font-semibold text-ink">{r.version}</span> },
          { key: "title", label: "Title", render: (r) => <span>{r.title || "—"}</span> },
          { key: "notes", label: "Changes", render: (r) => <span className="block max-w-[280px] truncate">{r.notes || "—"}</span> },
          { key: "releasedAt", label: "Released", render: (r) => <span>{fmtTime(r.releasedAt)}</span> },
          { key: "usersAffected", label: "Affected users", render: (r) => <span>{r.usersAffected.toLocaleString()}</span> },
          { key: "status", label: "Status", render: (r) => <Badge text={r.status} tone={r.status === "released" ? "ok" : r.status === "rolled_back" ? "error" : "warn"} /> },
          {
            key: "actions",
            label: "Actions",
            render: (r) =>
              r.status === "draft" ? (
                <Btn onClick={() => void act(r.id, "publish")} disabled={busy === `${r.id}:publish`} variant="primary">Publish</Btn>
              ) : r.status === "released" ? (
                <Btn onClick={() => void act(r.id, "rollback")} disabled={busy === `${r.id}:rollback`} variant="danger">Roll back</Btn>
              ) : (
                <span className="text-[11px] text-mute">—</span>
              ),
          },
        ]}
      />

      {adoption.length > 0 && (
        <>
          <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-mute">Update adoption by version</h3>
          <Card>
            <div className="flex flex-col gap-2 text-[12px]">
              {adoption.map((a) => (
                <div key={a.version} className="flex items-center gap-3">
                  <span className="w-20 font-mono font-semibold text-ink">{a.version}</span>
                  <span className="text-mute">{a.downloads.toLocaleString()} downloads</span>
                  <span className="text-mute">{a.installs.toLocaleString()} installs</span>
                  <span className="text-mute">{a.updates.toLocaleString()} updates</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export function DownloadsPage(): React.ReactElement {
  const [platforms, setPlatforms] = useState<Array<{ platform: string; downloads: number; installs: number; updates: number }>>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ platforms: typeof platforms; note: string }>("/api/master/downloads")
      .then((r) => { setPlatforms(r.platforms); setNote(r.note); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!platforms.length && !error) return <Spinner label="Loading distribution stats…" />;

  return (
    <div>
      <PageHeader title="Update Distribution" subtitle="Downloads, installs and update success by platform" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <p className="mb-3 rounded-lg border border-hairline bg-canvas-soft px-3 py-2 text-[11.5px] leading-5 text-mute">{note}</p>

      <div className="grid gap-2.5 md:grid-cols-3">
        {platforms.map((p) => (
          <Card key={p.platform} title={p.platform}>
            <div className="flex flex-col gap-1.5 text-[12px]">
              <p>Downloads: <span className="font-semibold text-ink">{p.downloads.toLocaleString()}</span></p>
              <p>Installs: <span className="font-semibold text-ink">{p.installs.toLocaleString()}</span></p>
              <p>Updates: <span className="font-semibold text-ink">{p.updates.toLocaleString()}</span></p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}