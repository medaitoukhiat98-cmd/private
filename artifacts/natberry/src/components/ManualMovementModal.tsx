import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X } from "lucide-react";

type Props = {
  articleId: string;
  articleNom: string;
  type: "ENTREE" | "SORTIE";
  onClose: () => void;
  onSuccess: () => void;
};

export default function ManualMovementModal({
  articleId,
  articleNom,
  type,
  onClose,
  onSuccess,
}: Props) {
  const [qty, setQty] = useState<number>(1);
  const [unite, setUnite] = useState("KG");
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

    const { error: err } = await supabase.from("mouvements_stock").insert({
      article_id: articleId,
      type,
      quantite: qty,
      unite,
      remarque: remarque || null,
      date_mouvement: new Date().toISOString(),
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {type === "ENTREE" ? "➕ Entrée manuelle" : "➖ Sortie stock"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-muted/50 rounded-xl">
          <p className="font-semibold text-foreground text-sm">{articleNom}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Quantité
              </label>
              <input
                type="number"
                min={0.001}
                step={0.001}
                value={qty}
                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Unité
              </label>
              <select
                value={unite}
                onChange={(e) => setUnite(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                {["KG","T (Tonne)","L (Litre)","M³","Pièce","Sac","Boîte","Palette","Bidon","Carton","Unité"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Remarque (optionnel)
            </label>
            <textarea
              value={remarque}
              onChange={(e) => setRemarque(e.target.value)}
              placeholder="Motif du mouvement..."
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
            className={`w-full py-2.5 font-semibold text-white rounded-lg transition-colors disabled:opacity-50 ${
              type === "ENTREE"
                ? "bg-primary hover:bg-primary/90"
                : "bg-destructive hover:bg-destructive/90"
            }`}
          >
            {loading ? "Enregistrement..." : type === "ENTREE" ? "Confirmer l'entrée" : "Confirmer la sortie"}
          </button>
        </form>
      </div>
    </div>
  );
}
