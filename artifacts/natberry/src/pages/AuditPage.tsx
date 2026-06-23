import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Shield, Search, ChevronDown } from "lucide-react";

type AuditLog = {
  id: string;
  user_email: string | null;
  table_name: string;
  record_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  description: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  INSERT: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  UPDATE: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  DELETE: "bg-destructive/10 text-destructive border-destructive/20",
};

const TABLE_FR: Record<string, string> = {
  commandes: "Commandes",
  receptions: "Réceptions",
  mouvements_stock: "Stock",
  articles: "Articles",
  fournisseurs: "Fournisseurs",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  async function loadLogs() {
    setLoading(true);
    let q = supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterTable) q = q.eq("table_name", filterTable);
    if (filterAction) q = q.eq("action", filterAction);

    const { data } = await q;
    if (data) setLogs(data as AuditLog[]);
    setLoading(false);
  }

  useEffect(() => { loadLogs(); }, [page, filterTable, filterAction]);

  const filtered = logs.filter((l) =>
    search === "" ||
    l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    l.description?.toLowerCase().includes(search.toLowerCase()) ||
    l.table_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
        <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-foreground">🔐 Journal d'audit</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Historique complet de toutes les modifications effectuées dans l'application.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par utilisateur, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={filterTable}
          onChange={(e) => { setFilterTable(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
        >
          <option value="">Toutes les tables</option>
          {Object.entries(TABLE_FR).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
          className="px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none"
        >
          <option value="">Toutes les actions</option>
          <option value="INSERT">Création</option>
          <option value="UPDATE">Modification</option>
          <option value="DELETE">Suppression</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">Aucune entrée dans le journal d'audit.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les modifications apparaîtront ici au fur et à mesure des actions utilisateurs.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${ACTION_COLORS[log.action]} shrink-0`}>
                    {log.action === "INSERT" ? "➕ Création" : log.action === "UPDATE" ? "✏️ Modif." : "🗑️ Suppression"}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded shrink-0">
                    {TABLE_FR[log.table_name] ?? log.table_name}
                  </span>
                  <p className="flex-1 text-sm text-foreground min-w-0">
                    {log.description ?? "—"}
                  </p>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("fr-FR")}
                    </p>
                    <p className="text-xs text-primary mt-0.5">
                      {log.user_email ?? "Système"}
                    </p>
                  </div>
                  {(log.old_data || log.new_data) && (
                    <button
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expanded === log.id ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>

                {expanded === log.id && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {log.old_data && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                        <p className="text-xs font-semibold text-destructive mb-1">Avant</p>
                        <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.old_data, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.new_data && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                        <p className="text-xs font-semibold text-emerald-500 mb-1">Après</p>
                        <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.new_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length >= PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-border flex justify-between items-center">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm bg-muted rounded-lg disabled:opacity-40 hover:bg-muted/80 transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-xs text-muted-foreground">Page {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={logs.length < PAGE_SIZE}
              className="px-3 py-1.5 text-sm bg-muted rounded-lg disabled:opacity-40 hover:bg-muted/80 transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
