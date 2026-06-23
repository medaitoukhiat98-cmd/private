-- ═══════════════════════════════════════════════════════════════════
-- NATBERRY 16 — Schéma complet Supabase
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. TABLES PRINCIPALES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  famille TEXT NOT NULL DEFAULT 'ACHAT',
  categorie TEXT NOT NULL DEFAULT 'DIVERS',
  sous_categorie TEXT NOT NULL DEFAULT 'DIVERS',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fournisseurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  contact TEXT,
  telephone TEXT,
  email TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  fournisseur_id UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  quantite_commandee NUMERIC(12, 3) NOT NULL CHECK (quantite_commandee > 0),
  quantite_recue NUMERIC(12, 3) NOT NULL DEFAULT 0,
  quantite_restante NUMERIC(12, 3) GENERATED ALWAYS AS (quantite_commandee - quantite_recue) STORED,
  unite TEXT NOT NULL DEFAULT 'KG',
  date_commande DATE NOT NULL DEFAULT CURRENT_DATE,
  date_prevue_livraison DATE,
  statut TEXT NOT NULL DEFAULT 'pending'
    CHECK (statut IN ('pending', 'partial', 'received', 'cancelled')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  quantite_recue NUMERIC(12, 3) NOT NULL CHECK (quantite_recue > 0),
  date_reception TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  remarque TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mouvements_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE RESTRICT,
  commande_id UUID REFERENCES commandes(id) ON DELETE SET NULL,
  reception_id UUID REFERENCES receptions(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('ENTREE', 'SORTIE')),
  quantite NUMERIC(12, 3) NOT NULL CHECK (quantite > 0),
  unite TEXT,
  date_mouvement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  remarque TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. INDEXES ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_commandes_article ON commandes (article_id);
CREATE INDEX IF NOT EXISTS idx_commandes_statut ON commandes (statut);
CREATE INDEX IF NOT EXISTS idx_commandes_date ON commandes (date_commande DESC);
CREATE INDEX IF NOT EXISTS idx_receptions_commande ON receptions (commande_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_article ON mouvements_stock (article_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_date ON mouvements_stock (date_mouvement DESC);

-- ─── 3. TRIGGER AUTO-MISE À JOUR APRÈS RÉCEPTION ────────────────────

CREATE OR REPLACE FUNCTION fn_after_reception_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_commande RECORD;
  v_unite TEXT;
BEGIN
  SELECT c.*, a.nom AS article_nom
  INTO v_commande
  FROM commandes c
  JOIN articles a ON a.id = c.article_id
  WHERE c.id = NEW.commande_id;

  v_unite := v_commande.unite;

  -- Mise à jour quantite_recue
  UPDATE commandes
  SET
    quantite_recue = quantite_recue + NEW.quantite_recue,
    statut = CASE
      WHEN (quantite_recue + NEW.quantite_recue) >= quantite_commandee THEN 'received'
      WHEN (quantite_recue + NEW.quantite_recue) > 0 THEN 'partial'
      ELSE statut
    END,
    updated_at = NOW()
  WHERE id = NEW.commande_id;

  -- Insertion mouvement stock ENTREE
  INSERT INTO mouvements_stock (
    article_id, commande_id, reception_id,
    type, quantite, unite, date_mouvement, remarque
  ) VALUES (
    NEW.article_id, NEW.commande_id, NEW.id,
    'ENTREE', NEW.quantite_recue, v_unite,
    NEW.date_reception, NEW.remarque
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_after_reception_insert ON receptions;
CREATE TRIGGER trig_after_reception_insert
  AFTER INSERT ON receptions
  FOR EACH ROW EXECUTE FUNCTION fn_after_reception_insert();

-- ─── 4. VUES ────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW commandes_detail AS
SELECT
  c.*,
  a.nom AS article_nom,
  a.famille,
  a.categorie,
  f.nom AS fournisseur_nom,
  COUNT(r.id) AS nb_receptions,
  MAX(r.date_reception) AS derniere_reception
FROM commandes c
JOIN articles a ON a.id = c.article_id
LEFT JOIN fournisseurs f ON f.id = c.fournisseur_id
LEFT JOIN receptions r ON r.commande_id = c.id
GROUP BY c.id, a.nom, a.famille, a.categorie, f.nom;

CREATE OR REPLACE VIEW stock_actuel AS
SELECT
  a.id AS article_id,
  a.nom AS article_nom,
  a.famille,
  a.categorie,
  a.sous_categorie,
  (SELECT unite FROM mouvements_stock ms2 WHERE ms2.article_id = a.id ORDER BY ms2.date_mouvement DESC LIMIT 1) AS unite,
  COALESCE(SUM(CASE WHEN ms.type = 'ENTREE' THEN ms.quantite ELSE 0 END), 0) AS total_entrees,
  COALESCE(SUM(CASE WHEN ms.type = 'SORTIE' THEN ms.quantite ELSE 0 END), 0) AS total_sorties,
  COALESCE(SUM(CASE WHEN ms.type = 'ENTREE' THEN ms.quantite ELSE -ms.quantite END), 0) AS stock_actuel,
  MAX(ms.date_mouvement) AS derniere_activite
FROM articles a
LEFT JOIN mouvements_stock ms ON ms.article_id = a.id
GROUP BY a.id, a.nom, a.famille, a.categorie, a.sous_categorie;

-- ─── 5. PROFILS UTILISATEURS + AUDIT ────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nom TEXT,
  role TEXT NOT NULL DEFAULT 'employe' CHECK (role IN ('admin', 'employe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  description TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at DESC);

-- ─── 6. ROW LEVEL SECURITY ──────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON articles TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON fournisseurs TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON commandes TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON receptions TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON mouvements_stock TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "audit_select" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ─── 7. PREMIER ADMIN (à adapter après inscription) ─────────────────
-- UPDATE profiles SET role = 'admin' WHERE email = 'votre@email.com';
