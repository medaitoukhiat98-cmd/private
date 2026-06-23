import { useState, useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import Layout, { type Tab } from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import CommandesPage from "@/pages/CommandesPage";
import StockPage from "@/pages/StockPage";
import HistoriquePage from "@/pages/HistoriquePage";
import AlertesPage from "@/pages/AlertesPage";
import AuditPage from "@/pages/AuditPage";
import AdminPage from "@/pages/AdminPage";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Package } from "lucide-react";

type Stats = { total: number; pending: number; received: number; alertes: number };

function AppInner() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, received: 0, alertes: 0 });

  async function loadStats() {
    const [{ count: total }, { count: pending }, { count: received }, { count: alertes }] =
      await Promise.all([
        supabase.from("commandes").select("*", { count: "exact", head: true }),
        supabase.from("commandes").select("*", { count: "exact", head: true }).eq("statut", "pending"),
        supabase.from("commandes").select("*", { count: "exact", head: true }).eq("statut", "received"),
        supabase
          .from("commandes")
          .select("*", { count: "exact", head: true })
          .lt("date_prevue_livraison", new Date().toISOString().split("T")[0])
          .not("statut", "in", '("received","cancelled")')
          .not("date_prevue_livraison", "is", null),
      ]);
    setStats({ total: total ?? 0, pending: pending ?? 0, received: received ?? 0, alertes: alertes ?? 0 });
  }

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse">
            <Package className="w-7 h-7 text-white" />
          </div>
          <p className="text-muted-foreground text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Layout activeTab={activeTab} onTabChange={setActiveTab} stats={stats} />
      <main>
        {activeTab === "dashboard" && <DashboardPage />}
        {activeTab === "commandes" && <CommandesPage onStatsChange={loadStats} />}
        {activeTab === "stock" && <StockPage />}
        {activeTab === "historique" && <HistoriquePage />}
        {activeTab === "alertes" && <AlertesPage />}
        {activeTab === "admin" && <AdminPage />}
        {activeTab === "audit" && <AuditPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}
