import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { CommandeDetail } from "@/lib/supabase";
import { AlertTriangle, Clock, Mail, FileDown, FileSpreadsheet } from "lucide-react";
import { exportCommandesExcel, exportCommandesPDF } from "@/lib/exports";
import { useAuth } from "@/context/AuthContext";
import { logAudit } from "@/lib/audit";

export default function AlertesPage() {
  const { user } = useAuth();
  const [alertes, setAlertes] = useState<CommandeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailModal, setEmailModal] = useState(false);

  async function loadAlertes() {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("commandes_detail")
      .select("*")
      .lt("date_prevue_livraison", today)
      .not("statut", "in", '("received","cancelled")')
      .order("date_prevue_livraison", { ascending: true });

    if (!error && data) setAlertes(data as CommandeDetail[]);
    setLoading(false);
  }

  useEffect(() => { loadAlertes(); }, []);

  function joursRetard(date: string) {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }

  async function updateStatut(id: string, statut: string, alerte: CommandeDetail) {
    const { error } = await supabase.from("commandes").update({ statut }).eq("id", id);
    if (!error) {
      await logAudit({
        userId: user?.id,
        userEmail: user?.email,
        tableName: "commandes",
        recordId: id,
        action: "UPDATE",
        description: `Commande ${alerte.article_nom} — statut changé en "${statut}" depuis les alertes`,
        oldData: { statut: alerte.statut },
        newData: { statut },
      });
      loadAlertes();
    }
  }

  function buildEmailContent() {
    const lines = alertes.map((a) => {
      const retard = joursRetard(a.date_prevue_livraison!);
      return `• ${a.article_nom} — prévu le ${new Date(a.date_prevue_livraison!).toLocaleDateString("fr-FR")} — retard de ${retard} jour(s) — fournisseur : ${a.fournisseur_nom ?? "N/A"}`;
    });
    return `Bonjour,\n\nVoici les commandes en retard de livraison au ${new Date().toLocaleDateString("fr-FR")} :\n\n${lines.join("\n")}\n\nMerci de prendre les mesures nécessaires.\n\nCordialement,\nNATBERRY 16`;
  }

  function handleMailto() {
    const subject = `[NATBERRY 16] ${alertes.length} commande(s) en retard — ${new Date().toLocaleDateString("fr-FR")}`;
    const body = buildEmailContent();
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 bg-destructive/10 border border-destructive/30 rounded-2xl p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-foreground">⚠️ Alertes de retard</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Commandes dont la date de livraison prévue est dépassée.
            </p>
          </div>
        </div>

        {alertes.length > 0 && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={handleMailto}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-sm font-semibold rounded-xl border border-blue-500/20 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email alertes
            </button>
            <button
              onClick={() => exportCommandesExcel(alertes)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-sm font-semibold rounded-xl border border-emerald-500/20 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={() => exportCommandesPDF(alertes)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold rounded-xl border border-red-500/20 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
          </div>
        )}
      </div>

      {/* Email preview modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEmailModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-foreground mb-3">📧 Contenu de l'email d'alerte</h3>
            <pre className="text-sm text-muted-foreground bg-background border border-border rounded-xl p-4 whitespace-pre-wrap overflow-auto max-h-64">
              {buildEmailContent()}
            </pre>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { navigator.clipboard.writeText(buildEmailContent()); }}
                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold rounded-xl transition-colors"
              >
                📋 Copier
              </button>
              <button
                onClick={() => { handleMailto(); setEmailModal(false); }}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                📨 Ouvrir dans l'email
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Chargement...</div>
      ) : alertes.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="font-bold text-foreground text-lg">Aucune alerte</h3>
          <p className="text-muted-foreground text-sm mt-1">Toutes les commandes sont dans les délais.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertes.map((c) => {
            const retard = joursRetard(c.date_prevue_livraison!);
            const urgence = retard >= 7 ? "critique" : retard >= 3 ? "elevee" : "normale";
            const urgenceColors = {
              critique: "border-destructive bg-destructive/5",
              elevee: "border-orange-500/50 bg-orange-500/5",
              normale: "border-yellow-500/50 bg-yellow-500/5",
            };
            const badgeColors = {
              critique: "bg-destructive text-white",
              elevee: "bg-orange-500 text-white",
              normale: "bg-yellow-500 text-white",
            };
            const pct = c.quantite_commandee > 0
              ? Math.min(100, Math.round((c.quantite_recue / c.quantite_commandee) * 100))
              : 0;

            return (
              <div key={c.id} className={`bg-card border-2 rounded-2xl p-5 ${urgenceColors[urgence]}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground text-base">{c.article_nom}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColors[urgence]}`}>
                        +{retard} jour{retard > 1 ? "s" : ""}
                      </span>
                    </div>
                    {(c.famille || c.categorie) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.famille}{c.categorie ? ` · ${c.categorie}` : ""}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <InfoItem label="Commandée" value={`${c.quantite_commandee} ${c.unite}`} />
                      <InfoItem label="Reçue" value={`${c.quantite_recue} ${c.unite}`} color="emerald" />
                      <InfoItem label="Restante" value={`${c.quantite_restante} ${c.unite}`} color="primary" />
                      <InfoItem label="Fournisseur" value={c.fournisseur_nom || "—"} />
                    </div>
                    <div className="mt-3 max-w-sm">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Progression réception</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        Prévue le{" "}
                        <strong className="text-destructive">
                          {new Date(c.date_prevue_livraison!).toLocaleDateString("fr-FR")}
                        </strong>
                        {" "}— commandée le {new Date(c.date_commande).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {c.note && <p className="text-xs text-muted-foreground mt-2 italic">📝 {c.note}</p>}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => updateStatut(c.id, "cancelled", c)}
                      className="px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                    <div className="text-xs text-center text-muted-foreground">
                      {c.nb_receptions} réception{c.nb_receptions !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, color }: { label: string; value: string; color?: "emerald" | "primary" }) {
  const textColor = color === "emerald" ? "text-emerald-500" : color === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="bg-background/60 rounded-lg p-2">
      <p className={`text-sm font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
