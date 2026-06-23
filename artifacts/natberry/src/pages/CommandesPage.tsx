import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { CommandeDetail } from "@/lib/supabase";
import { ARTICLES_DATA, UNITES } from "@/lib/articles-data";
import ReceptionModal from "@/components/ReceptionModal";
import { Trash2, Package, FileDown, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { logAudit } from "@/lib/audit";
import { exportCommandesExcel, exportCommandesPDF } from "@/lib/exports";

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "⏳ En attente", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  partial: { label: "📦 Partielle", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  received: { label: "✅ Réceptionnée", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  cancelled: { label: "❌ Annulée", color: "text-destructive bg-destructive/10 border-destructive/20" },
};

type Props = { onStatsChange: () => void };

export default function CommandesPage({ onStatsChange }: Props) {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [commandes, setCommandes] = useState<CommandeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState("all");
  const [reception, setReception] = useState<CommandeDetail | null>(null);

  const [form, setForm] = useState({
    article: "", articleNom: "", famille: "", categorie: "",
    qty: 1, unite: "KG", fournisseur: "",
    dateCommande: new Date().toISOString().split("T")[0],
    dateLivraison: "", statut: "pending", note: "",
  });
  const [suggestions, setSuggestions] = useState<typeof ARTICLES_DATA>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadCommandes() {
    const { data, error } = await supabase
      .from("commandes_detail")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setCommandes(data as CommandeDetail[]);
    setLoading(false);
  }

  useEffect(() => { loadCommandes(); }, []);

  function handleArticleInput(val: string) {
    setForm((f) => ({ ...f, article: val, articleNom: "", famille: "", categorie: "" }));
    if (val.length > 0) {
      setSuggestions(ARTICLES_DATA.filter((a) => a.article.toUpperCase().startsWith(val.toUpperCase())).slice(0, 8));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectArticle(a: (typeof ARTICLES_DATA)[0]) {
    setForm((f) => ({ ...f, article: a.article, articleNom: a.article, famille: a.famille, categorie: a.categorie }));
    setShowSuggestions(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nom = form.articleNom || form.article.trim();
    if (!nom) { toast({ title: "Article requis", variant: "destructive" }); return; }
    setSaving(true);

    let articleId: string | null = null;
    const articleData = ARTICLES_DATA.find((a) => a.article.toUpperCase() === nom.toUpperCase());

    const articlePayload = articleData
      ? { nom: articleData.article, famille: articleData.famille, categorie: articleData.categorie, sous_categorie: articleData.sous_categorie }
      : { nom, famille: "ACHAT", categorie: "DIVERS", sous_categorie: "DIVERS" };

    const lookupNom = articleData ? articleData.article : nom;

    const { data: existing, error: selectErr } = await supabase
      .from("articles").select("id").eq("nom", lookupNom).maybeSingle();

    if (selectErr) {
      toast({ title: "Erreur Supabase (articles)", description: selectErr.message, variant: "destructive" });
      setSaving(false); return;
    }

    if (existing) {
      articleId = existing.id;
    } else {
      const { data: created, error: insertErr } = await supabase
        .from("articles").insert(articlePayload).select("id").single();
      if (insertErr) {
        toast({ title: "Erreur création article", description: insertErr.message, variant: "destructive" });
        setSaving(false); return;
      }
      articleId = created?.id ?? null;
    }

    if (!articleId) { toast({ title: "Erreur : article introuvable après insertion", variant: "destructive" }); setSaving(false); return; }

    let fournisseurId: string | null = null;
    if (form.fournisseur.trim()) {
      const { data: existingF } = await supabase.from("fournisseurs").select("id").eq("nom", form.fournisseur.trim()).maybeSingle();
      if (existingF) {
        fournisseurId = existingF.id;
      } else {
        const { data: createdF, error: fournisseurErr } = await supabase
          .from("fournisseurs").insert({ nom: form.fournisseur.trim() }).select("id").single();
        if (fournisseurErr) {
          toast({ title: "Erreur création fournisseur", description: fournisseurErr.message, variant: "destructive" });
          setSaving(false); return;
        }
        fournisseurId = createdF?.id ?? null;
      }
    }

    const payload = {
      article_id: articleId, fournisseur_id: fournisseurId,
      quantite_commandee: form.qty, unite: form.unite,
      date_commande: form.dateCommande,
      date_prevue_livraison: form.dateLivraison || null,
      statut: form.statut, note: form.note || null,
    };

    const { data: inserted, error } = await supabase.from("commandes").insert(payload).select("id").single();

    if (error) {
      toast({ title: "Erreur: " + error.message, variant: "destructive" });
    } else {
      await logAudit({
        userId: user?.id, userEmail: user?.email,
        tableName: "commandes", recordId: inserted?.id,
        action: "INSERT",
        description: `Commande créée : ${nom} — ${form.qty} ${form.unite}${form.fournisseur ? ` — fournisseur : ${form.fournisseur}` : ""}`,
        newData: { article: nom, quantite: form.qty, unite: form.unite, fournisseur: form.fournisseur, statut: form.statut },
      });
      toast({ title: "✅ Commande ajoutée avec succès !" });
      setForm({
        article: "", articleNom: "", famille: "", categorie: "",
        qty: 1, unite: "KG", fournisseur: "",
        dateCommande: new Date().toISOString().split("T")[0],
        dateLivraison: "", statut: "pending", note: "",
      });
      await loadCommandes();
      onStatsChange();
    }
    setSaving(false);
  }

  async function updateStatut(id: string, statut: string, commande: CommandeDetail) {
    if (statut === "cancelled" && !confirm("Annuler cette commande ?")) return;
    const { error } = await supabase.from("commandes").update({ statut }).eq("id", id);
    if (!error) {
      await logAudit({
        userId: user?.id, userEmail: user?.email,
        tableName: "commandes", recordId: id,
        action: "UPDATE",
        description: `Commande ${commande.article_nom} — statut : ${commande.statut} → ${statut}`,
        oldData: { statut: commande.statut }, newData: { statut },
      });
      await loadCommandes();
      onStatsChange();
    }
  }

  async function deleteCommande(id: string, commande: CommandeDetail) {
    if (!confirm("Supprimer cette commande ? L'action est irréversible.")) return;
    const { error } = await supabase.from("commandes").delete().eq("id", id);
    if (!error) {
      await logAudit({
        userId: user?.id, userEmail: user?.email,
        tableName: "commandes", recordId: id,
        action: "DELETE",
        description: `Commande supprimée : ${commande.article_nom} — ${commande.quantite_commandee} ${commande.unite}`,
        oldData: { article: commande.article_nom, quantite: commande.quantite_commandee, statut: commande.statut },
      });
      toast({ title: "Commande supprimée" });
      await loadCommandes();
      onStatsChange();
    }
  }

  const filtered = filterStatut === "all" ? commandes : commandes.filter((c) => c.statut === filterStatut);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* FORM */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-5 text-foreground">➕ Nouvelle commande</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Article */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-foreground mb-1.5">Article *</label>
              <input
                ref={inputRef}
                type="text"
                value={form.article}
                onChange={(e) => handleArticleInput(e.target.value)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Tapez pour rechercher..."
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                  {suggestions.map((s) => (
                    <button key={s.article} type="button" onMouseDown={() => selectArticle(s)} className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors">
                      <p className="text-sm font-medium text-foreground">{s.article}</p>
                      <p className="text-xs text-muted-foreground">{s.famille} · {s.categorie}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Quantité *</label>
              <input type="number" min={0.001} step={0.001} value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: parseFloat(e.target.value) || 1 }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Unité</label>
              <select value={form.unite} onChange={(e) => setForm((f) => ({ ...f, unite: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary">
                {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Fournisseur</label>
              <input type="text" value={form.fournisseur} onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))}
                placeholder="Nom du fournisseur..."
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Date commande</label>
              <input type="date" value={form.dateCommande} onChange={(e) => setForm((f) => ({ ...f, dateCommande: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Livraison prévue</label>
              <input type="date" value={form.dateLivraison} onChange={(e) => setForm((f) => ({ ...f, dateLivraison: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Statut</label>
              <select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary">
                <option value="pending">⏳ En attente</option>
                <option value="partial">📦 Réception partielle</option>
                <option value="received">✅ Réceptionnée</option>
                <option value="cancelled">❌ Annulée</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-foreground mb-1.5">Note (optionnel)</label>
              <input type="text" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Remarques, références..."
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" />
            </div>
          </div>
          <div className="mt-4">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
              {saving ? "Enregistrement..." : "➕ Ajouter la commande"}
            </button>
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">📋 Liste des commandes</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none">
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="partial">Réception partielle</option>
              <option value="received">Réceptionnées</option>
              <option value="cancelled">Annulées</option>
            </select>
            <button onClick={() => exportCommandesExcel(filtered)} disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-sm font-semibold rounded-lg border border-emerald-500/20 transition-colors disabled:opacity-40">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => exportCommandesPDF(filtered)} disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold rounded-lg border border-red-500/20 transition-colors disabled:opacity-40">
              <FileDown className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Aucune commande trouvée.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  {["#", "Article", "Commandée", "Reçue", "Restante", "Fournisseur", "Date cmd", "Livraison prévue", "Statut", "Actions"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide ${["Commandée", "Reçue", "Restante"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const isRetard = c.date_prevue_livraison && new Date(c.date_prevue_livraison) < new Date() && c.statut !== "received" && c.statut !== "cancelled";
                  const pct = c.quantite_commandee > 0 ? Math.min(100, Math.round((c.quantite_recue / c.quantite_commandee) * 100)) : 0;
                  return (
                    <tr key={c.id} className={`border-t border-border hover:bg-muted/30 transition-colors ${isRetard ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{c.article_nom}</p>
                        {(c.famille || c.categorie) && <p className="text-xs text-muted-foreground">{c.famille}{c.categorie ? ` · ${c.categorie}` : ""}</p>}
                        {isRetard && <span className="text-xs text-destructive font-medium">⚠️ En retard</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">
                        {c.quantite_commandee} <span className="text-muted-foreground text-xs">{c.unite}</span>
                      </td>
                      <td className="px-4 py-3 text-right"><span className="text-emerald-500 font-medium">{c.quantite_recue}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <span className="text-primary font-medium">{c.quantite_restante}</span>
                          <div className="w-16 h-1 bg-muted rounded-full mt-1 ml-auto">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.fournisseur_nom || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.date_commande ? new Date(c.date_commande).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {c.date_prevue_livraison ? (
                          <span className={isRetard ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {new Date(c.date_prevue_livraison).toLocaleDateString("fr-FR")}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <select value={c.statut} onChange={(e) => updateStatut(c.id, e.target.value, c)}
                          className={`text-xs font-semibold border rounded-full px-2 py-1 bg-transparent focus:outline-none ${STATUT_LABELS[c.statut]?.color}`}>
                          <option value="pending">⏳ En attente</option>
                          <option value="partial">📦 Partielle</option>
                          <option value="received">✅ Réceptionnée</option>
                          <option value="cancelled">❌ Annulée</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.statut !== "received" && c.statut !== "cancelled" && (
                            <button onClick={() => setReception(c)}
                              className="flex items-center gap-1 px-2 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors">
                              <Package className="w-3 h-3" /> Recevoir
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => deleteCommande(c.id, c)}
                              className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reception && (
        <ReceptionModal commande={reception} onClose={() => setReception(null)}
          onSuccess={() => { loadCommandes(); onStatsChange(); }} />
      )}
    </div>
  );
}
