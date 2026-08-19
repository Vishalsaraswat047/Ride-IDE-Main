import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle, AlertCircle, Globe, ExternalLink, Wifi, Lock, ArrowRight, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../lib/hooks";
import type { MyDashboardData, HostingerWebsite } from "@ride/contracts";

export function DeploymentCenter({ projectRoot, projectName }: { projectRoot: string; projectName: string }) {
  const auth = useAuth();
  const [shipment, setShipment] = useState<{ shipped: boolean; shipment: { projectName: string; planName: string; price: number; currency: string; shippedAt: number } | null }>({ shipped: false, shipment: null });
  const [hostingerConnected, setHostingerConnected] = useState(false);
  const [hostingerLoading, setHostingerLoading] = useState(false);
  const [hostingerError, setHostingerError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<MyDashboardData | null>(null);
  const [websites, setWebsites] = useState<HostingerWebsite[]>([]);
  const [showDomainGuidance, setShowDomainGuidance] = useState(false);
  const [domainType, setDomainType] = useState<"existing" | "buy">("existing");
  const [domainInput, setDomainInput] = useState("");
  const [connectingDomain, setConnectingDomain] = useState(false);

  const loadShipment = useCallback(async () => {
    try {
      const status = await window.ride.ship.status(projectRoot);
      setShipment(status);
    } catch {
      setShipment({ shipped: false, shipment: null });
    }
  }, [projectRoot]);

  const loadHostingerStatus = useCallback(async () => {
    setHostingerLoading(true);
    try {
      const status = await window.ride.hostinger.getStatus();
      setHostingerConnected(status.connected);
      if (status.connected) {
        const [dash, sites] = await Promise.all([
          window.ride.hostinger.getDashboard(),
          window.ride.hostinger.getWebsites(),
        ]);
        setDashboardData(dash);
        setWebsites(sites.websites);
      }
    } catch (e) {
      setHostingerError(e instanceof Error ? e.message : "Failed to load Hostinger status");
    } finally {
      setHostingerLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShipment();
    loadHostingerStatus();
  }, [loadShipment, loadHostingerStatus]);

  const handleShip = () => {
    window.dispatchEvent(new CustomEvent("ride:open-ship", { detail: { projectRoot, projectName } }));
  };

  const handleConnectHosting = async () => {
    setHostingerLoading(true);
    setHostingerError(null);
    // This opens the settings modal to deployment section where they can connect
    window.dispatchEvent(new CustomEvent("ride:open-settings", { detail: { section: "deployment" } }));
    setHostingerLoading(false);
  };

  const handleConnectDomain = async () => {
    if (!domainInput.trim()) {
      setHostingerError("Please enter a domain name");
      return;
    }
    setConnectingDomain(true);
    setHostingerError(null);
    try {
      if (domainType === "existing") {
        // Real DNS guidance - no fake connection
        setShowDomainGuidance(true);
      } else {
        // Buy from Hostinger - open external
        window.open("https://www.hostinger.com/domains", "_blank");
      }
    } catch (e) {
      setHostingerError(e instanceof Error ? e.message : "Failed to connect domain");
    } finally {
      setConnectingDomain(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (currency === "INR") return `₹${(price / 100).toFixed(0)}`;
    return `${currency} ${(price / 100).toFixed(2)}`;
  };

  const formatDate = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="ride-deployment-center h-full flex flex-col overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-body">Deployment Center</h2>
          <p className="text-sm text-mute">{projectName}</p>
        </div>
      </div>

      {/* Shipment Status */}
      <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
        <h3 className="font-medium text-body">Project Shipment</h3>
        {!shipment.shipped ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-body">Ship this project</p>
                  <p className="text-sm text-mute">Unlock deployment, code export & production dashboard</p>
                </div>
              </div>
              <span className="text-lg font-bold text-primary">
                {shipment.shipment ? formatPrice(shipment.shipment.price, shipment.shipment.currency) : "₹99"}
              </span>
            </div>
            <button
              onClick={handleShip}
              className="w-full h-10 rounded-lg bg-primary text-on-primary font-medium flex items-center justify-center gap-2"
            >
              Ship Project
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green/10 border border-green/20">
              <CheckCircle className="h-6 w-6 text-green flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-body">Project shipped successfully</p>
                <p className="text-sm text-mute">
                  {shipment.shipment?.planName} · {formatPrice(shipment.shipment?.price ?? 0, shipment.shipment?.currency ?? "INR")} · {formatDate(shipment.shipment?.shippedAt ?? Date.now())}
                </p>
              </div>
            </div>
            <p className="text-sm text-green font-medium">✓ Deployment unlocked · ✓ Code export unlocked · ✓ Production dashboard unlocked</p>
          </div>
        )}
      </div>

      {/* Hostinger Hosting */}
      <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
        <h3 className="font-medium text-body flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Hostinger Hosting
        </h3>

        {!shipment.shipped ? (
          <div className="text-center py-4 text-mute">
            <p>Ship your project first to unlock hosting integration.</p>
          </div>
        ) : !hostingerConnected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-hairline">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet/20 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-violet" />
                </div>
                <div>
                  <p className="font-medium text-body">Hostinger ● Recommended</p>
                  <p className="text-sm text-mute">Deploy your RIDE project using Hostinger</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-violet/20 text-violet rounded">Recommended</span>
            </div>
            <button
              onClick={handleConnectHosting}
              disabled={hostingerLoading}
              className="w-full h-10 rounded-lg bg-primary text-on-primary font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {hostingerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Connect Hosting
            </button>
            {hostingerError && (
              <p className="text-sm text-error text-center">{hostingerError}</p>
            )}
            <p className="text-xs text-mute text-center">
              Enter your Hostinger API token in Settings → Deployment to connect.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green/10 border border-green/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green" />
                </div>
                <div>
                  <p className="font-medium text-body">Hostinger Connected</p>
                  <p className="text-sm text-mute">Ready for deployments</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-green/20 text-green rounded">Active</span>
            </div>

            {dashboardData && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50 border border-hairline">
                  <p className="text-mute">Websites</p>
                  <p className="font-bold text-body">{websites.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-hairline">
                  <p className="text-mute">Deployments</p>
                  <p className="font-bold text-body">{dashboardData.deployments.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-hairline">
                  <p className="text-mute">Domains</p>
                  <p className="font-bold text-body">{dashboardData.domains.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-hairline">
                  <p className="text-mute">Node.js builds</p>
                  <p className="font-bold text-body">{dashboardData.nodejsBuilds.length}</p>
                </div>
              </div>
            )}

            {websites.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm text-body">Your Websites</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {websites.map((site) => (
                    <div key={site.id} className="p-2 rounded border border-hairline bg-canvas flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3 w-3 text-mute" />
                        <span className="font-medium">{site.domain}</span>
                        {site.isEnabled && <span className="px-1.5 py-0.5 text-xs bg-green/20 text-green rounded">Live</span>}
                      </div>
                      <span className="text-xs text-mute">{site.datacenter ?? site.plan ?? ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Domain */}
      <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-3">
        <h3 className="font-medium text-body flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Domain
        </h3>

        {!shipment.shipped ? (
          <div className="text-center py-4 text-mute">
            <p>Ship your project first to connect a domain.</p>
          </div>
        ) : !hostingerConnected ? (
          <div className="text-center py-4 text-mute">
            <p>Connect Hostinger hosting first to manage domains.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-hairline">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue/20 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue" />
                </div>
                <div>
                  <p className="font-medium text-body">Connect a Domain</p>
                  <p className="text-sm text-mute">Use an existing domain or buy one from Hostinger</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setDomainType("existing"); setShowDomainGuidance(true); }}
                className={`flex-1 h-10 rounded-lg border font-medium transition-colors ${domainType === "existing" ? "bg-primary text-on-primary border-primary" : "bg-canvas text-body hover:bg-canvas-soft border-hairline"}`}
              >
                Existing Domain
              </button>
              <button
                onClick={() => { setDomainType("buy"); window.open("https://www.hostinger.com/domains", "_blank"); }}
                className="flex-1 h-10 rounded-lg bg-canvas text-body border border-hairline hover:bg-canvas-soft font-medium flex items-center justify-center gap-2"
              >
                Buy from Hostinger
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            {domainType === "existing" && showDomainGuidance && (
              <div className="space-y-3 p-3 rounded-lg bg-blue/10 border border-blue/20 animate-in slide-in-from-top-2">
                <h4 className="font-medium text-blue flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  DNS Configuration for <span className="font-mono">{domainInput || "your-domain.com"}</span>
                </h4>
                <p className="text-sm text-mute">
                  RIDE does not control external registrars. Configure these records at your domain provider:
                </p>
                <div className="space-y-2 text-sm font-mono bg-canvas rounded p-3 border border-hairline">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-muted rounded text-xs text-mute">A</span>
                    <span>@</span>
                    <span className="text-mute">→</span>
                    <span className="font-medium">Your Hostinger website IP</span>
                    <button className="ml-auto px-2 py-1 text-xs border border-hairline rounded hover:bg-canvas-soft">Copy</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-muted rounded text-xs text-mute">CNAME</span>
                    <span>www</span>
                    <span className="text-mute">→</span>
                    <span className="font-medium">your-site.hostinger.site</span>
                    <button className="ml-auto px-2 py-1 text-xs border border-hairline rounded hover:bg-canvas-soft">Copy</button>
                  </div>
                </div>
                <p className="text-xs text-mute">
                  DNS propagation takes 15–30 minutes. After configuring, click "Verify Domain" in Hostinger dashboard.
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowDomainGuidance(false)}
                    className="flex-1 h-8 rounded border border-hairline text-sm text-body hover:bg-canvas-soft"
                  >
                    Done, I'll Configure Later
                  </button>
                  <button
                    onClick={handleConnectDomain}
                    disabled={connectingDomain || !domainInput}
                    className="flex-1 h-8 rounded bg-primary text-on-primary text-sm disabled:opacity-50"
                  >
                    {connectingDomain ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verify Domain"}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="example.com"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="h-8 rounded-sm border border-hairline bg-canvas px-2 text-sm outline-none ride-focus-ring"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}