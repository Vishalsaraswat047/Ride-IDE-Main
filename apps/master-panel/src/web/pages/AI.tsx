import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { api } from "../api";
import { ErrorBox, PageHeader, Spinner } from "../ui";
import { EmptyModule } from "../Shell";

export function AIPage(): React.ReactElement {
  const [data, setData] = useState<{ available: boolean; note: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ available: boolean; note: string }>("/api/master/ai")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!data && !error) return <Spinner label="Loading AI usage…" />;

  return (
    <div>
      <PageHeader title="AI / Agent Usage" subtitle="QUINN and model-provider telemetry" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      {data && !data.available && (
        <EmptyModule
          icon={<Bot className="h-5 w-5" />}
          title="No AI telemetry yet"
          note={`${data.note} When telemetry lands, this section will show requests, sessions, tokens, per-model usage (local vs cloud), latency, errors and cost per session.`}
        />
      )}
    </div>
  );
}