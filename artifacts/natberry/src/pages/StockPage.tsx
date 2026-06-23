import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { StockActuel } from "@/lib/supabase";
import ManualMovementModal from "@/components/ManualMovementModal";
import { TrendingUp, TrendingDown, Package, FileDown, FileSpreadsheet } from "lucide-react";
import { exportStockExcel, exportStockPDF } from "@/lib/exports";

type ModalState = { articleId: string; articleNom: string; type: "ENTREE" | "SORTIE" } | null;

export default function StockPage() {
  const [stock, setStock] = useState<StockActuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  async function loadStock() {
    const { data, error } = await supabase.from("stock_actuel").select("*").order("article_nom");
    if (!error && data) setStock(data as StockActuel[]);
    setLoading(false);
  }

  useEffect(() => { loadStock(); }, []);

  const filtered = stock.filter((s) =>
    s.article_nom.toUpperCase().includes(search.toUpperCase())
  );

  const totalArticles = stock.length;
  const stockPositif = stock.filter((s) => s.stock_actuel > 0).length;
  const stockVide = stock.filter((s) => s.stock_actuel <= 0).length;
  const totalEntrees = stock.reduce((acc, s) => acc + Number(s.total_entrees || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Articles en stock" value={totalArticles} icon="📦" color="primary" />
        <StatCard label="Stock disponible" value={stockPositif} icon="✅" color="success" />
        <StatCard label="Stock épuisé" value={stockVide} icon="⚠️" color="warning" />
        <StatCard label="Total entrées" value={totalEntrees.toFixed(0)} icon="📥" color="info" />
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">📦 Stock actuel par article</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-48"
            />
            <button
              onClick={() => exportStockExcel(stock)}
              disabled={stock.length === 0}
              title="Export Excel"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-sm font-semibold rounded-lg border border-emerald-500/20 transition-colors disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button
              onClick={() => exportStockPDF(stock)}
              disabled={stock.length === 0}
              title="Export PDF"
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold rounded-lg border border-red-500/20 transition-colors disabled:opacity-40"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              {search ? "Aucun article trouvé." : "Aucun mouvement de stock enregistré."}
            </p>
            {!search && (
              <p className="text-xs text-muted-foreground mt-1">
                Effectuez des réceptions de commandes pour alimenter le stock.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filtered.map((s) => {
              const stockNum = Number(s.stock_actuel || 0);
              const entrees = Number(s.total_entrees || 0);
              const sorties = Number(s.total_sorties || 0);
              const pctConsome = entrees > 0 ? Math.min(100, Math.round((sorties / entrees) * 100)) : 0;
              const isLow = stockNum <= 0;

              return (
                <div
                  key={s.article_id || s.article_nom}
                  className={`bg-background border rounded-xl p-4 ${isLow ? "border-destructive/40" : "border-border"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{s.article_nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.famille}{s.categorie ? ` · ${s.categorie}` : ""}
                      </p>
                    </div>
                    {isLow && (
                      <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2 py-0.5 ml-2 shrink-0">
                        Épuisé
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-card rounded-lg">
                      <p className="text-sm font-bold text-emerald-500">{entrees.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Entrées</p>
                    </div>
                    <div className="text-center p-2 bg-card rounded-lg">
                      <p className="text-sm font-bold text-destructive">{sorties.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Sorties</p>
                    </div>
                    <div className={`text-center p-2 rounded-lg border ${isLow ? "bg-destructive/10 border-destructive/20" : "bg-primary/10 border-primary/20"}`}>
                      <p className={`text-sm font-bold ${isLow ? "text-destructive" : "text-primary"}`}>
                        {stockNum.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Stock</p>
                    </div>
                  </div>

                  {entrees > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Consommé</span>
                        <span>{pctConsome}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pctConsome > 80 ? "bg-destructive" : pctConsome > 50 ? "bg-yellow-500" : "bg-emerald-500"}`}
                          style={{ width: `${pctConsome}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {s.derniere_activite && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Dernière activité : {new Date(s.derniere_activite).toLocaleDateString("fr-FR")}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal({ articleId: s.article_id || "", articleNom: s.article_nom, type: "ENTREE" })}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors"
                    >
                      <TrendingUp className="w-3 h-3" /> Entrée
                    </button>
                    <button
                      onClick={() => setModal({ articleId: s.article_id || "", articleNom: s.article_nom, type: "SORTIE" })}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-semibold rounded-lg transition-colors"
                    >
                      <TrendingDown className="w-3 h-3" /> Sortie
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <ManualMovementModal
          articleId={modal.articleId}
          articleNom={modal.articleNom}
          type={modal.type}
          onClose={() => setModal(null)}
          onSuccess={loadStock}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: string;
  color: "primary" | "success" | "warning" | "info";
}) {
  const colors = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-500 bg-emerald-500/10",
    warning: "text-yellow-500 bg-yellow-500/10",
    info: "text-blue-400 bg-blue-400/10",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-lg ${colors[color]}`}>{icon}</span>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
