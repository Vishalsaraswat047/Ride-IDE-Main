import { useState, type ReactNode } from "react";
import {
  Activity, BarChart3, Bot, CheckSquare, CircleDollarSign, Download, FolderKanban, Gauge, Globe,
  LayoutDashboard, LogOut, Mail, Megaphone, Package, Rocket, Server, Settings, ShieldCheck, ShoppingBag,
  Users,
} from "lucide-react";
import { nav } from "./ui";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  children?: Array<{ id: string; label: string }>;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  {
    id: "users",
    label: "Users",
    icon: <Users className="h-3.5 w-3.5" />,
    children: [
      { id: "users", label: "All Users" },
      { id: "verification", label: "Student Verification" },
      { id: "logins", label: "Authentication" },
    ],
  },
  { id: "projects", label: "Projects", icon: <FolderKanban className="h-3.5 w-3.5" /> },
  { id: "ai", label: "AI / Agent", icon: <Bot className="h-3.5 w-3.5" /> },
  {
    id: "payments",
    label: "Payments",
    icon: <CircleDollarSign className="h-3.5 w-3.5" />,
    children: [
      { id: "transactions", label: "Transactions" },
      { id: "plans", label: "Plans" },
      { id: "shipments", label: "Shipments" },
    ],
  },
  { id: "deployments", label: "Deployments", icon: <Rocket className="h-3.5 w-3.5" /> },
  { id: "hosting", label: "Hosting", icon: <Server className="h-3.5 w-3.5" /> },
  { id: "domains", label: "Domains", icon: <Globe className="h-3.5 w-3.5" /> },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: <ShoppingBag className="h-3.5 w-3.5" />,
    children: [
      { id: "marketplace", label: "Overview & Listings" },
      { id: "creators", label: "Creators" },
      { id: "wallets", label: "Wallets & Payouts" },
    ],
  },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: "feedback", label: "Feedback", icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { id: "releases", label: "Releases", icon: <Package className="h-3.5 w-3.5" /> },
  { id: "downloads", label: "Update Distribution", icon: <Download className="h-3.5 w-3.5" /> },
  { id: "health", label: "System Health", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "communications", label: "Communications", icon: <Mail className="h-3.5 w-3.5" /> },
  { id: "audit", label: "Audit Log", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="h-3.5 w-3.5" /> },
];

export function Shell({ route, children, onLogout }: { route: string; children: ReactNode; onLogout: () => void }): ReactNode {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  const top = route.split("/")[0] ?? "dashboard";

  return (
    <div className="flex h-full">
      <aside className="flex w-[212px] shrink-0 flex-col border-r border-hairline bg-canvas-soft">
        <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ember/30 to-brand-magenta/25 text-[13px] font-bold text-ember ring-1 ring-ember/25">
            R
          </span>
          <div>
            <p className="text-[13px] font-semibold leading-4 text-ink">RIDE MASTER</p>
            <p className="text-[10px] leading-3.5 text-mute">Business control center</p>
          </div>
        </div>

        <nav className="master-scroll flex-1 overflow-y-auto py-2">
          {NAV.map((item) => {
            const active = top === item.id;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-4 py-[7px] text-left text-[12.5px] transition-colors ${active ? "border-r-2 border-ember bg-ember/8 text-ink" : "text-mute hover:bg-canvas-soft2 hover:text-body"}`}
                  onClick={() => {
                    if (item.children?.length) {
                      setCollapsed((c) => ({ ...c, [item.id]: !c[item.id] }));
                    } else {
                      nav(item.id);
                    }
                  }}
                >
                  <span className={active ? "text-ember" : ""}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.children?.length ? <span className="text-[10px] text-mute">{collapsed[item.id] ? "▾" : "▸"}</span> : null}
                </button>
                {item.children && !collapsed[item.id] && (
                  <div className="ml-[22px] border-l border-hairline py-0.5">
                    {item.children.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => nav(c.id)}
                        className={`block w-full px-4 py-[5px] text-left text-[11.5px] ${route === c.id ? "text-ember" : "text-mute hover:text-body"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-hairline px-3 py-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[12px] text-mute transition-colors hover:bg-canvas-soft2 hover:text-error"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline bg-canvas px-4">
          <button type="button" onClick={() => setMenuOpen(true)} className="mr-1 text-mute hover:text-ink md:hidden">
            <Megaphone className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-[12px] text-mute">
            <Gauge className="h-3.5 w-3.5 text-ember" />
            <span className="capitalize">{top}</span>
            <span className="text-hairline-strong">/</span>
            <span className="text-body">localhost:9000</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success sm:inline-flex">
              Local only · not exposed
            </span>
            <button type="button" onClick={() => nav("settings")} className="text-mute transition-colors hover:text-ink" title="Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMenuOpen(false)}>
            <div className="h-full w-[240px] bg-canvas-soft p-2" onClick={(e) => e.stopPropagation()}>
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] ${route.startsWith(item.id) ? "text-ember" : "text-mute"}`}
                  onClick={() => {
                    nav(item.id);
                    setMenuOpen(false);
                  }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
              <button type="button" onClick={() => { setMenuOpen(false); void onLogout(); }} className="mt-2 flex w-full items-center gap-2.5 px-3 py-2 text-[12.5px] text-error">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>
        )}

        <main className="master-scroll min-h-0 flex-1 overflow-y-auto bg-canvas p-5">{children}</main>
      </div>
    </div>
  );
}

export function EmptyModule({ icon, title, note }: { icon: ReactNode; title: string; note: string }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-hairline px-6 py-14 text-center">
      <span className="text-mute">{icon}</span>
      <p className="text-[13px] font-semibold text-body">{title}</p>
      <p className="max-w-[420px] text-[12px] leading-5 text-mute">{note}</p>
    </div>
  );
}