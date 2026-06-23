import { useTheme } from "next-themes";
import { Moon, Sun, Package, LogOut, Shield, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export type Tab = "dashboard" | "commandes" | "stock" | "historique" | "alertes" | "admin" | "audit";

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  stats: { total: number; pending: number; received: number; alertes: number };
};

export default function Layout({ activeTab, onTabChange, stats }: Props) {
  const { theme, setTheme } = useTheme();
  const { profile, isAdmin, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const tabs: { key: Tab; label: string; badge?: number; adminOnly?: boolean }[] = [
    { key: "dashboard", label: "📊 Tableau de bord" },
    { key: "commandes", label: "📋 Commandes" },
    { key: "stock", label: "📦 Stock" },
    { key: "historique", label: "📜 Historique" },
    { key: "alertes", label: "⚠️ Alertes", badge: stats.alertes },
    { key: "admin", label: "👥 Utilisateurs", adminOnly: true },
    { key: "audit", label: "🔐 Audit", adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <>
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-lg text-foreground hidden sm:block">NATBERRY 16</span>
            <span className="text-muted-foreground text-sm hidden md:block">— Gestion Commandes & Stock</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats pills — desktop only */}
            <div className="hidden lg:flex gap-2">
              <Pill color="primary">{stats.total} commande{stats.total !== 1 ? "s" : ""}</Pill>
              <Pill color="warning">{stats.pending} en attente</Pill>
              <Pill color="success">{stats.received} réceptionnée{stats.received !== 1 ? "s" : ""}</Pill>
              {stats.alertes > 0 && <Pill color="danger">{stats.alertes} en retard</Pill>}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4 text-muted-foreground" />
                : <Moon className="w-4 h-4 text-muted-foreground" />}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-xl hover:bg-accent transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  {(profile?.nom ?? profile?.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-foreground leading-none">
                    {profile?.nom ?? profile?.email?.split("@")[0] ?? "Utilisateur"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {isAdmin ? <><Shield className="w-2.5 h-2.5" /> Admin</> : "Employé"}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground truncate">{profile?.nom ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1.5 ${
                        isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}>
                        {isAdmin ? <><Shield className="w-3 h-3" /> Administrateur</> : "Employé"}
                      </span>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); signOut(); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-background sticky top-16 z-40 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-0.5 min-w-max">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors relative whitespace-nowrap ${
                activeTab === tab.key
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: "primary" | "warning" | "success" | "danger" }) {
  const colors = {
    primary: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-semibold ${colors[color]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
