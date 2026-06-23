import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { StockActuel } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid,
} from "recharts";
import { TrendingUp, Package, Clock, AlertTriangle } from "lucide-react";

type DashStats = {
  total: number;
  pending: number;
  partial: number;
  received: number;
  cancelled: number;
  alertes: number;
};

type DailyReception = { date: string; quantite: number };

const COLORS = {
  pending: "#f59e0b",
  partial: "#6C63FF",
  received: "#10b981",
  cancelled: "#6b7280",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats>({ total: 0, pending: 0, partial: 0, received: 0, cancelled: 0, alertes: 0 });
  const [stock, setStock] = useState<StockActuel[]>([]);
  const [receptions30j, setReceptions30j] = useState<DailyReception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const today = new Date().toISOString().split("T")[0];
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];

    const [{ data: commandes }, { data: stockData }, { data: mouvements }] = await Promise.all([
      supabase.from("commandes").select("statut, date_prevue_livraison"),
      supabase.from("stock_actuel").select("*").order("stock_actuel", { ascending: false }).limit(10),
      supabase
        .from("mouvements_stock")
        .select("date_mouvement, quantite")
        .eq("type", "ENTREE")
        .gte("date_mouvement", since30 + "T00:00:00"),
    ]);

    if (commandes) {
      const s: DashStats = { total: commandes.length, pending: 0, partial: 0, received: 0, cancelled: 0, alertes: 0 };
      commandes.forEach((c) => {
        if (c.statut in s) (s as Record<string, number>)[c.statut]++;
        if (c.date_prevue_livraison && c.date_prevue_livraison < today && c.statut !== "received" && c.statut !== "cancelled") {
          s.alertes++;
        }
      });
      setStats(s);
    }

    if (stockData) setStock(stockData as StockActuel[]);

    if (mouvements) {
      const byDay: Record<string, number> = {};
      mouvements.forEach((m) => {
        const d = (m.date_mouvement as string).split("T")[0];
        byDay[d] = (byDay[d] ?? 0) + Number(m.quantite);
      });
      const sorted = Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, quantite]) => ({
          date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          quantite: Math.round(Number(quantite) * 10) / 10,
        }));
      setReceptions30j(sorted);
    }

    setLoading(false);
  }

  const statutPieData = [
    { name: "En attente", value: stats.pending, color: COLORS.pending },
    { name: "Partielle", value: stats.partial, color: COLORS.partial },
    { name: "Réceptionnée", value: stats.received, color: COLORS.received },
    { name: "Annulée", value: stats.cancelled, color: COLORS.cancelled },
  ].filter((d) => d.value > 0);

  const topStock = [...stock].slice(0, 10).map((s) => ({
    name: s.article_nom.length > 18 ? s.article_nom.slice(0, 16) + "…" : s.article_nom,
    stock: Number(s.stock_actuel).toFixed(1),
    stockNum: Number(s.stock_actuel),
  }));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-muted-foreground">
        Chargement du tableau de bord…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total commandes" value={stats.total} icon={<Package className="w-4 h-4" />} color="primary" />
        <KpiCard label="En attente" value={stats.pending} icon={<Clock className="w-4 h-4" />} color="warning" />
        <KpiCard label="Partielles" value={stats.partial} icon={<TrendingUp className="w-4 h-4" />} color="blue" />
        <KpiCard label="Réceptionnées" value={stats.received} icon={<TrendingUp className="w-4 h-4" />} color="success" />
        <KpiCard label="Annulées" value={stats.cancelled} icon={<Package className="w-4 h-4" />} color="muted" />
        <KpiCard label="En retard" value={stats.alertes} icon={<AlertTriangle className="w-4 h-4" />} color={stats.alertes > 0 ? "danger" : "muted"} />
      </div>

      {/* Row 1: Pie + Bar stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statuts commandes */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-foreground mb-4">Commandes par statut</h3>
          {statutPieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Aucune donnée
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statutPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {statutPieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 10 articles stock */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-bold text-foreground mb-4">Top 10 articles en stock</h3>
          {topStock.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Aucun mouvement de stock
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topStock} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(v: number | string) => [v, "Stock"]}
                />
                <Bar dataKey="stockNum" fill="#6C63FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Réceptions 30 jours */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-bold text-foreground mb-1">Réceptions (30 derniers jours)</h3>
        <p className="text-xs text-muted-foreground mb-4">Quantités totales reçues par jour</p>
        {receptions30j.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Aucune réception sur les 30 derniers jours
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={receptions30j} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorQte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(receptions30j.length / 6)}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                formatter={(v: number | string) => [v, "Quantité reçue"]}
              />
              <Area
                type="monotone"
                dataKey="quantite"
                stroke="#6C63FF"
                strokeWidth={2}
                fill="url(#colorQte)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "primary" | "warning" | "success" | "danger" | "muted" | "blue";
}) {
  const colors: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    warning: "text-yellow-500 bg-yellow-500/10",
    success: "text-emerald-500 bg-emerald-500/10",
    danger: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-muted",
    blue: "text-blue-400 bg-blue-400/10",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
