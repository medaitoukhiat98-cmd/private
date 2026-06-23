import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Users, Shield, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  email: string;
  nom: string | null;
  role: "admin" | "employe";
  created_at: string;
};

export default function AdminPage() {
  const { profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadProfiles() {
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    if (data) setProfiles(data as Profile[]);
    setLoading(false);
  }

  useEffect(() => { loadProfiles(); }, []);

  async function updateRole(id: string, role: "admin" | "employe") {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      toast.error("Erreur lors de la mise à jour du rôle.");
    } else {
      toast.success(`Rôle mis à jour : ${role === "admin" ? "Administrateur" : "Employé"}`);
      loadProfiles();
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
        <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="font-bold text-foreground">👥 Gestion des utilisateurs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gérez les rôles des utilisateurs. Les administrateurs ont accès à toutes les fonctionnalités.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">Utilisateurs ({profiles.length})</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Chargement…</div>
        ) : profiles.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Aucun utilisateur inscrit.</div>
        ) : (
          <div className="divide-y divide-border">
            {profiles.map((p) => {
              const isSelf = p.id === currentProfile?.id;
              return (
                <div key={p.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {(p.nom ?? p.email ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {p.nom ?? "—"}
                        {isSelf && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Vous</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{p.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Inscrit le {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                      p.role === "admin"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {p.role === "admin" ? (
                        <><Shield className="w-3 h-3" /> Administrateur</>
                      ) : (
                        <><CheckCircle className="w-3 h-3" /> Employé</>
                      )}
                    </span>

                    {!isSelf && (
                      <select
                        value={p.role}
                        onChange={(e) => updateRole(p.id, e.target.value as "admin" | "employe")}
                        className="px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="employe">Employé</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-bold text-foreground mb-4">🔒 Rôles et permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PermTable role="Employé" permissions={[
            "✅ Créer des commandes",
            "✅ Réceptionner des commandes",
            "✅ Voir le stock",
            "✅ Mouvements manuels",
            "✅ Voir l'historique",
            "✅ Voir les alertes",
            "❌ Supprimer des commandes",
            "❌ Gérer les utilisateurs",
            "❌ Journal d'audit",
          ]} />
          <PermTable role="Administrateur" permissions={[
            "✅ Toutes les permissions employé",
            "✅ Supprimer des commandes",
            "✅ Annuler des commandes",
            "✅ Gérer les utilisateurs",
            "✅ Journal d'audit complet",
            "✅ Export Excel & PDF",
          ]} />
        </div>
      </div>
    </div>
  );
}

function PermTable({ role, permissions }: { role: string; permissions: string[] }) {
  return (
    <div className="bg-background border border-border rounded-xl p-4">
      <h4 className="font-semibold text-foreground mb-3">{role}</h4>
      <ul className="space-y-1.5">
        {permissions.map((p) => (
          <li key={p} className="text-sm text-muted-foreground">{p}</li>
        ))}
      </ul>
    </div>
  );
}
