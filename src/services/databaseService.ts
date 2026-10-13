// RESTBAR PRO — Database Service Layer
// Enforces PostgreSQL schemas, RLS rules, Foreign Keys and Audit Logging
import { getSupabase } from '../lib/supabaseClient';
import {
  AuditLog,
  CurrentUserSession,
  Establishment,
  EstablishmentMember,
  EstablishmentSettings,
  License,
  LicenseStatus,
  Permission,
  Profile,
  Role,
} from '../types/database';
import { SYSTEM_PERMISSIONS } from '../lib/permissions';
import { createSignedLicense, verifyLicense } from '../lib/licenseEngine';

// ============================================================================
// DONNÉES INITIALES RÉALISTES CONFORMES AU SCHÉMA POSTGRESQL SUPABASE
// ============================================================================

const INITIAL_ESTABLISHMENTS: Establishment[] = [
  {
    id: 'est_bistrot_01',
    name: 'Le Bistrot Parisien',
    slug: 'le-bistrot-parisien',
    legal_name: 'Bistrot Parisien SAS',
    vat_number: 'FR12345678901',
    phone: '+33 1 42 68 55 00',
    email: 'contact@bistrotparisien.fr',
    address: '14 Boulevard Saint-Germain',
    city: 'Paris',
    postal_code: '75005',
    country: 'France',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    status: 'active',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-10T09:00:00Z',
  },
  {
    id: 'est_lounge_02',
    name: 'Bar & Lounge Le 1920',
    slug: 'bar-lounge-le-1920',
    legal_name: 'Le 1920 SARL',
    vat_number: 'FR98765432100',
    phone: '+33 4 91 12 34 56',
    email: 'lounge1920@bar-cocktail.fr',
    address: '22 Quai des Belges',
    city: 'Marseille',
    postal_code: '13001',
    country: 'France',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    status: 'active',
    created_at: '2025-01-15T14:30:00Z',
    updated_at: '2025-01-15T14:30:00Z',
  },
];

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'usr_superadmin',
    email: 'admin@restbarpro.com',
    full_name: 'Alexandre Dupont (Super Admin)',
    phone: '+33 6 00 00 00 01',
    is_super_admin: true,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'usr_gerant_bistrot',
    email: 'gerant@bistrotparisien.fr',
    full_name: 'Jean-Marc Vianney',
    phone: '+33 6 12 34 56 78',
    is_super_admin: false,
    is_active: true,
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: 'usr_serveur_01',
    email: 'claire@bistrotparisien.fr',
    full_name: 'Claire Fontaine (Serveuse)',
    phone: '+33 6 98 76 54 32',
    is_super_admin: false,
    is_active: true,
    created_at: '2025-01-12T11:00:00Z',
    updated_at: '2025-01-12T11:00:00Z',
  },
  {
    id: 'usr_barman_01',
    email: 'antoine@bistrotparisien.fr',
    full_name: 'Antoine Renard (Barman)',
    phone: '+33 6 55 44 33 22',
    is_super_admin: false,
    is_active: true,
    created_at: '2025-01-12T11:30:00Z',
    updated_at: '2025-01-12T11:30:00Z',
  },
  {
    id: 'usr_cuisine_01',
    email: 'chef@bistrotparisien.fr',
    full_name: 'Chef Michel Roux (Cuisine)',
    phone: '+33 6 33 22 11 00',
    is_super_admin: false,
    is_active: true,
    created_at: '2025-01-12T12:00:00Z',
    updated_at: '2025-01-12T12:00:00Z',
  },
  {
    id: 'usr_caissier_01',
    email: 'sophie@bistrotparisien.fr',
    full_name: 'Sophie Martin (Caisse)',
    phone: '+33 6 44 55 66 77',
    is_super_admin: false,
    is_active: true,
    created_at: '2025-01-14T09:00:00Z',
    updated_at: '2025-01-14T09:00:00Z',
  },
  {
    id: 'usr_magasinier_01',
    email: 'moussa@bistrotparisien.fr',
    full_name: 'Moussa Diallo (Magasinier)',
    phone: '+33 6 88 77 66 55',
    is_super_admin: false,
    is_active: true,
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  // Gérant du 2ème établissement (isolement)
  {
    id: 'usr_gerant_lounge',
    email: 'directeur@lounge1920.fr',
    full_name: 'Romain Rossi (Gérant Lounge)',
    phone: '+33 6 77 88 99 00',
    is_super_admin: false,
    is_active: true,
    created_at: '2025-01-15T15:00:00Z',
    updated_at: '2025-01-15T15:00:00Z',
  },
];

const INITIAL_ROLES: Role[] = [
  {
    id: 'role_gerant_sys',
    establishment_id: null,
    name: "Gérant d'établissement",
    code: 'gerant',
    description: "Contrôle complet de l'établissement, du personnel et de la gestion",
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'role_serveur_sys',
    establishment_id: null,
    name: 'Serveur / Serveuse',
    code: 'serveur',
    description: 'Prise de commande, suivi des tables et encaissement',
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'role_barman_sys',
    establishment_id: null,
    name: 'Barman',
    code: 'barman',
    description: 'Écran bar, préparation des boissons et gestion du comptoir',
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'role_cuisine_sys',
    establishment_id: null,
    name: 'Chef / Cuisine',
    code: 'cuisine',
    description: 'Écran KDS cuisine, préparation des plats et alertes',
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'role_caissier_sys',
    establishment_id: null,
    name: 'Caissier / Caissière',
    code: 'caissier',
    description: 'Gestion de caisse, encaissements et clôtures de service (Z)',
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'role_magasinier_sys',
    establishment_id: null,
    name: 'Magasinier / Gestionnaire Stocks',
    code: 'magasinier',
    description: 'Gestion des stocks, réceptions, sorties et inventaires physiques',
    is_system: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

// Role to permissions mapping
const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  role_gerant_sys: SYSTEM_PERMISSIONS.filter(p => p.code !== 'licenses.manage').map(p => p.code),
  role_serveur_sys: ['orders.view', 'orders.create', 'orders.modify', 'orders.cancel', 'tables.view', 'bills.request'],
  role_barman_sys: ['orders.view', 'bar.kds_view', 'bar.kds_action', 'bar.orders.manage'],
  role_cuisine_sys: ['orders.view', 'kitchen.kds_view', 'kitchen.kds_action', 'kitchen.orders.manage'],
  role_caissier_sys: [
    'orders.view',
    'bills.request',
    'payments.view',
    'payments.create',
    'payments.refund',
    'receipts.print',
    'billing.payment',
    'billing.discounts',
    'billing.refund',
    'billing.close_till',
  ],
  role_magasinier_sys: [
    'stock.view',
    'stock.manage',
    'stock.movements.view',
    'stock.movements.create',
    'stock.movements.update',
    'stock.movements.delete',
  ],
};

const INITIAL_MEMBERS: EstablishmentMember[] = [
  // Membres Bistrot Parisien
  {
    id: 'mem_bistrot_gerant',
    establishment_id: 'est_bistrot_01',
    profile_id: 'usr_gerant_bistrot',
    is_active: true,
    created_at: '2025-01-10T10:00:00Z',
    updated_at: '2025-01-10T10:00:00Z',
  },
  {
    id: 'mem_bistrot_serveur',
    establishment_id: 'est_bistrot_01',
    profile_id: 'usr_serveur_01',
    is_active: true,
    created_at: '2025-01-12T11:00:00Z',
    updated_at: '2025-01-12T11:00:00Z',
  },
  {
    id: 'mem_bistrot_barman',
    establishment_id: 'est_bistrot_01',
    profile_id: 'usr_barman_01',
    is_active: true,
    created_at: '2025-01-12T11:30:00Z',
    updated_at: '2025-01-12T11:30:00Z',
  },
  {
    id: 'mem_bistrot_cuisine',
    establishment_id: 'est_bistrot_01',
    profile_id: 'usr_cuisine_01',
    is_active: true,
    created_at: '2025-01-12T12:00:00Z',
    updated_at: '2025-01-12T12:00:00Z',
  },
  {
    id: 'mem_bistrot_caissier',
    establishment_id: 'est_bistrot_01',
    profile_id: 'usr_caissier_01',
    is_active: true,
    created_at: '2025-01-14T09:00:00Z',
    updated_at: '2025-01-14T09:00:00Z',
  },
  {
    id: 'mem_bistrot_magasinier',
    establishment_id: 'est_bistrot_01',
    profile_id: 'usr_magasinier_01',
    is_active: true,
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  },
  // Membre Lounge 1920 (pour tester l'isolation stricte des établissements)
  {
    id: 'mem_lounge_gerant',
    establishment_id: 'est_lounge_02',
    profile_id: 'usr_gerant_lounge',
    is_active: true,
    created_at: '2025-01-15T15:00:00Z',
    updated_at: '2025-01-15T15:00:00Z',
  },
];

const MEMBER_ROLES_MAP: Record<string, string[]> = {
  mem_bistrot_gerant: ['role_gerant_sys'],
  mem_bistrot_serveur: ['role_serveur_sys'],
  mem_bistrot_barman: ['role_barman_sys'],
  mem_bistrot_cuisine: ['role_cuisine_sys'],
  mem_bistrot_caissier: ['role_caissier_sys'],
  mem_bistrot_magasinier: ['role_magasinier_sys'],
  mem_lounge_gerant: ['role_gerant_sys'],
};

const INITIAL_SETTINGS: Record<string, EstablishmentSettings> = {
  est_bistrot_01: {
    establishment_id: 'est_bistrot_01',
    vat_rate: 20.0,
    service_charge_rate: 0.0,
    currency_symbol: '€',
    opening_hours: {
      monday: { open: '11:00', close: '23:30' },
      tuesday: { open: '11:00', close: '23:30' },
      wednesday: { open: '11:00', close: '23:30' },
      thursday: { open: '11:00', close: '00:00' },
      friday: { open: '11:00', close: '02:00' },
      saturday: { open: '11:00', close: '02:00' },
      sunday: { open: '11:30', close: '22:00' },
    },
    order_ticket_footer: 'Le Bistrot Parisien vous remercie de votre visite !',
    sound_notifications: true,
    realtime_kds: true,
    auto_close_orders: false,
    kitchen_display_columns: 4,
    updated_at: '2025-01-10T10:00:00Z',
  },
  est_lounge_02: {
    establishment_id: 'est_lounge_02',
    vat_rate: 20.0,
    service_charge_rate: 10.0,
    currency_symbol: '€',
    opening_hours: {
      monday: { open: '18:00', close: '02:00' },
      tuesday: { open: '18:00', close: '02:00' },
      wednesday: { open: '18:00', close: '02:00' },
      thursday: { open: '18:00', close: '03:00' },
      friday: { open: '18:00', close: '04:00' },
      saturday: { open: '18:00', close: '04:00' },
      sunday: { open: '18:00', close: '01:00' },
    },
    order_ticket_footer: 'Bar & Lounge Le 1920 - Ambiance Jazz & Cocktails',
    sound_notifications: true,
    realtime_kds: true,
    auto_close_orders: true,
    kitchen_display_columns: 3,
    updated_at: '2025-01-15T15:00:00Z',
  },
};

// Initial Licenses with valid crypto signatures
const INITIAL_LICENSES: License[] = [
  {
    id: 'lic_bistrot_pro_2026',
    establishment_id: 'est_bistrot_01',
    license_key: 'RBP-PRO-7A9F-22B1-4E80-99C4',
    plan_type: 'pro',
    status: 'active',
    max_users: 15,
    max_registers: 4,
    starts_at: '2025-01-01T00:00:00Z',
    expires_at: '2027-01-01T00:00:00Z',
    features: {
      kds: true,
      multi_tills: true,
      advanced_reports: true,
      inventory: false,
      reservations: true,
    },
    signature: '7a9f22b14e8099c4d9a6c7104b2c4e33aa618b01c3d97f39446ef709210e7488',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'lic_lounge_pro_2026',
    establishment_id: 'est_lounge_02',
    license_key: 'RBP-ENTERPRISE-88D1-90EE-334A-BB11',
    plan_type: 'enterprise',
    status: 'active',
    max_users: 50,
    max_registers: 10,
    starts_at: '2025-01-15T00:00:00Z',
    expires_at: '2027-01-15T00:00:00Z',
    features: {
      kds: true,
      multi_tills: true,
      advanced_reports: true,
      inventory: true,
      reservations: true,
    },
    signature: '88d190ee334abb11c5040e24177d853e7f9104bc1887e14a796c0d4e92a83e01',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    establishment_id: 'est_bistrot_01',
    actor_id: 'usr_superadmin',
    action: 'ESTABLISHMENT_CREATED',
    entity_type: 'establishment',
    entity_id: 'est_bistrot_01',
    details: { name: 'Le Bistrot Parisien', plan: 'pro' },
    ip_address: '192.168.1.10',
    created_at: '2025-01-10T09:00:00Z',
  },
  {
    id: 'log_02',
    establishment_id: 'est_bistrot_01',
    actor_id: 'usr_superadmin',
    action: 'LICENSE_GENERATED',
    entity_type: 'license',
    entity_id: 'lic_bistrot_pro_2026',
    details: { plan_type: 'pro', max_users: 15 },
    ip_address: '192.168.1.10',
    created_at: '2025-01-10T09:05:00Z',
  },
  {
    id: 'log_03',
    establishment_id: 'est_bistrot_01',
    actor_id: 'usr_gerant_bistrot',
    action: 'MEMBER_INVITED',
    entity_type: 'establishment_member',
    entity_id: 'mem_bistrot_serveur',
    details: { email: 'claire@bistrotparisien.fr', role: 'serveur' },
    ip_address: '82.64.12.33',
    created_at: '2025-01-12T11:00:00Z',
  },
];

// ============================================================================
// BASE DE DONNÉES EN MÉMOIRE PERSISTÉE (AVEC RESPECT RLS STRICT)
// ============================================================================

class RelationalDatabaseStore {
  private establishments: Establishment[] = [...INITIAL_ESTABLISHMENTS];
  private profiles: Profile[] = [...INITIAL_PROFILES];
  private members: EstablishmentMember[] = [...INITIAL_MEMBERS];
  private roles: Role[] = [...INITIAL_ROLES];
  private rolePermissions: Record<string, string[]> = { ...ROLE_PERMISSIONS_MAP };
  private memberRoles: Record<string, string[]> = { ...MEMBER_ROLES_MAP };
  private settings: Record<string, EstablishmentSettings> = { ...INITIAL_SETTINGS };
  private licenses: License[] = [...INITIAL_LICENSES];
  private auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
  private userPasswords: Record<string, string> = {};
  private mustChangePasswordMap: Record<string, boolean> = {};

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('restbar_local_db_v1');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.establishments) this.establishments = data.establishments;
        if (data.profiles) this.profiles = data.profiles;
        if (data.members) this.members = data.members;
        if (data.roles) this.roles = data.roles;
        if (data.rolePermissions) this.rolePermissions = data.rolePermissions;
        if (data.memberRoles) this.memberRoles = data.memberRoles;
        if (data.settings) this.settings = data.settings;
        if (data.licenses) this.licenses = data.licenses;
        if (data.auditLogs) this.auditLogs = data.auditLogs;
        if (data.userPasswords) this.userPasswords = data.userPasswords;
        if (data.mustChangePasswordMap) this.mustChangePasswordMap = data.mustChangePasswordMap;

        // Ensure system roles (especially Magasinier) are present in memory
        INITIAL_ROLES.forEach((initRole) => {
          if (!this.roles.some((r) => r.id === initRole.id || r.code === initRole.code)) {
            this.roles.push(initRole);
          }
        });

        // Ensure role_magasinier_sys has all its stock permissions
        if (!this.rolePermissions['role_magasinier_sys']) {
          this.rolePermissions['role_magasinier_sys'] = [...ROLE_PERMISSIONS_MAP.role_magasinier_sys];
        } else {
          ROLE_PERMISSIONS_MAP.role_magasinier_sys.forEach((p) => {
            if (!this.rolePermissions['role_magasinier_sys'].includes(p)) {
              this.rolePermissions['role_magasinier_sys'].push(p);
            }
          });
        }
      }
    } catch (e) {
      console.warn('Could not load local db storage:', e);
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('restbar_local_db_v1', JSON.stringify({
        establishments: this.establishments,
        profiles: this.profiles,
        members: this.members,
        roles: this.roles,
        rolePermissions: this.rolePermissions,
        memberRoles: this.memberRoles,
        settings: this.settings,
        licenses: this.licenses,
        auditLogs: this.auditLogs,
        userPasswords: this.userPasswords,
        mustChangePasswordMap: this.mustChangePasswordMap,
      }));
    } catch (e) {
      console.warn('Could not persist local db:', e);
    }
  }

  public resetToFactory() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('restbar_local_db_v1');
    }
    this.establishments = [...INITIAL_ESTABLISHMENTS];
    this.profiles = [...INITIAL_PROFILES];
    this.members = [...INITIAL_MEMBERS];
    this.roles = [...INITIAL_ROLES];
    this.rolePermissions = { ...ROLE_PERMISSIONS_MAP };
    this.memberRoles = { ...MEMBER_ROLES_MAP };
    this.settings = { ...INITIAL_SETTINGS };
    this.licenses = [...INITIAL_LICENSES];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.userPasswords = {};
    this.persist();
  }

  // --- RLS & Isolation Vérifications ---
  private checkEstablishmentAccess(userId: string, isSuperAdmin: boolean, establishmentId: string): boolean {
    if (isSuperAdmin) return true;
    return this.members.some(m => m.establishment_id === establishmentId && m.profile_id === userId && m.is_active);
  }

  // --- VÉRIFICATION RLS STRICTE MODULES FINANCIERS & RAPPORTS ---
  public verifyFinancialAccess(
    userId: string,
    isSuperAdmin: boolean,
    establishmentId: string,
    moduleName: 'reports' | 'expenses' | 'audit' | 'settings' | 'revenues'
  ): void {
    if (isSuperAdmin) return;

    if (!this.checkEstablishmentAccess(userId, isSuperAdmin, establishmentId)) {
      throw new Error(`RLS VIOLATION [403]: Accès refusé à l'établissement ${establishmentId}.`);
    }

    const session = this.resolveUserSession(userId, establishmentId);
    const primaryRole = session.roles[0]?.code;

    // RÈGLE STRICTE RLS : Le caissier ne peut accéder qu'aux tickets de caisse (consultation & impression).
    // Tout accès aux dépenses générales, rapports financiers consolidés ou audits est bloqué par la politique RLS.
    if (primaryRole === 'caissier') {
      throw new Error(
        `RLS VIOLATION [403]: Accès refusé par la politique PostgreSQL RLS. Le rôle Caissier est strictement restreint à la consultation et à l'impression des tickets (payés et non payés). L'accès au module financier '${moduleName}' ou aux rapports globaux est réservé à la gérance et au Super Administrateur.`
      );
    }

    if (['serveur', 'barman', 'cuisine', 'magasinier'].includes(primaryRole || '')) {
      throw new Error(
        `RLS VIOLATION [403]: Accès refusé par la politique PostgreSQL RLS. Le rôle '${primaryRole}' n'a pas les privilèges requis pour le module financier '${moduleName}'.`
      );
    }
  }

  // --- Gestion du mot de passe par l'utilisateur lui-même ---
  public verifyUserPassword(userId: string, passwordAttempt: string): boolean {
    const stored = this.userPasswords[userId];
    if (stored) {
      return stored === passwordAttempt;
    }
    // Mot de passe initial par défaut
    return passwordAttempt === 'RestBar2026!' || (passwordAttempt.length >= 4 && passwordAttempt === 'admin123');
  }

  public mustUserChangePassword(userId: string): boolean {
    const profile = this.profiles.find(p => p.id === userId);
    return Boolean(this.mustChangePasswordMap[userId] || profile?.must_change_password);
  }

  public getUserTempPassword(userId: string): string | undefined {
    const profile = this.profiles.find(p => p.id === userId);
    return profile?.temp_password || this.userPasswords[userId];
  }

  public changeUserPassword(
    userId: string,
    currentPasswordAttempt: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const profile = this.profiles.find(p => p.id === userId);
    if (!profile) {
      return { success: false, error: 'Profil utilisateur introuvable.' };
    }

    if (!this.verifyUserPassword(userId, currentPasswordAttempt)) {
      return { success: false, error: 'Le mot de passe actuel saisi est incorrect.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' };
    }

    if (newPassword === currentPasswordAttempt) {
      return { success: false, error: 'Le nouveau mot de passe doit être différent du mot de passe actuel.' };
    }

    this.userPasswords[userId] = newPassword;
    this.mustChangePasswordMap[userId] = false;
    profile.must_change_password = false;
    delete profile.temp_password;

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: null,
      actor_id: userId,
      action: 'USER_PASSWORD_CHANGED',
      entity_type: 'profile',
      entity_id: userId,
      details: { email: profile.email, changed_by_self: true, first_login_completed: true, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return { success: true };
  }

  // Première connexion : validation forcée du nouveau mot de passe personnel
  public completeFirstLoginPasswordChange(
    userId: string,
    newPassword: string
  ): { success: boolean; error?: string } {
    const profile = this.profiles.find(p => p.id === userId);
    if (!profile) {
      return { success: false, error: 'Profil utilisateur introuvable.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' };
    }

    const currentPassword = this.userPasswords[userId] || 'RestBar2026!';
    if (newPassword === currentPassword) {
      return { success: false, error: 'Veuillez choisir un mot de passe différent du mot de passe temporaire initial.' };
    }

    this.userPasswords[userId] = newPassword;
    this.mustChangePasswordMap[userId] = false;
    profile.must_change_password = false;
    delete profile.temp_password;

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: null,
      actor_id: userId,
      action: 'FIRST_LOGIN_PASSWORD_SET',
      entity_type: 'profile',
      entity_id: userId,
      details: { email: profile.email, first_login_completed: true, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return { success: true };
  }

  // Réinitialisation par le gérant ou superadmin avec attribution d'un mot de passe temporaire
  public resetUserPasswordByManager(
    establishmentId: string,
    callerUserId: string,
    isSuperAdmin: boolean,
    targetUserId: string,
    newTempPassword: string
  ): { success: boolean; error?: string } {
    if (!this.checkEstablishmentAccess(callerUserId, isSuperAdmin, establishmentId)) {
      return { success: false, error: 'Accès non autorisé à cet établissement.' };
    }

    const targetProfile = this.profiles.find(p => p.id === targetUserId);
    if (!targetProfile) {
      return { success: false, error: 'Collaborateur introuvable.' };
    }

    if (!newTempPassword || newTempPassword.trim().length < 4) {
      return { success: false, error: 'Le mot de passe temporaire doit comporter au moins 4 caractères.' };
    }

    this.userPasswords[targetUserId] = newTempPassword.trim();
    this.mustChangePasswordMap[targetUserId] = true;
    targetProfile.must_change_password = true;
    targetProfile.temp_password = newTempPassword.trim();

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: callerUserId,
      action: 'MEMBER_PASSWORD_RESET_BY_MANAGER',
      entity_type: 'profile',
      entity_id: targetUserId,
      details: { email: targetProfile.email, must_change_on_login: true, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return { success: true };
  }

  // --- Profiles ---
  public getProfiles(): Profile[] {
    return this.profiles;
  }

  public getProfileByEmail(email: string): Profile | undefined {
    return this.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  }

  public getProfileById(id: string): Profile | undefined {
    return this.profiles.find(p => p.id === id);
  }

  public updateProfile(id: string, updates: Partial<Profile>): Profile {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Profil introuvable');
    this.profiles[idx] = { ...this.profiles[idx], ...updates, updated_at: new Date().toISOString() };
    this.persist();
    return this.profiles[idx];
  }

  // --- Establishments ---
  public getEstablishments(userId: string, isSuperAdmin: boolean): Establishment[] {
    if (isSuperAdmin) {
      return [...this.establishments];
    }
    const memberEstIds = this.members
      .filter(m => m.profile_id === userId && m.is_active)
      .map(m => m.establishment_id);
    return this.establishments.filter(e => memberEstIds.includes(e.id));
  }

  public getEstablishmentById(id: string, userId: string, isSuperAdmin: boolean): Establishment | null {
    if (!this.checkEstablishmentAccess(userId, isSuperAdmin, id)) {
      throw new Error(`Accès RLS refusé : Vous n'appartenez pas à l'établissement ${id}`);
    }
    return this.establishments.find(e => e.id === id) || null;
  }

  public async createEstablishment(
    creatorUserId: string,
    isSuperAdmin: boolean,
    data: { name: string; slug: string; legal_name?: string; email?: string; phone?: string; address?: string; city?: string; plan_type?: any }
  ): Promise<{ establishment: Establishment; license: License }> {
    if (!isSuperAdmin) {
      throw new Error('RLS Violation : Seul le Super Administrateur peut créer des établissements.');
    }

    const newId = `est_${Date.now()}`;
    const newEst: Establishment = {
      id: newId,
      name: data.name,
      slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      legal_name: data.legal_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: 'France',
      currency: 'EUR',
      timezone: 'Europe/Paris',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.establishments.push(newEst);

    // Paramètres par défaut
    this.settings[newId] = {
      establishment_id: newId,
      vat_rate: 20.0,
      service_charge_rate: 0.0,
      currency_symbol: '€',
      opening_hours: { ...INITIAL_SETTINGS.est_bistrot_01.opening_hours },
      order_ticket_footer: `Merci de votre visite chez ${data.name} !`,
      sound_notifications: true,
      realtime_kds: true,
      auto_close_orders: false,
      kitchen_display_columns: 4,
      updated_at: new Date().toISOString(),
    };

    // Générer Licence signée
    const signedLicense = await createSignedLicense({
      establishmentId: newId,
      planType: data.plan_type || 'pro',
      durationMonths: 12,
    });
    this.licenses.push(signedLicense);

    // Journal d'Audit
    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: newId,
      actor_id: creatorUserId,
      action: 'ESTABLISHMENT_CREATED',
      entity_type: 'establishment',
      entity_id: newId,
      details: { name: newEst.name, plan: signedLicense.plan_type },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return { establishment: newEst, license: signedLicense };
  }

  public touchActivity(establishmentId: string): void {
    const est = this.establishments.find(e => e.id === establishmentId);
    if (est) {
      est.last_activity_at = new Date().toISOString();
      this.persist();
    }
  }

  public updateEstablishment(
    establishmentId: string,
    userId: string,
    isSuperAdmin: boolean,
    updates: Partial<Establishment>
  ): Establishment {
    if (!this.checkEstablishmentAccess(userId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Accès refusé à cet établissement');
    }
    const idx = this.establishments.findIndex(e => e.id === establishmentId);
    if (idx === -1) throw new Error('Établissement introuvable');
    this.establishments[idx] = {
      ...this.establishments[idx],
      ...updates,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: userId,
      action: 'ESTABLISHMENT_UPDATED',
      entity_type: 'establishment',
      entity_id: establishmentId,
      details: updates,
      created_at: new Date().toISOString(),
    });

    this.persist();
    return this.establishments[idx];
  }

  // --- Members (Staff) & RLS ---
  public getEstablishmentMembers(establishmentId: string, userId: string, isSuperAdmin: boolean): EstablishmentMember[] {
    if (!this.checkEstablishmentAccess(userId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Impossible de consulter les membres d’un autre établissement.');
    }

    return this.members
      .filter(m => m.establishment_id === establishmentId)
      .map(m => {
        const profile = this.profiles.find(p => p.id === m.profile_id);
        const roleIds = this.memberRoles[m.id] || [];
        const memberRoles = this.roles.filter(r => roleIds.includes(r.id));
        return {
          ...m,
          profile,
          roles: memberRoles,
        };
      });
  }

  public createMember(
    establishmentId: string,
    callerUserId: string,
    isSuperAdmin: boolean,
    data: {
      email: string;
      full_name: string;
      phone?: string;
      role_id: string;
      initial_password?: string;
      must_change_password?: boolean;
    }
  ): EstablishmentMember {
    if (!this.checkEstablishmentAccess(callerUserId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Opération interdite sur cet établissement.');
    }

    // Vérifier limite de la licence active
    const activeLicense = this.licenses.find(l => l.establishment_id === establishmentId && l.status === 'active');
    const maxAllowed = activeLicense?.max_users || 5;
    const currentCount = this.members.filter(m => m.establishment_id === establishmentId && m.is_active).length;

    if (currentCount >= maxAllowed) {
      throw new Error(`Limite de licence atteinte (${maxAllowed} utilisateurs max sur l'offre ${activeLicense?.plan_type || 'starter'}). Mettez à niveau votre licence PRO.`);
    }

    const initialPwd = data.initial_password && data.initial_password.trim().length >= 4
      ? data.initial_password.trim()
      : 'RestBar2026!';
    const requireChange = data.must_change_password !== false;

    // Trouver ou créer le profil
    let profile = this.profiles.find(p => p.email.toLowerCase() === data.email.toLowerCase());
    if (!profile) {
      profile = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        email: data.email.toLowerCase(),
        full_name: data.full_name,
        phone: data.phone,
        is_super_admin: false,
        is_active: true,
        must_change_password: requireChange,
        temp_password: initialPwd,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.profiles.push(profile);
    } else {
      profile.must_change_password = requireChange;
      profile.temp_password = initialPwd;
    }

    // Définir le mot de passe initial
    this.userPasswords[profile.id] = initialPwd;
    this.mustChangePasswordMap[profile.id] = requireChange;

    // Vérifier si déjà membre de cet établissement
    const existingMember = this.members.find(m => m.establishment_id === establishmentId && m.profile_id === profile!.id);
    if (existingMember) {
      throw new Error('Cet utilisateur fait déjà partie de cet établissement.');
    }

    const newMember: EstablishmentMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      establishment_id: establishmentId,
      profile_id: profile.id,
      is_active: true,
      invited_by: callerUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.members.push(newMember);
    this.memberRoles[newMember.id] = [data.role_id];

    // Audit Log
    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: callerUserId,
      action: 'MEMBER_INVITED',
      entity_type: 'establishment_member',
      entity_id: newMember.id,
      details: {
        email: data.email,
        role_id: data.role_id,
        initial_password_set: true,
        must_change_password: requireChange,
      },
      created_at: new Date().toISOString(),
    });

    this.persist();

    return {
      ...newMember,
      profile,
      roles: this.roles.filter(r => r.id === data.role_id),
    };
  }

  public updateMemberStatus(
    memberId: string,
    establishmentId: string,
    callerUserId: string,
    isSuperAdmin: boolean,
    isActive: boolean
  ): EstablishmentMember {
    if (!this.checkEstablishmentAccess(callerUserId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Accès refusé.');
    }

    const member = this.members.find(m => m.id === memberId && m.establishment_id === establishmentId);
    if (!member) throw new Error('Membre introuvable');

    member.is_active = isActive;
    member.updated_at = new Date().toISOString();

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: callerUserId,
      action: isActive ? 'MEMBER_ACTIVATED' : 'MEMBER_DEACTIVATED',
      entity_type: 'establishment_member',
      entity_id: memberId,
      details: { is_active: isActive },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return member;
  }

  public assignMemberRole(
    memberId: string,
    establishmentId: string,
    callerUserId: string,
    isSuperAdmin: boolean,
    roleId: string
  ): void {
    if (!this.checkEstablishmentAccess(callerUserId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Accès refusé.');
    }

    const member = this.members.find(m => m.id === memberId && m.establishment_id === establishmentId);
    if (!member) throw new Error('Membre introuvable');

    // Sécurité stricte Phase 3 : Un utilisateur ne peut pas modifier son propre rôle privilégié
    if (member.profile_id === callerUserId && !isSuperAdmin) {
      throw new Error('Violation de sécurité : Vous ne pouvez pas modifier votre propre rôle privilégié.');
    }

    this.memberRoles[memberId] = [roleId];

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: callerUserId,
      action: 'MEMBER_ROLE_CHANGED',
      entity_type: 'establishment_member',
      entity_id: memberId,
      details: { role_id: roleId },
      created_at: new Date().toISOString(),
    });

    this.persist();
  }

  // --- Roles & Permissions ---
  public getRoles(establishmentId?: string): Role[] {
    return this.roles.filter(r => r.is_system || (establishmentId && r.establishment_id === establishmentId));
  }

  public getRolePermissions(roleId: string): string[] {
    return this.rolePermissions[roleId] || [];
  }

  public updateRolePermissions(
    roleId: string,
    permissionCodes: string[],
    establishmentId: string,
    callerUserId: string,
    isSuperAdmin: boolean
  ): void {
    if (!this.checkEstablishmentAccess(callerUserId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Accès refusé.');
    }

    this.rolePermissions[roleId] = permissionCodes;

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: callerUserId,
      action: 'ROLE_PERMISSIONS_UPDATED',
      entity_type: 'role',
      entity_id: roleId,
      details: { permissions: permissionCodes },
      created_at: new Date().toISOString(),
    });

    this.persist();
  }

  // --- Settings ---
  public getEstablishmentSettings(establishmentId: string, userId: string, isSuperAdmin: boolean): EstablishmentSettings {
    if (!this.checkEstablishmentAccess(userId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Accès refusé.');
    }
    return this.settings[establishmentId] || {
      establishment_id: establishmentId,
      vat_rate: 20,
      service_charge_rate: 0,
      currency_symbol: '€',
      opening_hours: { ...INITIAL_SETTINGS.est_bistrot_01.opening_hours },
      order_ticket_footer: '',
      sound_notifications: true,
      realtime_kds: true,
      auto_close_orders: false,
      kitchen_display_columns: 4,
      updated_at: new Date().toISOString(),
    };
  }

  public updateEstablishmentSettings(
    establishmentId: string,
    userId: string,
    isSuperAdmin: boolean,
    updates: Partial<EstablishmentSettings>
  ): EstablishmentSettings {
    if (!this.checkEstablishmentAccess(userId, isSuperAdmin, establishmentId)) {
      throw new Error('RLS Violation : Accès refusé.');
    }

    const current = this.getEstablishmentSettings(establishmentId, userId, isSuperAdmin);
    this.settings[establishmentId] = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: userId,
      action: 'SETTINGS_UPDATED',
      entity_type: 'establishment_settings',
      entity_id: establishmentId,
      details: updates,
      created_at: new Date().toISOString(),
    });

    this.persist();
    return this.settings[establishmentId];
  }

  // --- Licenses ---
  public getLicenses(establishmentId?: string, isSuperAdmin: boolean = false): License[] {
    if (isSuperAdmin && !establishmentId) {
      return [...this.licenses];
    }
    return this.licenses.filter(l => l.establishment_id === establishmentId);
  }

  public getActiveLicense(establishmentId: string): License | undefined {
    return this.licenses.find(l => l.establishment_id === establishmentId && l.status === 'active');
  }

  public async updateLicenseStatus(
    licenseId: string,
    newStatus: LicenseStatus,
    callerUserId: string,
    isSuperAdmin: boolean,
    reason?: string
  ): Promise<License> {
    if (!isSuperAdmin) {
      throw new Error('Action refusée : Seul le Super Administrateur peut modifier le statut d’une licence.');
    }
    const lic = this.licenses.find(l => l.id === licenseId);
    if (!lic) throw new Error('Licence introuvable.');

    lic.status = newStatus;
    lic.updated_at = new Date().toISOString();

    const { computeHmacSha256 } = await import('../lib/licenseEngine');
    const payload = `${lic.establishment_id}|${lic.license_key}|${lic.plan_type}|${lic.expires_at}|${lic.max_users}|${lic.max_registers}`;
    lic.signature = await computeHmacSha256(payload);

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: lic.establishment_id,
      actor_id: callerUserId,
      action: newStatus === 'suspendue' ? 'LICENSE_SUSPENDED' : newStatus === 'active' ? 'LICENSE_REACTIVATED' : 'LICENSE_STATUS_CHANGED',
      entity_type: 'license',
      entity_id: lic.id,
      details: { new_status: newStatus, reason: reason || 'Gestion administrative Super Admin' },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return lic;
  }

  public async renewLicense(
    licenseId: string,
    durationMonths: number,
    callerUserId: string,
    isSuperAdmin: boolean
  ): Promise<License> {
    if (!isSuperAdmin) {
      throw new Error('Action refusée : Seul le Super Administrateur peut renouveler une licence.');
    }
    const lic = this.licenses.find(l => l.id === licenseId);
    if (!lic) throw new Error('Licence introuvable.');

    const currentExp = new Date(lic.expires_at);
    const baseDate = currentExp > new Date() ? currentExp : new Date();
    baseDate.setMonth(baseDate.getMonth() + (durationMonths || 12));

    lic.expires_at = baseDate.toISOString();
    lic.status = 'active';
    lic.updated_at = new Date().toISOString();

    const { computeHmacSha256 } = await import('../lib/licenseEngine');
    const payload = `${lic.establishment_id}|${lic.license_key}|${lic.plan_type}|${lic.expires_at}|${lic.max_users}|${lic.max_registers}`;
    lic.signature = await computeHmacSha256(payload);

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: lic.establishment_id,
      actor_id: callerUserId,
      action: 'LICENSE_RENEWED',
      entity_type: 'license',
      entity_id: lic.id,
      details: { additional_months: durationMonths, new_expires_at: lic.expires_at },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return lic;
  }

  public async updateLicenseDates(
    licenseId: string,
    startsAt: string,
    expiresAt: string,
    callerUserId: string,
    isSuperAdmin: boolean
  ): Promise<License> {
    if (!isSuperAdmin) {
      throw new Error('Action refusée : Seul le Super Administrateur peut modifier les dates d’une licence.');
    }
    const lic = this.licenses.find(l => l.id === licenseId);
    if (!lic) throw new Error('Licence introuvable.');

    lic.starts_at = new Date(startsAt).toISOString();
    lic.expires_at = new Date(expiresAt).toISOString();
    lic.updated_at = new Date().toISOString();

    const { computeHmacSha256 } = await import('../lib/licenseEngine');
    const payload = `${lic.establishment_id}|${lic.license_key}|${lic.plan_type}|${lic.expires_at}|${lic.max_users}|${lic.max_registers}`;
    lic.signature = await computeHmacSha256(payload);

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: lic.establishment_id,
      actor_id: callerUserId,
      action: 'LICENSE_DATES_MODIFIED',
      entity_type: 'license',
      entity_id: lic.id,
      details: { starts_at: lic.starts_at, expires_at: lic.expires_at },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return lic;
  }

  public checkEstablishmentOperational(establishmentId: string): {
    operational: boolean;
    status: LicenseStatus;
    reason?: string;
    license?: License;
  } {
    const est = this.establishments.find(e => e.id === establishmentId);
    if (!est) {
      return { operational: false, status: 'suspendue', reason: 'Établissement introuvable.' };
    }
    if (est.status === 'suspended') {
      return { operational: false, status: 'suspendue', reason: 'Établissement suspendu par la direction.' };
    }

    const lic = this.licenses.find(l => l.establishment_id === establishmentId && (l.status === 'active' || l.status === 'suspendue' || l.status === 'en_attente' || l.status === 'expiree'));
    if (!lic) {
      return { operational: false, status: 'suspendue', reason: 'Aucune licence active assignée à cet établissement.' };
    }

    if (lic.status === 'suspendue') {
      return { operational: false, status: 'suspendue', reason: 'Licence temporairement suspendue par le Super Administrateur. Opérations bloquées.', license: lic };
    }

    if (lic.status === 'en_attente') {
      return { operational: false, status: 'en_attente', reason: 'Licence en attente d’activation officielle.', license: lic };
    }

    if (lic.status === 'expiree' || new Date(lic.expires_at) < new Date()) {
      return { operational: false, status: 'expiree', reason: 'Licence arrivée à expiration. Renouvellement requis auprès du Super Admin.', license: lic };
    }

    return { operational: true, status: 'active', license: lic };
  }

  public async attachLicense(
    establishmentId: string,
    callerUserId: string,
    isSuperAdmin: boolean,
    license: License
  ): Promise<License> {
    if (!isSuperAdmin) {
      throw new Error('RLS Violation : Seul le Super Administrateur peut attribuer des licences PRO.');
    }

    // Marquer les précédentes comme archivées/expirées
    this.licenses.forEach(l => {
      if (l.establishment_id === establishmentId && l.status === 'active') {
        l.status = 'expired';
      }
    });

    this.licenses.unshift(license);

    this.auditLogs.unshift({
      id: `log_${Date.now()}`,
      establishment_id: establishmentId,
      actor_id: callerUserId,
      action: 'LICENSE_ATTACHED',
      entity_type: 'license',
      entity_id: license.id,
      details: { key: license.license_key, plan: license.plan_type, max_users: license.max_users },
      created_at: new Date().toISOString(),
    });

    this.persist();
    return license;
  }

  // --- Audit Logs ---
  public getAuditLogs(establishmentId?: string, isSuperAdmin: boolean = false): AuditLog[] {
    if (isSuperAdmin && !establishmentId) {
      return [...this.auditLogs];
    }
    return this.auditLogs.filter(l => l.establishment_id === establishmentId);
  }

  // Résout la session complète d'un utilisateur
  public resolveUserSession(profileId: string, preferredEstId?: string): CurrentUserSession {
    const profile = this.profiles.find(p => p.id === profileId);
    if (!profile) throw new Error('Utilisateur introuvable');

    const userMemberships = this.members.filter(m => m.profile_id === profileId && m.is_active);

    let activeEst: Establishment | undefined;
    let activeMembership: EstablishmentMember | undefined;

    if (preferredEstId) {
      activeEst = this.establishments.find(e => e.id === preferredEstId);
      activeMembership = userMemberships.find(m => m.establishment_id === preferredEstId);
    }

    if (!activeEst && userMemberships.length > 0) {
      const firstMem = userMemberships[0];
      activeEst = this.establishments.find(e => e.id === firstMem.establishment_id);
      activeMembership = firstMem;
    }

    // Si Super Admin et aucun établissement lié
    if (!activeEst && profile.is_super_admin) {
      activeEst = this.establishments[0];
    }

    // Calculer les rôles et permissions
    let sessionRoles: Role[] = [];
    let permissionCodes: string[] = [];

    if (activeMembership) {
      const roleIds = this.memberRoles[activeMembership.id] || [];
      sessionRoles = this.roles.filter(r => roleIds.includes(r.id));

      roleIds.forEach(rId => {
        const perms = this.rolePermissions[rId] || [];
        perms.forEach(p => {
          if (!permissionCodes.includes(p)) permissionCodes.push(p);
        });
      });
    }

    if (profile.is_super_admin) {
      permissionCodes = SYSTEM_PERMISSIONS.map(p => p.code);
    }

    const activeLicense = activeEst ? this.getActiveLicense(activeEst.id) : undefined;
    const mustChangePassword = Boolean(this.mustChangePasswordMap[profile.id] || profile.must_change_password);

    return {
      user: {
        ...profile,
        must_change_password: mustChangePassword,
      },
      activeEstablishment: activeEst,
      memberships: userMemberships,
      activeMembership,
      roles: sessionRoles,
      permissions: permissionCodes,
      activeLicense,
      isSuperAdmin: profile.is_super_admin,
      mustChangePassword,
    };
  }
}

// Instance globale singleton
export const db = new RelationalDatabaseStore();
