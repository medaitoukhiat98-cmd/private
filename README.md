# NATBERRY 16 — Gestion Commandes & Stock

Application full-stack de gestion des commandes et du stock pour intrants agricoles. Connectée à **Supabase** (PostgreSQL) avec authentification, rôles, exports et journal d'audit.

## Fonctionnalités

| Module | Détails |
|--------|---------|
| 🔐 **Auth** | Connexion / inscription email+mot de passe via Supabase Auth |
| 👥 **Rôles** | Admin (accès complet) · Employé (CRUD commandes/réceptions) |
| 📊 **Tableau de bord** | KPIs, graphiques statuts, top stocks, réceptions 30 jours |
| 📋 **Commandes** | CRUD complet, autocomplete 34 articles, progression réception |
| 📦 **Réceptions partielles** | Modal dédié, trigger auto mise à jour qty + statut + stock |
| 📦 **Stock** | Vue calculée en temps réel (entrées – sorties par article) |
| 📜 **Historique** | Tous les mouvements ENTREE/SORTIE filtrables |
| ⚠️ **Alertes retard** | Commandes en retard avec niveau d'urgence visuel |
| 📧 **Email alertes** | Génération email pré-rempli (mailto) pour les retards |
| 📥 **Export Excel** | Commandes, Stock, Historique (SheetJS) |
| 📄 **Export PDF** | Commandes et Stock tabulaire (jsPDF + autotable) |
| 🔍 **Journal d'audit** | Toutes les modifications avec données avant/après JSON |
| 🌙 **Thème** | Dark/Light avec bascule, dark par défaut |

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19 + TypeScript + Vite |
| UI | Tailwind CSS v4 + Radix UI + Lucide Icons |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Charts | Recharts |
| Export Excel | SheetJS (`xlsx`) |
| Export PDF | jsPDF + jspdf-autotable |
| Monorepo | pnpm workspaces |

## Structure du projet

```
artifacts-monorepo/
├── artifacts/
│   ├── natberry/          # Application principale (React + Vite)
│   │   ├── src/
│   │   │   ├── context/   # AuthContext (auth + rôles)
│   │   │   ├── lib/       # supabase.ts · audit.ts · exports.ts
│   │   │   ├── pages/     # Dashboard · Commandes · Stock · Historique · Alertes · Admin · Audit
│   │   │   └── components/# Layout · ReceptionModal · ManualMovementModal
│   │   └── package.json
│   └── api-server/        # Express API (optionnel, non utilisé pour les données)
├── lib/                   # Bibliothèques partagées
├── .env.example           # Template variables d'environnement
└── pnpm-workspace.yaml
```

## Installation locale

### Prérequis

- Node.js 20+
- pnpm 9+
- Un projet Supabase créé sur [supabase.com](https://supabase.com)

### 1. Cloner le dépôt

```bash
git clone https://github.com/<votre-compte>/natberry16.git
cd natberry16
pnpm install
```

### 2. Variables d'environnement

```bash
cp .env.example artifacts/natberry/.env
```

Remplissez les valeurs dans `artifacts/natberry/.env` :

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Base de données Supabase

Exécutez le script SQL complet dans **Supabase → SQL Editor** :

<details>
<summary>📋 Voir le script SQL complet</summary>

```sql
-- Tables articles, fournisseurs, commandes, receptions, mouvements_stock
-- + vues commandes_detail et stock_actuel
-- + triggers auto-reception
-- → Voir le fichier supabase/schema.sql pour le script complet
```

</details>

### 4. Lancer en développement

```bash
# Application web principale
pnpm --filter @workspace/natberry run dev

# API Express (optionnelle)
pnpm --filter @workspace/api-server run dev
```

L'application est disponible sur `http://localhost:<PORT>`.

### 5. Premier utilisateur admin

Après inscription via l'app, exécutez dans Supabase SQL Editor :

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'votre@email.com';
```

## Build de production

```bash
pnpm --filter @workspace/natberry run build
# Les fichiers statiques sont dans artifacts/natberry/dist/public/
```

## Variables d'environnement

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `VITE_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Clé publique (anon) Supabase |

> ⚠️ Les variables `VITE_*` sont intégrées au bundle au moment du build. Ne jamais committer `.env`.

## Schéma de base de données

| Table | Description |
|-------|-------------|
| `articles` | Catalogue des 34 intrants agricoles |
| `fournisseurs` | Fournisseurs (créés automatiquement) |
| `commandes` | Commandes avec statut et quantités |
| `receptions` | Réceptions partielles ou totales |
| `mouvements_stock` | Tous les mouvements ENTREE/SORTIE |
| `profiles` | Profils utilisateurs + rôle (admin/employé) |
| `audit_log` | Journal de toutes les modifications |

**Vues :**
- `commandes_detail` — Jointure commandes + article + fournisseur + compteur réceptions
- `stock_actuel` — Stock calculé en temps réel (entrées − sorties par article)

## Déploiement

L'application est configurée pour un déploiement statique (Vite build → fichiers HTML/CSS/JS).

Compatible avec : **Replit** · Vercel · Netlify · tout hébergeur de fichiers statiques.

## Licence

MIT
