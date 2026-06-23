import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CommandeDetail } from "@/lib/supabase";
import { X } from "lucide-react";

type Props = {
  commande: CommandeDetail;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ReceptionModal({ commande, onClose, onSuccess }: Props) {
  const [qty, setQty] = useState<number>(
    Math.max(0, commande.quantite_commandee - commande.quantite_recue)
  );
  const [remarque, setRemarque] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (qty <= 0) {
      setError("La quantité doit être supérieure à 0");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.from("receptions").insert({
      commande_id: commande.id,
      article_id: commande.article_id,
      quantite_recue: qty,
      remarque: remarque || null,
      date_reception: new Date().toISOString(),
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    onSuccess();
    onClose();
  }

  const restante = Math.max(0, commande.quantite_commandee - commande.quantite_recue);
  const pctRecue =
    commande.quantite_commandee > 0
      ? Math.min(100, Math.round((commande.quantite_recue / commande.quantite_commandee) * 100))
      : 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">📦 Réception partielle</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-5 p-4 bg-muted/50 rounded-xl">
          <p className="font-semibold text-foreground">{commande.article_nom}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {commande.famille}{commande.categorie ? ` · ${commande.categorie}` : ""}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-background rounded-lg p-2">
              <p className="text-lg font-bold text-foreground">{commande.quantite_commandee}</p>
              <p className="text-xs text-muted-foreground">Commandée</p>
            </div>
            <div className="bg-background rounded-lg p-2">
              <p className="text-lg font-bold text-emerald-500">{commande.quantite_recue}</p>
              <p className="text-xs text-muted-foreground">Déjà reçue</p>
            </div>
            <div className="bg-background rounded-lg p-2">
              <p className="text-lg font-bold text-primary">{restante}</p>
              <p className="text-xs text-muted-foreground">Restante</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progression</span>
              <span>{pctRecue}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pctRecue}%` }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Quantité à recevoir
            </label>
            <input
              type="number"
              min={0.001}
              step={0.001}
              max={restante * 1.05}
              value={qty}
              onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Remarques (optionnel)
            </label>
            <textarea
              value={remarque}
              onChange={(e) => setRemarque(e.target.value)}
              placeholder="Observations, état de la livraison..."
              rows={2}
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? "Enregistrement..." : "✅ Confirmer la réception"}
          </button>
        </form>
      </div>
    </div>
  );
}
