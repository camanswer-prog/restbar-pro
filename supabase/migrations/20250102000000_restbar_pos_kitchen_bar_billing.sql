-- ============================================================================
-- RESTBAR PRO — PHASE 2 : COMMANDES, CUISINE, BAR, CAISSE, STOCKS & RAPPORTS
-- Schéma PostgreSQL avec isolation multi-établissements (establishment_id) et RLS
-- ============================================================================

-- 1. ZONES & TABLES
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

-- 2. CATÉGORIES ET CARTE (PLATS, BOISSONS, PRIX)
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
    price NUMERIC(12, 2) NOT NULL, -- Prix de vente (ex: 2500 FCFA)
    cost_price NUMERIC(12, 2) DEFAULT 0, -- Coût de revient
    destination VARCHAR(20) NOT NULL CHECK (destination IN ('bar', 'cuisine')),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_est ON public.menu_items(establishment_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_dest ON public.menu_items(destination);

-- 3. GESTION DES STOCKS & RECETTES
CREATE TABLE IF NOT EXISTS public.stock_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL, -- 'bouteille', 'litre', 'kg', 'portion', 'canette'
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

-- 4. TICKETS DE COMMANDE ET LIGNES DE PRODUCTION (ROUTAGE BAR / CUISINE)
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
    notes TEXT, -- Remarques (ex: bien cuit, sans piment, beaucoup de glaçons)
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

-- 5. DEMANDES D'ADDITION (NOTIFICATIONS CAISSE)
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

-- 6. PAIEMENTS & MULTI-MOYENS (ESPÈCES, WAVE, ORANGE MONEY, MIXTE)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('especes', 'wave', 'orange_money', 'carte_bancaire')),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'FCFA',
    reference_code VARCHAR(100), -- Réf transaction Wave / OM
    status VARCHAR(30) NOT NULL DEFAULT 'verifie' CHECK (status IN ('declare', 'verifie', 'rejete')),
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_est ON public.payments(establishment_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON public.payments(created_at);

-- 7. DÉPENSES & DÉCAISSEMENTS DE CAISSE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'glace', 'marche', 'transport', 'divers'
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'especes',
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receipt_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_est ON public.expenses(establishment_id);

-- ============================================================================
-- 8. POLITIQUES RLS SUR LES NOUVELLES TABLES
-- ============================================================================
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

-- Zones & Tables
CREATE POLICY "zones_access" ON public.zones FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);
CREATE POLICY "tables_access" ON public.dining_tables FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Menus & Catégories
CREATE POLICY "categories_access" ON public.categories FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);
CREATE POLICY "menu_items_access" ON public.menu_items FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Commandes & Lignes de commandes
CREATE POLICY "orders_access" ON public.orders FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);
CREATE POLICY "order_items_access" ON public.order_items FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Demandes d'addition, Paiements & Dépenses
CREATE POLICY "bill_requests_access" ON public.bill_requests FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);
CREATE POLICY "payments_access" ON public.payments FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);
CREATE POLICY "expenses_access" ON public.expenses FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);
CREATE POLICY "stocks_access" ON public.stock_items FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);
CREATE POLICY "stock_movements_access" ON public.stock_movements FOR ALL USING (
    public.is_super_admin() OR (establishment_id IN (SELECT get_my_establishment_ids()))
);

-- Triggers pour updated_at
CREATE TRIGGER tr_zones_updated BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_tables_updated BEFORE UPDATE ON public.dining_tables FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_menu_items_updated BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER tr_order_items_updated BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
