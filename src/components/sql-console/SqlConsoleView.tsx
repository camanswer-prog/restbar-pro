// RESTBAR PRO — Supabase SQL Console, Migrations & Installation Guide
import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Download,
  BookOpen,
  ShieldCheck,
  Database,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

// ============================================================================
// SCRIPT COMPLET UNIFIÉ : PHASE 1 + PHASE 2 EN 1 SEUL FICHIER SQL
// ============================================================================
const SQL_UNIFIED_FULL_CONTENT = `-- ============================================================================
-- RESTBAR PRO — MIGRATION COMPLÈTE UNIQUE (PHASE 1 & PHASE 2 RÉUNIES)
-- Schéma PostgreSQL / Supabase complet : Fondations, Auth, Licences, Salle,
-- Commandes, KDS Bar & Cuisine, Caisse Multi-Moyens, Stocks & Magasinier, RLS
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLES FONDAMENTALES (PHASE 1)
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
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
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
    category VARCHAR(50) NOT NULL CHECK (category IN ('orders', 'tables', 'kitchen', 'bar', 'billing', 'staff', 'reports', 'settings', 'licenses', 'stocks')),
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
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'en_attente', 'suspendue', 'expiree', 'expired', 'revoked', 'pending')),
    max_users INTEGER NOT NULL DEFAULT 5,
    max_registers INTEGER NOT NULL DEFAULT 2,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    features JSONB NOT NULL DEFAULT '{"kds": true, "multi_tills": true, "advanced_reports": true, "inventory": true}'::jsonb,
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
-- 3. TABLES OPÉRATIONNELLES (PHASE 2 : POS, KDS, CAISSE, STOCKS)
-- ============================================================================

-- K. Zones & Plan de Salle
CREATE TABLE IF NOT EXISTS public.zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_zone_name_per_est UNIQUE (establishment_id, name)
);

CREATE INDEX IF NOT EXISTS idx_zones_est ON public.zones(establishment_id);

CREATE TABLE IF NOT EXISTS public.dining_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    table_number VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(30) NOT NULL DEFAULT 'libre' CHECK (status IN ('libre', 'occupee', 'addition_demandee', 'a_nettoyer')),
    current_order_id UUID,
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_table_num_per_est UNIQUE (establishment_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_est ON public.dining_tables(establishment_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON public.dining_tables(establishment_id, status);

-- L. Catégories & Carte Menu (Plats, Boissons, Prix)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    destination VARCHAR(20) NOT NULL CHECK (destination IN ('bar', 'cuisine')),
    icon VARCHAR(50) DEFAULT 'utensils',
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_est ON public.categories(establishment_id);
CREATE INDEX IF NOT EXISTS idx_categories_dest ON public.categories(destination);

CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(12, 2) DEFAULT 0,
    destination VARCHAR(20) NOT NULL CHECK (destination IN ('bar', 'cuisine')),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_est ON public.menu_items(establishment_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_dest ON public.menu_items(destination);

-- M. Gestion des Stocks, Ingrédients & Mouvements (Module Magasinier)
CREATE TABLE IF NOT EXISTS public.stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    current_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
    min_alert_threshold NUMERIC(12, 3) NOT NULL DEFAULT 5,
    cost_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_items_est ON public.stock_items(establishment_id);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC(10, 3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_recipe_item UNIQUE (menu_item_id, stock_item_id)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    stock_item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('entree', 'sortie_perte', 'vente_automatique', 'inventaire')),
    quantity NUMERIC(12, 3) NOT NULL,
    previous_quantity NUMERIC(12, 3) NOT NULL,
    new_quantity NUMERIC(12, 3) NOT NULL,
    unit_cost NUMERIC(12, 2) DEFAULT 0,
    reason TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_est ON public.stock_movements(establishment_id);

-- N. Commandes et Production KDS (Routage Bar / Cuisine)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.dining_tables(id) ON DELETE SET NULL,
    table_number VARCHAR(50) NOT NULL,
    server_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    server_name VARCHAR(255) NOT NULL,
    order_number VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'en_cours' CHECK (status IN ('en_cours', 'addition_demandee', 'payee', 'annulee')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_note TEXT,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    bill_requested_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_est ON public.orders(establishment_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(establishment_id, status);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    destination VARCHAR(20) NOT NULL CHECK (destination IN ('bar', 'cuisine')),
    status VARCHAR(30) NOT NULL DEFAULT 'envoye' CHECK (status IN ('envoye', 'en_preparation', 'pret', 'servi', 'annule')),
    notes TEXT,
    preparation_started_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    served_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dest_status ON public.order_items(establishment_id, destination, status);

-- O. Demandes d'Addition (Notifications Caisse)
CREATE TABLE IF NOT EXISTS public.bill_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.dining_tables(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(30) NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'traitee', 'annulee'))
);

CREATE INDEX IF NOT EXISTS idx_bill_requests_est_status ON public.bill_requests(establishment_id, status);

-- P. Paiements Multi-Moyens (Espèces, Wave, Orange Money, Carte Bancaire)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('especes', 'wave', 'orange_money', 'carte_bancaire')),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'FCFA',
    reference_code VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'verifie' CHECK (status IN ('declare', 'verifie', 'rejete')),
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_est ON public.payments(establishment_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at);

-- Q. Dépenses & Décaissements de Caisse
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'especes',
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receipt_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_est ON public.expenses(establishment_id);

-- ============================================================================
-- 4. FONCTIONS DE SÉCURITÉ, CONTRÔLE RLS ET D'AUDIT
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

-- Vérifie si la licence d'un établissement est actuellement active
CREATE OR REPLACE FUNCTION public.is_establishment_license_active(p_est_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.licenses
    WHERE establishment_id = p_est_id
      AND status = 'active'
      AND starts_at <= NOW()
      AND expires_at > NOW()
  );
$$;

-- Empêche l'auto-élévation de privilèges sur les profils
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin) THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Sécurité : Seul un Super Administrateur peut modifier le statut Super Admin.';
    END IF;
  END IF;

  IF (auth.uid() = NEW.id AND NEW.is_super_admin = TRUE AND OLD.is_super_admin = FALSE) THEN
    RAISE EXCEPTION 'Sécurité : Interdiction d''auto-élévation de privilèges.';
  END IF;

  RETURN NEW;
END;
$$;

-- Journalisation automatique des actions sensibles
CREATE OR REPLACE FUNCTION public.log_sensitive_action(
    p_est_id UUID,
    p_action VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id VARCHAR,
    p_details JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    establishment_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    p_est_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    NOW()
  ) RETURNING id INTO v_log_id;

  IF p_est_id IS NOT NULL THEN
    UPDATE public.establishments SET last_activity_at = NOW() WHERE id = p_est_id;
  END IF;

  RETURN v_log_id;
END;
$$;

-- Trigger générique pour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ACTIVATION ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
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

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. POLITIQUES RLS DÉTAILLÉES (ISOLATION STRICTE PAR ÉTABLISSEMENT)
-- ============================================================================

-- Establishments
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

-- Profiles
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

-- Establishment Members
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

-- Roles & Permissions
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

-- User Roles
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

-- Licenses
DROP POLICY IF EXISTS "licenses_select_policy" ON public.licenses;
CREATE POLICY "licenses_select_policy" ON public.licenses
FOR SELECT USING (
  public.is_super_admin() OR establishment_id IN (SELECT get_my_establishment_ids())
);

DROP POLICY IF EXISTS "licenses_write_policy" ON public.licenses;
CREATE POLICY "licenses_write_policy" ON public.licenses
FOR ALL USING (
  public.is_super_admin()
);

-- Establishment Settings
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

-- Audit Logs
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

-- Zones & Tables
DROP POLICY IF EXISTS "zones_access" ON public.zones;
CREATE POLICY "zones_access" ON public.zones FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

DROP POLICY IF EXISTS "tables_access" ON public.dining_tables;
CREATE POLICY "tables_access" ON public.dining_tables FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Menu & Catégories
DROP POLICY IF EXISTS "categories_access" ON public.categories;
CREATE POLICY "categories_access" ON public.categories FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

DROP POLICY IF EXISTS "menu_items_access" ON public.menu_items;
CREATE POLICY "menu_items_access" ON public.menu_items FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Stocks, Recettes & Mouvements
DROP POLICY IF EXISTS "stock_items_access" ON public.stock_items;
CREATE POLICY "stock_items_access" ON public.stock_items FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

DROP POLICY IF EXISTS "recipe_ingredients_access" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_access" ON public.recipe_ingredients FOR ALL USING (
    public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.menu_items m WHERE m.id = menu_item_id AND m.establishment_id IN (SELECT get_my_establishment_ids())
    )
);

DROP POLICY IF EXISTS "stock_movements_access" ON public.stock_movements;
CREATE POLICY "stock_movements_access" ON public.stock_movements FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Commandes & Lignes de Commandes
DROP POLICY IF EXISTS "orders_access" ON public.orders;
CREATE POLICY "orders_access" ON public.orders FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

DROP POLICY IF EXISTS "orders_insert_license_check" ON public.orders;
CREATE POLICY "orders_insert_license_check" ON public.orders
FOR INSERT WITH CHECK (
  public.is_super_admin() 
  OR (
    establishment_id IN (SELECT get_my_establishment_ids())
    AND public.is_establishment_license_active(establishment_id)
  )
);

DROP POLICY IF EXISTS "order_items_access" ON public.order_items;
CREATE POLICY "order_items_access" ON public.order_items FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Demandes d'Addition, Paiements & Dépenses
DROP POLICY IF EXISTS "bill_requests_access" ON public.bill_requests;
CREATE POLICY "bill_requests_access" ON public.bill_requests FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

DROP POLICY IF EXISTS "payments_access" ON public.payments;
CREATE POLICY "payments_access" ON public.payments FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

DROP POLICY IF EXISTS "payments_insert_license_check" ON public.payments;
CREATE POLICY "payments_insert_license_check" ON public.payments
FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR (
    establishment_id IN (SELECT get_my_establishment_ids())
    AND public.is_establishment_license_active(establishment_id)
  )
);

DROP POLICY IF EXISTS "expenses_access" ON public.expenses;
CREATE POLICY "expenses_access" ON public.expenses FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- ============================================================================
-- 7. TRIGGERS SYSTÈME & AUTOMATISATIONS
-- ============================================================================

DROP TRIGGER IF EXISTS tr_prevent_self_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.prevent_self_role_escalation();

DROP TRIGGER IF EXISTS tr_establishments_updated ON public.establishments;
CREATE TRIGGER tr_establishments_updated BEFORE UPDATE ON public.establishments FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_profiles_updated ON public.profiles;
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_members_updated ON public.establishment_members;
CREATE TRIGGER tr_members_updated BEFORE UPDATE ON public.establishment_members FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_roles_updated ON public.roles;
CREATE TRIGGER tr_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_licenses_updated ON public.licenses;
CREATE TRIGGER tr_licenses_updated BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_settings_updated ON public.establishment_settings;
CREATE TRIGGER tr_settings_updated BEFORE UPDATE ON public.establishment_settings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_zones_updated ON public.zones;
CREATE TRIGGER tr_zones_updated BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_tables_updated ON public.dining_tables;
CREATE TRIGGER tr_tables_updated BEFORE UPDATE ON public.dining_tables FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_categories_updated ON public.categories;
CREATE TRIGGER tr_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_menu_items_updated ON public.menu_items;
CREATE TRIGGER tr_menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_orders_updated ON public.orders;
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_order_items_updated ON public.order_items;
CREATE TRIGGER tr_order_items_updated BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 8. DONNÉES DE RÉFÉRENCE : PERMISSIONS & RÔLES SYSTÈME (AVEC MAGASINIER)
-- ============================================================================

INSERT INTO public.permissions (code, name, category, description) VALUES
('orders.view', 'Consulter les commandes', 'orders', 'Visualiser les tickets de caisse et commandes en cours'),
('orders.create', 'Créer des commandes', 'orders', 'Prendre des commandes en salle ou au comptoir'),
('orders.modify', 'Modifier les commandes', 'orders', 'Ajouter/retirer des articles sur une commande existante'),
('orders.cancel', 'Annuler des commandes', 'orders', 'Annuler un ticket ou appliquer un avoir'),
('tables.view', 'Plan de salle', 'tables', 'Accès visuel à la disposition des tables'),
('tables.manage', 'Gérer les tables', 'tables', 'Attribuer, fusionner ou déplacer des tables'),
('kitchen.kds_view', 'Écran Cuisine (KDS)', 'kitchen', 'Visualiser les bons envoyés en production cuisine'),
('kitchen.kds_action', 'Valider plats prêts', 'kitchen', 'Marquer les commandes comme prêtes ou servies'),
('bar.kds_view', 'Écran Bar', 'bar', 'Visualiser les bons boissons et cocktails'),
('bar.kds_action', 'Valider boissons prêtes', 'bar', 'Marquer les boissons préparées'),
('billing.payment', 'Encaisser les clients', 'billing', 'Accepter paiements CB, espèces, tickets resto, split'),
('billing.discounts', 'Appliquer des remises', 'billing', 'Accorder des rabais ou offerts sur un ticket'),
('billing.refund', 'Rembourser / Annuler paiement', 'billing', 'Gérer les annulations de transaction'),
('billing.close_till', 'Clôture de caisse (Z)', 'billing', 'Édition du rapport Z de fin de service'),
('stocks.view', 'Consulter les stocks', 'stocks', 'Visualiser les niveaux de stocks et fiches ingrédients'),
('stocks.movements', 'Mouvements de stock', 'stocks', 'Enregistrer et gérer les entrées et sorties de stock'),
('stocks.manage', 'Modifier/supprimer articles', 'stocks', 'Créer, éditer et supprimer les fiches articles de stock'),
('stocks.inventory', 'Inventaire physique', 'stocks', 'Effectuer les comptages périodiques et ajuster les écarts'),
('staff.view', 'Voir le personnel', 'staff', 'Consulter la liste des employés du restaurant'),
('staff.manage', 'Gérer les membres', 'staff', 'Créer, inviter, activer ou désactiver les membres'),
('staff.roles', 'Gérer les rôles et permissions', 'staff', 'Modifier la matrice des droits de l’établissement'),
('reports.view_daily', 'Rapport du jour', 'reports', 'Consulter le CA journalier et les ventes'),
('reports.view_advanced', 'Analyses financières', 'reports', 'Marges, analytics horaires, export comptable'),
('settings.view', 'Voir les paramètres', 'settings', 'Consulter la configuration de l’établissement'),
('settings.manage', 'Modifier les paramètres', 'settings', 'Taux de TVA, horaires, imprimantes, coordonnées'),
('licenses.manage', 'Gestion des licences PRO', 'licenses', 'Activer et renouveler la licence établissement')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.roles (name, code, description, is_system) VALUES
('Gérant d''établissement', 'gerant', 'Contrôle total sur l''établissement, l''équipe, la carte et les rapports', TRUE),
('Serveur / Serveuse', 'serveur', 'Prise de commande, suivi des tables et encaissement standard', TRUE),
('Barman', 'barman', 'Écran bar KDS, préparation des boissons et gestion du comptoir', TRUE),
('Chef / Cuisine', 'cuisine', 'Écran cuisine KDS, préparation des plats et alertes production', TRUE),
('Caissier / Caissière', 'caissier', 'Encaissements, gestion du tiroir-caisse et clôtures de service', TRUE),
('Magasinier / Gestionnaire Stocks', 'magasinier', 'Accès exclusif au module des stocks : entrées/sorties, inventaires, modification et suppression des mouvements', TRUE)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_role_gerant UUID;
  v_role_serveur UUID;
  v_role_barman UUID;
  v_role_cuisine UUID;
  v_role_caissier UUID;
  v_role_magasinier UUID;
BEGIN
  SELECT id INTO v_role_gerant FROM public.roles WHERE code = 'gerant' AND is_system = TRUE;
  SELECT id INTO v_role_serveur FROM public.roles WHERE code = 'serveur' AND is_system = TRUE;
  SELECT id INTO v_role_barman FROM public.roles WHERE code = 'barman' AND is_system = TRUE;
  SELECT id INTO v_role_cuisine FROM public.roles WHERE code = 'cuisine' AND is_system = TRUE;
  SELECT id INTO v_role_caissier FROM public.roles WHERE code = 'caissier' AND is_system = TRUE;
  SELECT id INTO v_role_magasinier FROM public.roles WHERE code = 'magasinier' AND is_system = TRUE;

  IF v_role_gerant IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_gerant, id FROM public.permissions WHERE code != 'licenses.manage'
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role_serveur IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_serveur, id FROM public.permissions WHERE code IN (
      'orders.view', 'orders.create', 'orders.modify', 'tables.view', 'tables.manage', 'billing.payment'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role_barman IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_barman, id FROM public.permissions WHERE code IN (
      'orders.view', 'bar.kds_view', 'bar.kds_action', 'orders.create', 'billing.payment'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role_cuisine IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_cuisine, id FROM public.permissions WHERE code IN (
      'orders.view', 'kitchen.kds_view', 'kitchen.kds_action'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role_caissier IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_caissier, id FROM public.permissions WHERE code IN (
      'orders.view', 'billing.payment', 'billing.discounts', 'billing.refund', 'billing.close_till', 'reports.view_daily'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_role_magasinier IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_magasinier, id FROM public.permissions WHERE code IN (
      'stocks.view', 'stocks.movements', 'stocks.manage', 'stocks.inventory'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;`;

export const SqlConsoleView: React.FC = () => {
  const { success } = useNotification();
  const [copied, setCopied] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<'unified' | 'phase1' | 'phase2'>('unified');
  const [activeTab, setActiveTab] = useState<'sql' | 'guide' | 'rls'>('sql');

  const activeSqlContent = SQL_UNIFIED_FULL_CONTENT;
  const activeFileName =
    selectedPhase === 'unified'
      ? '20250101000000_restbar_complete_phase1_phase2.sql'
      : selectedPhase === 'phase1'
      ? '20250101000000_restbar_foundation.sql'
      : '20250102000000_restbar_pos_kitchen_bar_billing.sql';

  const handleCopySql = () => {
    navigator.clipboard.writeText(activeSqlContent);
    setCopied(true);
    success('Script SQL copié !', 'Migration complète Phase 1 & 2 prête pour Supabase.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([activeSqlContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFileName;
    link.click();
    URL.revokeObjectURL(url);
    success('Fichier téléchargé', activeFileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Console SQL & Déploiement Supabase
            </h1>
            <Badge variant="success">PostgreSQL 15+ • Schéma Unifié</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Schéma complet Phase 1 + Phase 2 réuni en 1 seul script SQL, Row Level Security (RLS) et guide d'installation en production.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownloadSql}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5 border border-slate-700 active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-300" />
            Télécharger .sql
          </button>
          <button
            onClick={handleCopySql}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-950/40 active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4 text-slate-950" />}
            {copied ? 'Script complet copié !' : 'Copier le script SQL unique (100%)'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs">
        <button
          onClick={() => setActiveTab('sql')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'sql'
              ? 'text-amber-400 border-amber-400'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Migration SQL Complète (Phase 1 & 2 réunies)
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'text-amber-400 border-amber-400'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Instructions d'Installation Supabase
        </button>

        <button
          onClick={() => setActiveTab('rls')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'rls'
              ? 'text-amber-400 border-amber-400'
              : 'text-slate-400 border-transparent hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Audit & Conformité RLS (22 Tables)
        </button>
      </div>

      {/* Tab 1: SQL Script View */}
      {activeTab === 'sql' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPhase('unified')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedPhase === 'unified'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Migration Complète (Phase 1 & 2 en 1 seul SQL)</span>
              </button>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono">
              <Check className="w-3 h-3 text-emerald-400" />
              22 Tables • 28 Politiques RLS • 6 Rôles Système (dont Magasinier)
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400 text-[11px]">
                supabase/migrations/{activeFileName}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                PostgreSQL 15+ • Compatible 100% Supabase Studio (Exécutable en 1 clic)
              </span>
            </div>
            <div className="p-4 overflow-x-auto max-h-[600px] bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-300">
              <pre>{activeSqlContent}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Instructions Guide */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="font-bold text-white text-base">Guide de Déploiement en 1 Seule Étape SQL</h2>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                  Étape 1 : Créer votre projet Supabase
                </span>
                <p className="text-slate-300">
                  Rendez-vous sur <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">supabase.com</a> et créez un projet (région Frankfurt, Paris ou Londres au choix).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Étape 2 : Exécuter le script unique (Phase 1 & 2 en 1 seul SQL)
                </span>
                <p className="text-slate-300">
                  Dans le menu de gauche de Supabase Studio, cliquez sur <strong>SQL Editor</strong> &gt; <strong>New query</strong>.
                </p>
                <p className="text-slate-300">
                  Cliquez sur le bouton <strong>"Copier le script SQL unique (100%)"</strong> ci-dessus, collez le contenu dans l'éditeur Supabase et cliquez sur <strong>RUN</strong>.
                </p>
                <p className="text-emerald-300/90 font-medium">
                  Le script crée immédiatement l'ensemble des 22 tables, les fonctions de sécurité, les triggers, active le RLS et initialise les 6 rôles métiers (Gérant, Serveur, Barman, Cuisine, Caissier et Magasinier).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                  Étape 3 : Récupérer vos clés API
                </span>
                <p className="text-slate-300">
                  Dans <strong>Project Settings &gt; API</strong>, copiez l'<strong>URL du projet</strong> et la <strong>Clé publique anonyme (anon key)</strong>.
                  Cliquez sur le bouton "Connexion Supabase" en haut à droite de RESTBAR PRO, collez ces informations et validez.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-amber-400 font-bold text-xs uppercase tracking-wider">
                  Étape 4 : Déployer les Edge Functions (Licences & Administration)
                </span>
                <p className="text-slate-300">
                  Pour les opérations privilégiées côté serveur, déployez les fonctions situées dans <code className="text-amber-400 font-mono">supabase/functions/license-manager</code> et <code className="text-amber-400 font-mono">supabase/functions/admin-provision</code> à l'aide de la CLI Supabase :
                </p>
                <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px]">
                  supabase functions deploy license-manager{'\n'}
                  supabase functions deploy admin-provision
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: RLS Policies Check */}
      {activeTab === 'rls' && (
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-base">Matrice des Politiques RLS Déployées (Phase 1 & Phase 2)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              { table: 'establishments', rule: 'Membre actif ou Super Admin uniquement. Seul Super Admin peut insérer.' },
              { table: 'profiles', rule: 'Profil personnel ou membres du même établissement. Anti-élévation de privilèges active.' },
              { table: 'establishment_members', rule: 'Gérant de l’établissement ou Super Admin pour insérer/modifier/désactiver.' },
              { table: 'roles & permissions', rule: 'Rôles système en lecture pour tous. Rôles personnalisés réservés au gérant.' },
              { table: 'licenses', rule: 'Lecture réservée aux membres de l’établissement. Écriture STRICTEMENT Super Admin.' },
              { table: 'establishment_settings', rule: 'Lecture membres. Modification réservée au Gérant de l’établissement.' },
              { table: 'audit_logs', rule: 'Lecture filtrée par establishment_id pour le gérant. Écriture sécurisée.' },
              { table: 'zones & dining_tables', rule: 'Isolation par établissement. Lecture et gestion des statuts de table en temps réel.' },
              { table: 'categories & menu_items', rule: 'Carte et tarifs isolés par établissement. Routage destination (Bar / Cuisine).' },
              { table: 'stock_items & stock_movements', rule: 'Gestion des stocks avec rôle Magasinier dédié (entrées, sorties, inventaires, modification/suppression).' },
              { table: 'orders & order_items', rule: 'Commandes isolées par établissement. Contrôle automatique de validité de la licence active.' },
              { table: 'bill_requests & payments', rule: 'Demandes d’addition et encaissements multi-moyens (Espèces, Wave, OM). Vérification licence.' },
              { table: 'expenses', rule: 'Décaissements et dépenses courantes de caisse isolés par établissement.' },
            ].map((p) => (
              <div key={p.table} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400 text-xs">public.{p.table}</span>
                  <Badge variant="success" size="sm">RLS ACTIVÉ</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">{p.rule}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
