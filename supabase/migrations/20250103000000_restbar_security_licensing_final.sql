-- ============================================================================
-- RESTBAR PRO — PHASE 3 : SÉCURITÉ RENFORCÉE, CONTRÔLE DES LICENCES & AUDIT
-- Migration versionnée PostgreSQL / Supabase sans régression sur Phases 1 & 2
-- ============================================================================

-- 1. ADAPTATION DU STATUT DES LICENCES
-- Statuts supportés : 'active', 'en_attente', 'suspendue', 'expiree', 'revoked'
ALTER TABLE public.licenses DROP CONSTRAINT IF EXISTS licenses_status_check;
ALTER TABLE public.licenses ADD CONSTRAINT licenses_status_check 
  CHECK (status IN ('active', 'en_attente', 'suspendue', 'expiree', 'expired', 'revoked', 'pending'));

-- 2. DERNIÈRE ACTIVITÉ SUR LES ÉTABLISSEMENTS
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- 3. FONCTION DE CONTRÔLE CRITIQUE : VÉRIFICATION DE LICENCE ACTIVE CÔTÉ BASE
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

-- 4. PROTECTION ANTI-ÉLÉVATION DE PRIVILÈGES (TRIGGER DE SÉCURITÉ)
-- Empêche un utilisateur non Super Admin de modifier son propre rôle ou son statut is_super_admin
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si la colonne is_super_admin change
  IF (NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin) THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Sécurité : Seul un Super Administrateur peut modifier le privilège Super Admin.';
    END IF;
  END IF;

  -- Empêcher la modification de son propre profil pour s'octroyer des droits
  IF (auth.uid() = NEW.id AND NEW.is_super_admin = TRUE AND OLD.is_super_admin = FALSE) THEN
    RAISE EXCEPTION 'Sécurité : Interdiction d''auto-élévation de privilèges.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_self_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.prevent_self_role_escalation();

-- 5. RLS RENFORCÉ : INTERDICTION DE CRÉATION DE COMMANDES SUR LICENCE NON-ACTIVE
DROP POLICY IF EXISTS "orders_insert_license_check" ON public.orders;
CREATE POLICY "orders_insert_license_check" ON public.orders
FOR INSERT WITH CHECK (
  public.is_super_admin() 
  OR (
    establishment_id IN (SELECT get_my_establishment_ids())
    AND public.is_establishment_license_active(establishment_id)
  )
);

-- 6. RLS RENFORCÉ : INTERDICTION D'ENCAISSEMENT SUR LICENCE NON-ACTIVE
DROP POLICY IF EXISTS "payments_insert_license_check" ON public.payments;
CREATE POLICY "payments_insert_license_check" ON public.payments
FOR INSERT WITH CHECK (
  public.is_super_admin()
  OR (
    establishment_id IN (SELECT get_my_establishment_ids())
    AND public.is_establishment_license_active(establishment_id)
  )
);

-- 7. FONCTION DE LOGGING AUTOMATIQUE DES MODIFICATIONS SENSIBLES DANS AUDIT_LOGS
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

  -- Mettre à jour l'horodatage de dernière activité de l'établissement
  IF p_est_id IS NOT NULL THEN
    UPDATE public.establishments SET last_activity_at = NOW() WHERE id = p_est_id;
  END IF;

  RETURN v_log_id;
END;
$$;
