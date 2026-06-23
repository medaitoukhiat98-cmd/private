import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { MouvementStock } from "@/lib/supabase";
import { FileSpreadsheet } from "lucide-react";
import { exportHistoriqueExcel } from "@/lib/exports";

type MouvementWithArticle = MouvementStock & { article_nom: string };

export default function HistoriquePage() {
  const [mouvements, setMouvements] = useState<MouvementWithArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterArticle, setFilterArticle] = useState("");

  async function loadMouvements() {
    const { data, error } = await supabase
      .from("mouvements_stock")
      .select("*, articles(nom)")
      .order("date_mouvement", { ascending: false })
      .limit(500);

    if (!error && data) {
      const mapped = data.map((m: Record<string, unknown>) => ({
        ...m,
        article_nom: (m.articles as { nom: string } | null)?.nom || (m as { article_nom?: string }).article_nom || "—",
      })) as MouvementWithArticle[];
      setMouvements(mapped);
    }
    setLoading(false);
  }

  useEffect(() => { loadMouvements(); }, []);

  const filtered = mouvements.filter((m) => {
    const matchType = filterType === "all" || m.type === filterType;
    const matchArticle = !filterArticle || m.article_nom.toUpperCase().includes(filterArticle.toUpperCase());
    return matchType && matchArticle;
  });

  const totalEntrees = mouvements.filter((m) => m.type === "ENTREE").length;
  const totalSorties = mouvements.filter((m) => m.type === "SORTIE").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{mouvements.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Mouvements total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{totalEntrees}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Entrées</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{totalSorties}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sorties</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">📜 Historique des mouvements</h2>
          <div className="flex gap-2 flex-wrap">
            <input type="text" value={filterArticle} onChange={(e) => setFilterArticle(e.target.value)}
              placeholder="Filtrer par article..."
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none">
              <option value="all">Tous types</option>
              <option value="ENTREE">Entrées</option>
              <option value="SORTIE">Sorties</option>
            </select>
            <button onClick={() => exportHistoriqueExcel(filtered)} disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-sm font-semibold rounded-lg border border-emerald-500/20 transition-colors disabled:opacity-40">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Aucun mouvement trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  {["Date", "Article", "Quantité", "Type", "Origine", "Remarques"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide ${h === "Quantité" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(m.date_mouvement).toLocaleDateString("fr-FR")}
                      <br />
                      <span className="text-xs opacity-60">
                        {new Date(m.date_mouvement).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{m.article_nom}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={m.type === "ENTREE" ? "text-emerald-500" : "text-destructive"}>
                        {m.type === "ENTREE" ? "+" : "-"}{Number(m.quantite).toFixed(2)}
                      </span>
                      {m.unite && <span className="text-xs text-muted-foreground ml-1">{m.unite}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${m.type === "ENTREE" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-destructive bg-destructive/10 border-destructive/20"}`}>
                        {m.type === "ENTREE" ? "📥 Entrée" : "📤 Sortie"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {m.reception_id ? "📦 Réception commande" : m.commande_id ? "🔗 Commande" : "✋ Manuel"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{m.remarque || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
