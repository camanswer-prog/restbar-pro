-- ============================================================================
-- RESTBAR PRO — PHASE 1 : FONDATIONS & SCHÉMA POSTGRESQL / SUPABASE
-- Multi-établissements, RLS strictes, Fonctions de sécurité et Audit
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLES FONDAMENTALES
-- ============================================================================

-- A. Établissements (Multi-tenant racine)
CREATE TABLE IF NOT EXISTS public.establishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    legal_name VARCHAR(255),
    vat_number VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',
    currency VARCHAR(10) DEFAULT 'EUR',
    timezone VARCHAR(50) DEFAULT 'Europe/Paris',
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_establishments_status ON public.establishments(status);
CREATE INDEX IF NOT EXISTS idx_establishments_slug ON public.establishments(slug);

-- B. Profils Utilisateurs (Liés à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_super_admin ON public.profiles(is_super_admin) WHERE is_super_admin = TRUE;

-- C. Membres des Établissements (Liaison N-to-N profil <-> établissement)
CREATE TABLE IF NOT EXISTS public.establishment_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_establishment_member UNIQUE (establishment_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_members_est_id ON public.establishment_members(establishment_id);
CREATE INDEX IF NOT EXISTS idx_members_profile_id ON public.establishment_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_members_active ON public.establishment_members(establishment_id, is_active);

-- D. Rôles (Standards système ou personnalisés par établissement)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_role_code_per_est UNIQUE (establishment_id, code)
);

CREATE INDEX IF NOT EXISTS idx_roles_est_id ON public.roles(establishment_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);

-- E. Permissions (Granularité fonctionnelle RESTBAR PRO)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('orders', 'tables', 'kitchen', 'bar', 'billing', 'staff', 'reports', 'settings', 'licenses')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);

-- F. Permissions attribuées aux Rôles
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- G. Attribution des Rôles aux Membres
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_member_id UUID NOT NULL REFERENCES public.establishment_members(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_role UNIQUE (establishment_member_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_member ON public.user_roles(establishment_member_id);

-- H. Licences PRO & Abonnements
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    license_key VARCHAR(100) NOT NULL UNIQUE,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('starter', 'pro', 'enterprise', 'trial')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
    max_users INTEGER NOT NULL DEFAULT 5,
    max_registers INTEGER NOT NULL DEFAULT 2,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    features JSONB NOT NULL DEFAULT '{"kds": true, "multi_tills": true, "advanced_reports": true, "inventory": false}'::jsonb,
    signature VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_est_id ON public.licenses(establishment_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.licenses(status, expires_at);

-- I. Paramètres d'Établissement
CREATE TABLE IF NOT EXISTS public.establishment_settings (
    establishment_id UUID PRIMARY KEY REFERENCES public.establishments(id) ON DELETE CASCADE,
    vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
    service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '€',
    opening_hours JSONB NOT NULL DEFAULT '{"monday": {"open": "11:00", "close": "23:00"}, "tuesday": {"open": "11:00", "close": "23:00"}, "wednesday": {"open": "11:00", "close": "23:00"}, "thursday": {"open": "11:00", "close": "00:00"}, "friday": {"open": "11:00", "close": "02:00"}, "saturday": {"open": "11:00", "close": "02:00"}, "sunday": {"open": "12:00", "close": "22:00"}}'::jsonb,
    order_ticket_footer TEXT DEFAULT 'Merci de votre visite à bientôt !',
    sound_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    realtime_kds BOOLEAN NOT NULL DEFAULT TRUE,
    auto_close_orders BOOLEAN NOT NULL DEFAULT FALSE,
    kitchen_display_columns INTEGER NOT NULL DEFAULT 4,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- J. Journal d'Audit Sécurisé
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_est_id ON public.audit_logs(establishment_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================================================
-- 3. FONCTIONS DE SÉCURITÉ ET ACCÈS RLS (SECURITY DEFINER)
-- ============================================================================

-- Vérifie si l'utilisateur connecté est Super Administrateur
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE),
    FALSE
  );
$$;

-- Vérifie si l'utilisateur est membre actif d'un établissement
CREATE OR REPLACE FUNCTION public.is_establishment_member(p_est_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.establishment_members em
    JOIN public.establishments e ON e.id = em.establishment_id
    WHERE em.establishment_id = p_est_id
      AND em.profile_id = auth.uid()
      AND em.is_active = TRUE
      AND e.status = 'active'
  );
$$;

-- Récupère la liste des IDs d'établissements auxquels l'utilisateur a accès
CREATE OR REPLACE FUNCTION public.get_my_establishment_ids()
RETURNS TABLE (establishment_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT establishment_id FROM public.establishment_members
  WHERE profile_id = auth.uid() AND is_active = TRUE;
$$;

-- Vérifie si l'utilisateur a un rôle spécifique dans un établissement
CREATE OR REPLACE FUNCTION public.has_establishment_role(p_est_id UUID, p_role_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.establishment_members em
    JOIN public.user_roles ur ON ur.establishment_member_id = em.id
    JOIN public.roles r ON r.id = ur.role_id
    WHERE em.establishment_id = p_est_id
      AND em.profile_id = auth.uid()
      AND em.is_active = TRUE
      AND r.code = p_role_code
  );
$$;

-- Vérifie si l'utilisateur a une permission précise dans un établissement
CREATE OR REPLACE FUNCTION public.has_permission(p_est_id UUID, p_perm_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Le super admin dispose de toutes les permissions
  SELECT CASE
    WHEN public.is_super_admin() THEN TRUE
    ELSE EXISTS (
      SELECT 1 FROM public.establishment_members em
      JOIN public.user_roles ur ON ur.establishment_member_id = em.id
      JOIN public.role_permissions rp ON rp.role_id = ur.role_id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE em.establishment_id = p_est_id
        AND em.profile_id = auth.uid()
        AND em.is_active = TRUE
        AND p.code = p_perm_code
    )
  END;
$$;

-- ============================================================================
-- 4. POLITIQUES RLS (ROW LEVEL SECURITY)
-- ============================================================================

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- --- RLS : establishments ---
DROP POLICY IF EXISTS "establishments_select_policy" ON public.establishments;
CREATE POLICY "establishments_select_policy" ON public.establishments
FOR SELECT USING (
  public.is_super_admin() OR id IN (SELECT get_my_establishment_ids())
);

DROP POLICY IF EXISTS "establishments_insert_policy" ON public.establishments;
CREATE POLICY "establishments_insert_policy" ON public.establishments
FOR INSERT WITH CHECK (
  public.is_super_admin()
);

DROP POLICY IF EXISTS "establishments_update_policy" ON public.establishments;
CREATE POLICY "establishments_update_policy" ON public.establishments
FOR UPDATE USING (
  public.is_super_admin() OR (public.is_establishment_member(id) AND public.has_establishment_role(id, 'gerant'))
);

DROP POLICY IF EXISTS "establishments_delete_policy" ON public.establishments;
CREATE POLICY "establishments_delete_policy" ON public.establishments
FOR DELETE USING (
  public.is_super_admin()
);

-- --- RLS : profiles ---
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT USING (
  public.is_super_admin()
  OR id = auth.uid()
  OR id IN (
    SELECT profile_id FROM public.establishment_members
    WHERE establishment_id IN (SELECT get_my_establishment_ids())
  )
);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (
  id = auth.uid() OR public.is_super_admin()
);

-- --- RLS : establishment_members ---
DROP POLICY IF EXISTS "members_select_policy" ON public.establishment_members;
CREATE POLICY "members_select_policy" ON public.establishment_members
FOR SELECT USING (
  public.is_super_admin() OR establishment_id IN (SELECT get_my_establishment_ids())
);

DROP POLICY IF EXISTS "members_insert_policy" ON public.establishment_members;
CREATE POLICY "members_insert_policy" ON public.establishment_members
FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR (public.is_establishment_member(establishment_id) AND public.has_establishment_role(establishment_id, 'gerant'))
);

DROP POLICY IF EXISTS "members_update_policy" ON public.establishment_members;
CREATE POLICY "members_update_policy" ON public.establishment_members
FOR UPDATE USING (
  public.is_super_admin()
  OR (public.is_establishment_member(establishment_id) AND public.has_establishment_role(establishment_id, 'gerant'))
);

DROP POLICY IF EXISTS "members_delete_policy" ON public.establishment_members;
CREATE POLICY "members_delete_policy" ON public.establishment_members
FOR DELETE USING (
  public.is_super_admin()
  OR (public.is_establishment_member(establishment_id) AND public.has_establishment_role(establishment_id, 'gerant'))
);

-- --- RLS : roles & permissions ---
DROP POLICY IF EXISTS "roles_select_policy" ON public.roles;
CREATE POLICY "roles_select_policy" ON public.roles
FOR SELECT USING (
  is_system = TRUE OR establishment_id IN (SELECT get_my_establishment_ids()) OR public.is_super_admin()
);

DROP POLICY IF EXISTS "roles_write_policy" ON public.roles;
CREATE POLICY "roles_write_policy" ON public.roles
FOR ALL USING (
  public.is_super_admin()
  OR (establishment_id IS NOT NULL AND public.is_establishment_member(establishment_id) AND public.has_establishment_role(establishment_id, 'gerant'))
);

DROP POLICY IF EXISTS "permissions_select_policy" ON public.permissions;
CREATE POLICY "permissions_select_policy" ON public.permissions
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
CREATE POLICY "role_permissions_select" ON public.role_permissions
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "role_permissions_write" ON public.role_permissions;
CREATE POLICY "role_permissions_write" ON public.role_permissions
FOR ALL USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_id
      AND r.establishment_id IS NOT NULL
      AND public.is_establishment_member(r.establishment_id)
      AND public.has_establishment_role(r.establishment_id, 'gerant')
  )
);

-- --- RLS : user_roles ---
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.id = establishment_member_id
      AND em.establishment_id IN (SELECT get_my_establishment_ids())
  )
);

DROP POLICY IF EXISTS "user_roles_write_policy" ON public.user_roles;
CREATE POLICY "user_roles_write_policy" ON public.user_roles
FOR ALL USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.establishment_members em
    WHERE em.id = establishment_member_id
      AND public.is_establishment_member(em.establishment_id)
      AND public.has_establishment_role(em.establishment_id, 'gerant')
  )
);

-- --- RLS : licenses ---
DROP POLICY IF EXISTS "licenses_select_policy" ON public.licenses;
CREATE POLICY "licenses_select_policy" ON public.licenses
FOR SELECT USING (
  public.is_super_admin() OR establishment_id IN (SELECT get_my_establishment_ids())
);

-- Seul le Super Admin ou le Backend sécurisé peut insérer / modifier les licences
DROP POLICY IF EXISTS "licenses_write_policy" ON public.licenses;
CREATE POLICY "licenses_write_policy" ON public.licenses
FOR ALL USING (
  public.is_super_admin()
);

-- --- RLS : establishment_settings ---
DROP POLICY IF EXISTS "settings_select_policy" ON public.establishment_settings;
CREATE POLICY "settings_select_policy" ON public.establishment_settings
FOR SELECT USING (
  public.is_super_admin() OR establishment_id IN (SELECT get_my_establishment_ids())
);

DROP POLICY IF EXISTS "settings_update_policy" ON public.establishment_settings;
CREATE POLICY "settings_update_policy" ON public.establishment_settings
FOR UPDATE USING (
  public.is_super_admin()
  OR (public.is_establishment_member(establishment_id) AND public.has_establishment_role(establishment_id, 'gerant'))
);

-- --- RLS : audit_logs ---
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
FOR SELECT USING (
  public.is_super_admin()
  OR (establishment_id IS NOT NULL AND establishment_id IN (SELECT get_my_establishment_ids()) AND public.has_establishment_role(establishment_id, 'gerant'))
);

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
FOR INSERT WITH CHECK (
  public.is_super_admin() OR (establishment_id IS NOT NULL AND establishment_id IN (SELECT get_my_establishment_ids()))
);

-- ============================================================================
-- 5. DONNÉES DE RÉFÉRENCE (SYSTÈME) : PERMISSIONS & RÔLES INITIAUX
-- ============================================================================

INSERT INTO public.permissions (code, name, category, description) VALUES
-- Commandes
('orders.view', 'Consulter les commandes', 'orders', 'Visualiser les tickets de caisse et commandes en cours'),
('orders.create', 'Créer des commandes', 'orders', 'Prendre des commandes en salle ou au comptoir'),
('orders.modify', 'Modifier les commandes', 'orders', 'Ajouter/retirer des articles sur une commande existante'),
('orders.cancel', 'Annuler des commandes', 'orders', 'Annuler un ticket ou appliquer un avoir'),
-- Tables & Salle
('tables.view', 'Plan de salle', 'tables', 'Accès visuel à la disposition des tables'),
('tables.manage', 'Gérer les tables', 'tables', 'Attribuer, fusionner ou déplacer des tables'),
-- Bar & Cuisine (KDS)
('kitchen.kds_view', 'Écran Cuisine (KDS)', 'kitchen', 'Visualiser les bons envoyés en production cuisine'),
('kitchen.kds_action', 'Valider plats prêts', 'kitchen', 'Marquer les commandes comme prêtes ou servies'),
('bar.kds_view', 'Écran Bar', 'bar', 'Visualiser les bons boissons et cocktails'),
('bar.kds_action', 'Valider boissons prêtes', 'bar', 'Marquer les boissons préparées'),
-- Encaissement & Facturation
('billing.payment', 'Encaisser les clients', 'billing', 'Accepter paiements CB, espèces, tickets resto, split'),
('billing.discounts', 'Appliquer des remises', 'billing', 'Accorder des rabais ou offerts sur un ticket'),
('billing.refund', 'Rembourser / Annuler paiement', 'billing', 'Gérer les annulations de transaction'),
('billing.close_till', 'Clôture de caisse (Z)', 'billing', 'Édition du rapport Z de fin de service'),
-- Personnel & Équipe
('staff.view', 'Voir le personnel', 'staff', 'Consulter la liste des employés du restaurant'),
('staff.manage', 'Gérer les membres', 'staff', 'Créer, inviter, activer ou désactiver les membres'),
('staff.roles', 'Gérer les rôles et permissions', 'staff', 'Modifier la matrice des droits de l’établissement'),
-- Rapports & Chiffre d’affaires
('reports.view_daily', 'Rapport du jour', 'reports', 'Consulter le CA journalier et les ventes'),
('reports.view_advanced', 'Analyses financières', 'reports', 'Marges, analytics horaires, export comptable'),
-- Paramètres
('settings.view', 'Voir les paramètres', 'settings', 'Consulter la configuration de l’établissement'),
('settings.manage', 'Modifier les paramètres', 'settings', 'Taux de TVA, horaires, imprimantes, coordonnées'),
-- Licences
('licenses.manage', 'Gestion des licences PRO', 'licenses', 'Activer et renouveler la licence établissement')
ON CONFLICT (code) DO NOTHING;

-- Rôles Système de Référence (is_system = TRUE, establishment_id = NULL)
INSERT INTO public.roles (name, code, description, is_system) VALUES
('Gérant d''établissement', 'gerant', 'Contrôle total sur l''établissement, l''équipe et la gestion quotidienne', TRUE),
('Serveur / Serveuse', 'serveur', 'Prise de commande, suivi des tables et encaissement standard', TRUE),
('Barman', 'barman', 'Écran bar, préparation des boissons et gestion du comptoir', TRUE),
('Chef / Cuisine', 'cuisine', 'Écran cuisine KDS, préparation des plats et alertes rupture', TRUE),
('Caissier / Caissière', 'caissier', 'Encaissements, gestion du tiroir-caisse et clôtures de service', TRUE)
ON CONFLICT DO NOTHING;

-- Association Permissions Système <-> Rôles Système
DO $$
DECLARE
  v_role_gerant UUID;
  v_role_serveur UUID;
  v_role_barman UUID;
  v_role_cuisine UUID;
  v_role_caissier UUID;
BEGIN
  SELECT id INTO v_role_gerant FROM public.roles WHERE code = 'gerant' AND is_system = TRUE;
  SELECT id INTO v_role_serveur FROM public.roles WHERE code = 'serveur' AND is_system = TRUE;
  SELECT id INTO v_role_barman FROM public.roles WHERE code = 'barman' AND is_system = TRUE;
  SELECT id INTO v_role_cuisine FROM public.roles WHERE code = 'cuisine' AND is_system = TRUE;
  SELECT id INTO v_role_caissier FROM public.roles WHERE code = 'caissier' AND is_system = TRUE;

  -- Gérant a toutes les permissions sauf licence master
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_gerant, id FROM public.permissions WHERE code != 'licenses.manage'
  ON CONFLICT DO NOTHING;

  -- Serveur
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_serveur, id FROM public.permissions WHERE code IN (
    'orders.view', 'orders.create', 'orders.modify', 'tables.view', 'tables.manage', 'billing.payment'
  )
  ON CONFLICT DO NOTHING;

  -- Barman
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_barman, id FROM public.permissions WHERE code IN (
    'orders.view', 'bar.kds_view', 'bar.kds_action', 'orders.create', 'billing.payment'
  )
  ON CONFLICT DO NOTHING;

  -- Cuisine
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_cuisine, id FROM public.permissions WHERE code IN (
    'orders.view', 'kitchen.kds_view', 'kitchen.kds_action'
  )
  ON CONFLICT DO NOTHING;

  -- Caissier
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_caissier, id FROM public.permissions WHERE code IN (
    'orders.view', 'billing.payment', 'billing.discounts', 'billing.refund', 'billing.close_till', 'reports.view_daily'
  )
  ON CONFLICT DO NOTHING;
END $$;

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_establishments_updated BEFORE UPDATE ON public.establishments FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_members_updated BEFORE UPDATE ON public.establishment_members FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_licenses_updated BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_settings_updated BEFORE UPDATE ON public.establishment_settings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
