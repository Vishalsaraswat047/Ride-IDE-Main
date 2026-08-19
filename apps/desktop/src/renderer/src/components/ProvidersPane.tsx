import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, KeyRound, Loader2, Play, Plus, RefreshCw, RotateCcw, Trash2, Zap } from "lucide-react";
import type { AgentProfile, AgentRoutingRule, AIProvider, ModelConfiguration, ProviderTestResult } from "@ride/contracts";
import { useProviders } from "../lib/hooks";

const inputCls = "h-7 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body outline-none ride-focus-ring";
const btnCls =
  "h-7 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";
const primaryBtnCls =
  "h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";
const dangerBtnCls =
  "h-7 rounded-sm border border-error/40 bg-error/10 px-2.5 text-xs text-error transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring";

type FallbackLike = { id: string; primaryModelId: string; fallbackModelIds: string[]; autoFallback: boolean; fallbackOnError: boolean; fallbackOnTimeout: boolean; timeoutMs: number };

export function ProvidersPane({ initialTab = "providers" }: { initialTab?: "providers" | "models" | "fallbacks" | "routing" | "profiles" }) {
  const { providers, adapters, loading, refresh } = useProviders();
  const [tab, setTab] = useState<"providers" | "models" | "fallbacks" | "routing" | "profiles">(initialTab);
  const [adding, setAdding] = useState(false);
  const [adapterId, setAdapterId] = useState("");
  const [newName, setNewName] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ProviderTestResult>>({});

  // models / fallbacks / routing / profiles
  const [models, setModels] = useState<ModelConfiguration[]>([]);
  const [fallbacks, setFallbacks] = useState<FallbackLike[]>([]);
  const [routing, setRouting] = useState<AgentRoutingRule[]>([]);
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [addModelProvider, setAddModelProvider] = useState("");
  const [addModelId, setAddModelId] = useState("");
  const [addFallback, setAddFallback] = useState<FallbackLike>({ id: "", primaryModelId: "", fallbackModelIds: [], autoFallback: true, fallbackOnError: true, fallbackOnTimeout: true, timeoutMs: 30000 });
  const [addRouting, setAddRouting] = useState<Partial<AgentRoutingRule>>({ taskType: "coding", enabled: true, priority: 0 });
  const [addProfile, setAddProfile] = useState<Partial<AgentProfile>>({ temperature: 0.3, maxTokens: 8192, tools: [], permissions: [], isBuiltin: false });

  const notify = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    void Promise.all([window.ride.models.list(), window.ride.models.getFallbacks(), window.ride.models.getRoutingRules(), window.ride.models.getProfiles()])
      .then(([m, f, r, p]) => {
        setModels(m);
        setFallbacks(f as FallbackLike[]);
        setRouting(r);
        setProfiles(p);
      })
      .catch(() => notify("err", "Failed to load model configuration."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const addModelProviderModels = useMemo(
    () => (addModelProvider ? providers.find((p) => p.id === addModelProvider)?.models ?? [] : []),
    [addModelProvider, providers],
  );

  const modelOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (const p of providers) {
      for (const m of p.models) opts.push({ value: `${p.id}::${m.id}`, label: `${p.displayName || p.name} · ${m.name ?? m.id}` });
    }
    return opts;
  }, [providers]);

  const pickLabel = (key?: string) => modelOptions.find((o) => o.value === key)?.label ?? key ?? "—";

  const startCreate = (id: string) => {
    const adapter = adapters.find((a) => a.id === id);
    setAdapterId(id);
    setNewName("");
    setNewBaseUrl(adapter?.defaultBaseUrl ?? "");
    setNewApiKey("");
    setAdding(true);
  };

  const createProvider = async () => {
    if (!adapterId || !newName.trim()) {
      notify("err", "Pick an adapter and enter a provider name.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await window.ride.providers.create({
        adapterId,
        name: newName.trim(),
        baseUrl: newBaseUrl.trim() || undefined,
        apiKey: newApiKey || undefined,
      });
      notify("ok", `Provider “${newName.trim()}” created and models discovered.`);
      setAdding(false);
      refresh();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const testProvider = async (id: string) => {
    setTestResults((t) => ({ ...t, [id]: { success: false, latency: undefined } as ProviderTestResult }));
    try {
      const r = await window.ride.providers.test(id);
      setTestResults((t) => ({ ...t, [id]: r }));
      notify(r.success ? "ok" : "err", r.success ? `Connection OK · ${r.latency ?? 0}ms · ${r.modelsFound ?? 0} models` : (r.error ?? r.details ?? "Connection failed"));
    } catch (e) {
      setTestResults((t) => ({ ...t, [id]: { success: false, error: e instanceof Error ? e.message : String(e) } }));
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const refreshProviderModels = async (id: string) => {
    setBusy(true);
    try {
      const result = await window.ride.providers.refreshModels(id);
      notify("ok", `Refreshed — ${result.length} models.`);
      refresh();
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const setDefaultModel = async (id: string) => {
    try {
      await window.ride.models.setDefault(id);
      notify("ok", "Default model updated.");
      setModels(await window.ride.models.list());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const toggleModel = async (m: ModelConfiguration) => {
    try {
      await window.ride.models.update(m.id, { isEnabled: !m.isEnabled });
      setModels(await window.ride.models.list());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const deleteModel = async (id: string) => {
    try {
      await window.ride.models.delete(id);
      setModels(await window.ride.models.list());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const addModel = async () => {
    const [providerId, modelId] = addModelId.split("::");
    if (!providerId || !modelId) return;
    setBusy(true);
    try {
      await window.ride.models.create(providerId, modelId);
      notify("ok", "Model added to configuration.");
      setAddModelId("");
      setModels(await window.ride.models.list());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const commitFallback = async () => {
    if (!addFallback.primaryModelId) {
      notify("err", "Choose a primary model.");
      return;
    }
    setBusy(true);
    try {
      if (addFallback.id) {
        await window.ride.models.updateFallback(addFallback.id, addFallback);
      } else {
        await window.ride.models.createFallback(addFallback);
      }
      notify("ok", "Fallback saved.");
      setAddFallback({ id: "", primaryModelId: "", fallbackModelIds: [], autoFallback: true, fallbackOnError: true, fallbackOnTimeout: true, timeoutMs: 30000 });
      setFallbacks((await window.ride.models.getFallbacks()) as FallbackLike[]);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteFallback = async (id: string) => {
    try {
      await window.ride.models.deleteFallback(id);
      setFallbacks((await window.ride.models.getFallbacks()) as FallbackLike[]);
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const commitRouting = async () => {
    if (!addRouting.name || !addRouting.modelId) {
      notify("err", "Routing rules need a name and a model.");
      return;
    }
    setBusy(true);
    try {
      if (addRouting.id) {
        await window.ride.models.updateRoutingRule(addRouting.id, addRouting);
      } else {
        await window.ride.models.createRoutingRule(addRouting);
      }
      notify("ok", "Routing rule saved.");
      setAddRouting({ taskType: "coding", enabled: true, priority: 0 });
      setRouting(await window.ride.models.getRoutingRules());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteRouting = async (id: string) => {
    try {
      await window.ride.models.deleteRoutingRule(id);
      setRouting(await window.ride.models.getRoutingRules());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  const commitProfile = async () => {
    if (!addProfile.name) {
      notify("err", "Profiles need a name.");
      return;
    }
    setBusy(true);
    try {
      if (addProfile.id) {
        await window.ride.models.updateProfile(addProfile.id, addProfile);
      } else {
        await window.ride.models.createProfile(addProfile);
      }
      notify("ok", "Agent profile saved.");
      setAddProfile({ temperature: 0.3, maxTokens: 8192, tools: [], permissions: [], isBuiltin: false });
      setProfiles(await window.ride.models.getProfiles());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      await window.ride.models.deleteProfile(id);
      setProfiles(await window.ride.models.getProfiles());
    } catch (e) {
      notify("err", e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-mute">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "providers", label: "Providers" },
    { id: "models", label: "Models" },
    { id: "fallbacks", label: "Fallbacks" },
    { id: "routing", label: "Routing" },
    { id: "profiles", label: "Agent profiles" },
  ] as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-2 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-6 rounded-sm px-2.5 text-[11px] transition-colors ${tab === t.id ? "bg-canvas-soft-2 font-medium text-ink" : "text-mute hover:text-body"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {msg && (
          <div className={`mb-3 rounded-sm border px-3 py-2 text-[11px] ${msg.kind === "ok" ? "border-success/30 bg-success/10 text-success" : "border-error/30 bg-error/10 text-error"}`}>
            {msg.text}
          </div>
        )}

        {tab === "providers" && (
          <div className="flex flex-col gap-2">
            {providers.length === 0 && (
              <div className="rounded-md border border-hairline bg-canvas-soft px-3 py-4 text-center text-[11px] text-mute">
                No providers configured yet. Add one below — API keys are stored encrypted in the local credential vault.
              </div>
            )}
            {providers.map((p) => (
              <div key={p.id} className="rounded-md border border-hairline px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-ink">{p.displayName || p.name}</span>
                      <span className="rounded-full bg-link/10 px-1.5 py-0.5 text-[9px] text-link">{p.kind}</span>
                      <span className="rounded-full bg-canvas-soft-2 px-1.5 py-0.5 text-[9px] text-mute">{p.models.length} models</span>
                      {p.authentication.type === "api_key" && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${p.authentication.hasKey ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {p.authentication.hasKey ? "key set" : "no key"}
                        </span>
                      )}
                    </div>
                    <div className="truncate font-mono text-[10px] text-mute">{p.baseUrl || "default endpoint"}</div>
                  </div>
                  {testResults[p.id]?.success && (
                    <span className="flex items-center gap-1 text-[10px] text-success">
                      <Check className="h-3 w-3" /> {testResults[p.id]?.latency ? `${Math.round(testResults[p.id]!.latency!)}ms` : "ok"}
                    </span>
                  )}
                  {testResults[p.id]?.error && <span className="text-[10px] text-error">{testResults[p.id]?.error}</span>}
                  <button onClick={() => void testProvider(p.id)} disabled={busy} className={btnCls + " flex items-center gap-1"} title="Test connection">
                    <Zap className="h-3 w-3" /> Test
                  </button>
                  <button onClick={() => void refreshProviderModels(p.id)} disabled={busy} className={btnCls + " flex items-center gap-1"} title="Re-discover models">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button
                    onClick={async () => {
                      await window.ride.providers.delete(p.id);
                      refresh();
                    }}
                    className={btnCls + " flex items-center gap-1"}
                    title="Remove provider"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            {adding ? (
              <div className="rounded-md border border-hairline bg-canvas-soft p-3">
                <div className="text-xs font-medium text-ink">Add provider — {adapters.find((a) => a.id === adapterId)?.displayName}</div>
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="w-28 shrink-0 text-[11px] text-mute">Name</label>
                    <input className={inputCls + " w-64"} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My NIM endpoint" autoFocus />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="w-28 shrink-0 text-[11px] text-mute">Base URL</label>
                    <input className={inputCls + " w-64"} value={newBaseUrl} onChange={(e) => setNewBaseUrl(e.target.value)} placeholder="https://…" />
                  </div>
                  {adapters.find((a) => a.id === adapterId)?.requiresApiKey && (
                    <div className="flex items-center gap-2">
                      <label className="w-28 shrink-0 text-[11px] text-mute">API key</label>
                      <input type="password" className={inputCls + " w-64"} value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} placeholder="sk-… (stored encrypted)" />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={createProvider} disabled={busy} className={primaryBtnCls + " flex items-center gap-1"}>
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Create & discover models
                  </button>
                  <button onClick={() => setAdding(false)} disabled={busy} className={btnCls}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <div className="mb-1.5 text-[11px] font-semibold text-mute uppercase">Add provider</div>
                <div className="grid grid-cols-2 gap-2 2xl:grid-cols-3">
                  {adapters.map((a) => (
                    <button key={a.id} onClick={() => startCreate(a.id)} className="flex items-center gap-2 rounded-md border border-hairline bg-canvas px-3 py-2 text-left text-xs text-body transition-colors hover:border-link/40 hover:text-ink ride-focus-ring">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-link" />
                      <span className="min-w-0 flex-1 truncate">{a.displayName}</span>
                      <span className="shrink-0 text-[9px] text-mute">{a.kind}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-4 text-mute">
              Keys are stored in an AES-256-GCM encrypted vault (OS keychain when available) and never written to
              settings files. Ollama needs no key and is auto-configured when running locally.
            </p>
          </div>
        )}

        {tab === "models" && (
          <div className="flex flex-col gap-2">
            <div className="overflow-hidden rounded-md border border-hairline">
              {models.length === 0 && <div className="px-3 py-4 text-center text-[11px] text-mute">No configured models. Add one from a provider below.</div>}
              {models.map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 border-t border-hairline px-3 py-2 first:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-ink">{m.displayName}</span>
                      {m.isDefault && <span className="rounded-full bg-link/10 px-1.5 py-0.5 text-[9px] text-link">default</span>}
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${m.isEnabled ? "bg-success/10 text-success" : "bg-canvas-soft-2 text-mute"}`}>
                        {m.isEnabled ? "enabled" : "disabled"}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[10px] text-mute">
                      {m.modelId} · t={m.temperature} · max {m.maxTokens}
                    </div>
                  </div>
                  <button onClick={() => void setDefaultModel(m.id)} disabled={m.isDefault} className={btnCls} title="Set as default">
                    Set default
                  </button>
                  <button onClick={() => void toggleModel(m)} className={btnCls} title={m.isEnabled ? "Disable" : "Enable"}>
                    {m.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => void deleteModel(m.id)} className={btnCls} title="Remove from configuration">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-hairline bg-canvas-soft p-3">
              <div className="text-xs font-medium text-ink">Add a model</div>
              <div className="mt-2 flex items-center gap-2">
                <select className={inputCls + " w-40"} value={addModelProvider} onChange={(e) => { setAddModelProvider(e.target.value); setAddModelId(""); }}>
                  <option value="">Provider…</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName || p.name}
                    </option>
                  ))}
                </select>
                <select className={inputCls + " min-w-0 flex-1"} value={addModelId} onChange={(e) => setAddModelId(e.target.value)}>
                  <option value="">Model…</option>
                  {addModelProviderModels.map((m) => (
                    <option key={`${addModelProvider}::${m.id}`} value={`${addModelProvider}::${m.id}`}>
                      {m.name ?? m.id}
                      {m.contextWindow ? ` (${(m.contextWindow / 1000).toFixed(0)}k ctx)` : ""}
                    </option>
                  ))}
                </select>
                <button onClick={addModel} disabled={busy || !addModelId} className={primaryBtnCls + " flex items-center gap-1"}>
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "fallbacks" && (
          <div className="flex flex-col gap-2">
            {fallbacks.map((f) => (
              <div key={f.id} className="rounded-md border border-hairline px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-ink">{pickLabel(f.primaryModelId)}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-mute">
                      {f.fallbackModelIds.length === 0 && <span className="text-mute/60">no fallbacks listed</span>}
                      {f.fallbackModelIds.map((id) => (
                        <span key={id} className="rounded-sm bg-canvas-soft-2 px-1.5 py-0.5">
                          {pickLabel(id)}
                        </span>
                      ))}
                      <span className={f.autoFallback ? "text-success" : ""}>{f.autoFallback ? "auto-fallback on" : "manual"}</span>
                      {f.autoFallback && <> · {f.timeoutMs}ms {f.fallbackOnError ? "· on error" : ""} {f.fallbackOnTimeout ? "· on timeout" : ""}</>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAddFallback({ ...f, fallbackModelIds: [...f.fallbackModelIds] });
                      setTab("fallbacks");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={btnCls}
                  >
                    Edit
                  </button>
                  <button onClick={() => void deleteFallback(f.id)} className={dangerBtnCls}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {fallbacks.length === 0 && (
              <div className="rounded-md border border-hairline bg-canvas-soft px-3 py-4 text-center text-[11px] text-mute">
                No fallback chains. When the primary model fails, RIDE can retry with alternatives automatically.
              </div>
            )}

            <div className="rounded-md border border-hairline bg-canvas-soft p-3">
              <div className="text-xs font-medium text-ink">{addFallback.id ? "Edit fallback chain" : "New fallback chain"}</div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Primary</label>
                  <select className={inputCls + " min-w-0 flex-1"} value={addFallback.primaryModelId} onChange={(e) => setAddFallback({ ...addFallback, primaryModelId: e.target.value })}>
                    <option value="">Model…</option>
                    {modelOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Fallbacks</label>
                  <select
                    className={inputCls + " min-w-0 flex-1"}
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !addFallback.fallbackModelIds.includes(e.target.value)) {
                        setAddFallback({ ...addFallback, fallbackModelIds: [...addFallback.fallbackModelIds, e.target.value] });
                      }
                    }}
                  >
                    <option value="">Add a fallback model…</option>
                    {modelOptions.filter((o) => o.value !== addFallback.primaryModelId && !addFallback.fallbackModelIds.includes(o.value)).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {addFallback.fallbackModelIds.map((id) => (
                  <div key={id} className="flex items-center gap-2 pl-4">
                    <span className="font-mono text-[10px] text-link">{pickLabel(id)}</span>
                    <button
                      onClick={() => setAddFallback({ ...addFallback, fallbackModelIds: addFallback.fallbackModelIds.filter((x) => x !== id) })}
                      className="text-[10px] text-mute hover:text-error"
                    >
                      remove
                    </button>
                  </div>
                ))}
                <label className="flex items-center gap-2 text-[11px] text-mute">
                  <input type="checkbox" checked={addFallback.autoFallback} onChange={(e) => setAddFallback({ ...addFallback, autoFallback: e.target.checked })} />
                  Auto-fallback
                </label>
                {addFallback.autoFallback && (
                  <div className="flex items-center gap-2 pl-5">
                    <label className="w-20 shrink-0 text-[11px] text-mute">Timeout</label>
                    <input type="number" min={1000} max={120000} step={1000} className={inputCls + " w-24"} value={addFallback.timeoutMs} onChange={(e) => setAddFallback({ ...addFallback, timeoutMs: Number(e.target.value) || 30000 })} />
                    <label className="flex items-center gap-1.5 text-[11px] text-mute">
                      <input type="checkbox" checked={addFallback.fallbackOnError} onChange={(e) => setAddFallback({ ...addFallback, fallbackOnError: e.target.checked })} />
                      on error
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-mute">
                      <input type="checkbox" checked={addFallback.fallbackOnTimeout} onChange={(e) => setAddFallback({ ...addFallback, fallbackOnTimeout: e.target.checked })} />
                      on timeout
                    </label>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={commitFallback} disabled={busy} className={primaryBtnCls}>
                  {addFallback.id ? "Save changes" : "Create chain"}
                </button>
                <button onClick={() => setAddFallback({ id: "", primaryModelId: "", fallbackModelIds: [], autoFallback: true, fallbackOnError: true, fallbackOnTimeout: true, timeoutMs: 30000 })} className={btnCls}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "routing" && (
          <div className="flex flex-col gap-2">
            {routing.map((r) => (
              <div key={r.id} className="rounded-md border border-hairline px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-ink">{r.name}</span>
                      <span className="rounded-full bg-canvas-soft-2 px-1.5 py-0.5 text-[9px] text-mute">{r.taskType}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${r.enabled ? "bg-success/10 text-success" : "bg-canvas-soft-2 text-mute"}`}>{r.enabled ? "enabled" : "disabled"}</span>
                    </div>
                    <div className="truncate text-[10px] text-mute">
                      → {pickLabel(r.modelId)} {r.description && `· ${r.description}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setAddRouting({ ...r, conditions: r.conditions })}
                    className={btnCls}
                  >
                    Edit
                  </button>
                  <button onClick={() => void deleteRouting(r.id)} className={dangerBtnCls}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {routing.length === 0 && (
              <div className="rounded-md border border-hairline bg-canvas-soft px-3 py-4 text-center text-[11px] text-mute">
                No custom routing rules. Without rules, RIDE picks the default model for every task type.
              </div>
            )}

            <div className="rounded-md border border-hairline bg-canvas-soft p-3">
              <div className="text-xs font-medium text-ink">{addRouting.id ? "Edit routing rule" : "New routing rule"}</div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Name</label>
                  <input className={inputCls + " min-w-0 flex-1"} value={addRouting.name ?? ""} onChange={(e) => setAddRouting({ ...addRouting, name: e.target.value })} placeholder="VLSI analysis" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Task type</label>
                  <select className={inputCls + " flex-1"} value={addRouting.taskType ?? "coding"} onChange={(e) => setAddRouting({ ...addRouting, taskType: e.target.value as AgentRoutingRule["taskType"] })}>
                    {(["coding", "architecture", "debugging", "fast", "reasoning", "ui", "vlsi", "custom"] as const).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Route to</label>
                  <select className={inputCls + " min-w-0 flex-1"} value={addRouting.modelId ?? ""} onChange={(e) => setAddRouting({ ...addRouting, modelId: e.target.value })}>
                    <option value="">Model…</option>
                    {modelOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Priority</label>
                  <input type="number" min={0} max={100} className={inputCls + " w-24"} value={addRouting.priority ?? 0} onChange={(e) => setAddRouting({ ...addRouting, priority: Number(e.target.value) || 0 })} />
                  <label className="flex items-center gap-1.5 text-[11px] text-mute">
                    <input type="checkbox" checked={addRouting.enabled ?? true} onChange={(e) => setAddRouting({ ...addRouting, enabled: e.target.checked })} />
                    enabled
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Description</label>
                  <input className={inputCls + " min-w-0 flex-1"} value={addRouting.description ?? ""} onChange={(e) => setAddRouting({ ...addRouting, description: e.target.value })} placeholder="Optional" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={commitRouting} disabled={busy} className={primaryBtnCls}>
                  {addRouting.id ? "Save changes" : "Create rule"}
                </button>
                <button onClick={() => setAddRouting({ taskType: "coding", enabled: true, priority: 0 })} className={btnCls}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "profiles" && (
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <div key={p.id} className="rounded-md border border-hairline px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-ink">{p.name}</span>
                      {p.isBuiltin && <span className="rounded-full bg-violet/10 px-1.5 py-0.5 text-[9px] text-violet">built-in</span>}
                      {p.isDefault && <span className="rounded-full bg-link/10 px-1.5 py-0.5 text-[9px] text-link">default</span>}
                    </div>
                    <div className="truncate text-[10px] text-mute">
                      {p.description || "No description"} · t={p.temperature} · max {p.maxTokens}
                      {p.modelId ? ` · ${pickLabel(p.modelId)}` : ""}
                    </div>
                  </div>
                  <button onClick={() => setAddProfile({ ...p, tools: [...p.tools], permissions: [...p.permissions] })} className={btnCls}>
                    Edit
                  </button>
                  <button onClick={() => void deleteProfile(p.id)} disabled={p.isBuiltin} className={dangerBtnCls} title={p.isBuiltin ? "Built-in profiles can't be deleted" : "Delete profile"}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            <div className="rounded-md border border-hairline bg-canvas-soft p-3">
              <div className="text-xs font-medium text-ink">{addProfile.id ? "Edit agent profile" : "New agent profile"}</div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Name</label>
                  <input className={inputCls + " min-w-0 flex-1"} value={addProfile.name ?? ""} onChange={(e) => setAddProfile({ ...addProfile, name: e.target.value })} placeholder="My reviewer" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Model</label>
                  <select className={inputCls + " min-w-0 flex-1"} value={addProfile.modelId ?? ""} onChange={(e) => setAddProfile({ ...addProfile, modelId: e.target.value })}>
                    <option value="">Default model…</option>
                    {modelOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Temperature</label>
                  <input type="number" min={0} max={2} step={0.1} className={inputCls + " w-24"} value={addProfile.temperature ?? 0.3} onChange={(e) => setAddProfile({ ...addProfile, temperature: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">Max tokens</label>
                  <input type="number" min={256} max={128000} step={256} className={inputCls + " w-24"} value={addProfile.maxTokens ?? 8192} onChange={(e) => setAddProfile({ ...addProfile, maxTokens: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 shrink-0 text-[11px] text-mute">System prompt</label>
                  <textarea className={inputCls + " min-h-16 w-full resize-y py-1.5"} value={addProfile.systemPrompt ?? ""} onChange={(e) => setAddProfile({ ...addProfile, systemPrompt: e.target.value })} placeholder="Optional instructions the agent follows for this profile" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={commitProfile} disabled={busy} className={primaryBtnCls}>
                  {addProfile.id ? "Save changes" : "Create profile"}
                </button>
                <button onClick={() => setAddProfile({ temperature: 0.3, maxTokens: 8192, tools: [], permissions: [], isBuiltin: false })} className={btnCls}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}