import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Article = {
  id: string;
  nom: string;
  famille: string;
  categorie: string;
  sous_categorie: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
};

export type Fournisseur = {
  id: string;
  nom: string;
  contact: string | null;
  telephone: string | null;
  email: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
};

export type CommandeStatut = "pending" | "partial" | "received" | "cancelled";

export type Commande = {
  id: string;
  fournisseur_id: string | null;
  article_id: string;
  quantite_commandee: number;
  quantite_recue: number;
  quantite_restante: number;
  unite: string;
  date_commande: string;
  date_prevue_livraison: string | null;
  statut: CommandeStatut;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type CommandeDetail = Commande & {
  fournisseur_nom: string | null;
  article_nom: string;
  famille: string | null;
  categorie: string | null;
  nb_receptions: number;
  derniere_reception: string | null;
};

export type Reception = {
  id: string;
  commande_id: string;
  article_id: string;
  quantite_recue: number;
  date_reception: string;
  remarque: string | null;
  created_at: string;
  updated_at: string;
};

export type MouvementStock = {
  id: string;
  article_id: string;
  commande_id: string | null;
  reception_id: string | null;
  type: "ENTREE" | "SORTIE";
  quantite: number;
  unite: string | null;
  date_mouvement: string;
  remarque: string | null;
  created_at: string;
};

export type StockActuel = {
  article_id: string;
  article_nom: string;
  famille: string | null;
  categorie: string | null;
  unite: string | null;
  total_entrees: number;
  total_sorties: number;
  stock_actuel: number;
  derniere_activite: string | null;
};
