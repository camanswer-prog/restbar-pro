# 🚀 Guide Complet de Mise en Ligne — RESTBAR PRO

Ce guide vous explique pas à pas comment mettre en ligne votre **base de données (Supabase)** et votre **application web (React/Vite)**.

---

## 📋 Table des Matières
1. [Partie 1 : Mise en Ligne de la Base de Données (Supabase)](#partie-1--mise-en-ligne-de-la-base-de-données-supabase)
2. [Partie 2 : Mise en Ligne du Code Source (GitHub + Vercel/Render)](#partie-2--mise-en-ligne-du-code-source)
3. [Partie 3 : Liaison de l'Application et de la Base](#partie-3--liaison-application--base)
4. [Partie 4 : Création du 1er Administrateur & Vérifications](#partie-4--vérifications-finales)

---

## PARTIE 1 : Mise en Ligne de la Base de Données (Supabase)

Supabase fournit une base PostgreSQL managée gratuite et très performante, avec authentification et temps réel inclus.

### Étape 1.1 — Créer un projet Supabase
1. Rendez-vous sur [https://supabase.com](https://supabase.com) et créez un compte gratuit (ou connectez-vous avec GitHub).
2. Cliquez sur **"New Project"**.
3. Remplissez les informations :
   - **Name** : `restbar-pro` (ou le nom de votre établissement)
   - **Database Password** : Définissez un mot de passe fort et conservez-le en sécurité.
   - **Region** : Choisissez la région la plus proche de vos utilisateurs (ex: *Frankfurt*, *Paris* ou *London*).
4. Cliquez sur **"Create new project"** et patientez environ 1 à 2 minutes pendant que Supabase initialise votre base.

### Étape 1.2 — Exécuter la Migration SQL Unique
Vous avez un script SQL complet regroupant **100% du schéma** (Phase 1 & Phase 2, 22 tables, rôles Gérant/Serveur/Barman/Cuisine/Caissier/Magasinier, RLS) :
- Fichier : `supabase/migrations/20250101000000_restbar_complete_phase1_phase2.sql`
- Également accessible directement depuis l'onglet **"Console SQL"** dans l'application.

**Procédure dans Supabase :**
1. Dans le menu de gauche de votre tableau de bord Supabase, cliquez sur **"SQL Editor"** (icône `>_`).
2. Cliquez sur **"+ New query"**.
3. Ouvrez le fichier `supabase/migrations/20250101000000_restbar_complete_phase1_phase2.sql`, copiez l'intégralité de son contenu et collez-le dans l'éditeur.
4. Cliquez sur le bouton vert **"Run"** (ou Ctrl+Enter).
5. Supabase exécutera le script : vous verrez le message *"Success. No rows returned"* en bas.
6. Vérifiez dans l'onglet **"Table Editor"** : vous devez voir les 22 tables créées (`establishments`, `profiles`, `roles`, `dining_tables`, `orders`, `stock_items`, etc.).

### Étape 1.3 — Récupérer vos Clés API
1. Dans le menu de gauche, allez dans **Project Settings** (icône d'engrenage en bas) > **API**.
2. Notez précieusement :
   - **Project URL** (ex: `https://abcdefghijklm.supabase.co`)
   - **Project API Keys** > `anon` / `public` (clé commençant par `ey...`)

---

## PARTIE 2 : Mise en Ligne du Code Source

### Étape 2.1 — Mettre vos sources sur GitHub
Sur votre machine locale :
```bash
# 1. Initialiser le dépôt git si ce n'est pas fait
git init

# 2. Ajouter tous les fichiers (le .gitignore protège les secrets)
git add .

# 3. Créer le premier commit
git commit -m "feat: RestBar Pro - Code source complet avec migration unifiée"

# 4. Créer un dépôt sur github.com (ex: restbar-pro), puis lier le dépôt distant :
git branch -M main
git remote add origin https://github.com/VOTRE_PSEUDO/restbar-pro.git

# 5. Envoyer le code
git push -u origin main
```

---

### Étape 2.2 — Hébergement Web de l'Application

Vous avez 2 options simples et éprouvées :

#### OPTION A (Recommandée & Gratuite) : Vercel
Vercel héberge les applications React/Vite de manière optimale avec CDN mondial et certificat SSL (HTTPS) automatique.

1. Allez sur [https://vercel.com](https://vercel.com) et connectez-vous avec votre compte GitHub.
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Importez votre dépôt GitHub `restbar-pro`.
4. Dans les paramètres du projet :
   - **Framework Preset** : `Vite` (détecté automatiquement)
   - **Root Directory** : `./`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
5. Déroulez la section **Environment Variables** et ajoutez :
   - `VITE_SUPABASE_URL` = `https://votre-projet.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `votre_cle_anon_publique`
6. Cliquez sur **"Deploy"**. En 1 minute, votre site est en ligne avec une adresse du type `https://restbar-pro.vercel.app`.

---

#### OPTION B : Render (Si vous souhaitez exécuter le backend Node.js `server.ts`)
1. Rendez-vous sur [https://render.com](https://render.com).
2. Créez un **"Web Service"** connecté à votre dépôt GitHub.
3. Paramètres :
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
4. Ajoutez les variables d'environnement dans Render :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `PORT` = `3000`
5. Cliquez sur **"Deploy"**.

---

## PARTIE 3 : Liaison Application & Base de Données

### Configuration des Redirections Auth dans Supabase
Une fois que vous avez l'URL de votre site en ligne (ex: `https://restbar-pro.vercel.app`) :
1. Retournez dans votre tableau de bord **Supabase**.
2. Allez dans **Authentication** > **URL Configuration**.
3. Dans **Site URL**, mettez l'URL de votre application déployée : `https://restbar-pro.vercel.app`.
4. Dans **Redirect URLs**, ajoutez :
   - `https://restbar-pro.vercel.app/**`
   - `http://localhost:3000/**` (pour vos tests en local)
5. Cliquez sur **Save**.

---

## PARTIE 4 : Vérifications Finales & Premier Accès

1. Ouvrez l'URL de votre application déployée.
2. Si vous n'avez pas encore renseigné les variables d'environnement au build, vous pouvez cliquer sur le badge **"Connexion Supabase"** en haut à droite de l'écran et coller votre URL et clé Anon.
3. Créez votre premier compte Administrateur / Gérant.
4. Dans Supabase SQL Editor ou Table Editor, attribuez le rôle `gerant` ou `super_admin` au profil créé.
5. Vous êtes prêt pour la production !

---

### 💡 Aide-mémoire des Fichiers Clés
| Rôle | Fichier |
|---|---|
| Migration SQL complète (22 tables) | `supabase/migrations/20250101000000_restbar_complete_phase1_phase2.sql` |
| Variables d'environnement exemple | `.env.example` |
| Client de connexion Supabase | `src/lib/supabaseClient.ts` |
| Console SQL intégrée dans l'app | `src/components/sql-console/SqlConsoleView.tsx` |
