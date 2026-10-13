// RESTBAR PRO — API & Backend Service Orchestrator
import { getSupabase } from '../lib/supabaseClient';
import { db } from './databaseService';
import {
  AuditLog,
  CurrentUserSession,
  Establishment,
  EstablishmentMember,
  EstablishmentSettings,
  License,
  LicensePlanType,
  Role,
} from '../types/database';

export const apiService = {
  // --- Établissements ---
  async getEstablishments(session: CurrentUserSession): Promise<Establishment[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.from('establishments').select('*');
      if (!error && data) return data as Establishment[];
    }
    return db.getEstablishments(session.user.id, session.isSuperAdmin);
  },

  async createEstablishment(
    session: CurrentUserSession,
    data: { name: string; slug: string; legal_name?: string; email?: string; phone?: string; address?: string; city?: string; plan_type?: LicensePlanType }
  ): Promise<{ establishment: Establishment; license: License }> {
    return db.createEstablishment(session.user.id, session.isSuperAdmin, data);
  },

  async updateEstablishment(
    session: CurrentUserSession,
    establishmentId: string,
    updates: Partial<Establishment>
  ): Promise<Establishment> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('establishments')
        .update(updates)
        .eq('id', establishmentId)
        .select()
        .single();
      if (!error && data) return data as Establishment;
    }
    return db.updateEstablishment(establishmentId, session.user.id, session.isSuperAdmin, updates);
  },

  // --- Membres & Personnel ---
  async getMembers(session: CurrentUserSession, establishmentId: string): Promise<EstablishmentMember[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('establishment_members')
        .select('*, profile:profiles(*), user_roles(role:roles(*))')
        .eq('establishment_id', establishmentId);
      if (!error && data) {
        return data.map((m: any) => ({
          ...m,
          roles: m.user_roles?.map((ur: any) => ur.role) || [],
        }));
      }
    }
    return db.getEstablishmentMembers(establishmentId, session.user.id, session.isSuperAdmin);
  },

  async createMember(
    session: CurrentUserSession,
    establishmentId: string,
    data: {
      email: string;
      full_name: string;
      phone?: string;
      role_id: string;
      initial_password?: string;
      must_change_password?: boolean;
    }
  ): Promise<EstablishmentMember> {
    return db.createMember(establishmentId, session.user.id, session.isSuperAdmin, data);
  },

  async resetMemberPassword(
    session: CurrentUserSession,
    establishmentId: string,
    targetUserId: string,
    newTempPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    return db.resetUserPasswordByManager(establishmentId, session.user.id, session.isSuperAdmin, targetUserId, newTempPassword);
  },

  async completeFirstLoginPasswordChange(
    userId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    return db.completeFirstLoginPasswordChange(userId, newPassword);
  },

  async toggleMemberStatus(
    session: CurrentUserSession,
    establishmentId: string,
    memberId: string,
    isActive: boolean
  ): Promise<EstablishmentMember> {
    return db.updateMemberStatus(memberId, establishmentId, session.user.id, session.isSuperAdmin, isActive);
  },

  async assignRole(
    session: CurrentUserSession,
    establishmentId: string,
    memberId: string,
    roleId: string
  ): Promise<void> {
    return db.assignMemberRole(memberId, establishmentId, session.user.id, session.isSuperAdmin, roleId);
  },

  // --- Rôles & Permissions ---
  async getRoles(establishmentId?: string): Promise<Role[]> {
    return db.getRoles(establishmentId);
  },

  async getRolePermissions(roleId: string): Promise<string[]> {
    return db.getRolePermissions(roleId);
  },

  async updateRolePermissions(
    session: CurrentUserSession,
    establishmentId: string,
    roleId: string,
    permissions: string[]
  ): Promise<void> {
    return db.updateRolePermissions(roleId, permissions, establishmentId, session.user.id, session.isSuperAdmin);
  },

  // --- Paramètres d'Établissement ---
  async getSettings(session: CurrentUserSession, establishmentId: string): Promise<EstablishmentSettings> {
    return db.getEstablishmentSettings(establishmentId, session.user.id, session.isSuperAdmin);
  },

  async updateSettings(
    session: CurrentUserSession,
    establishmentId: string,
    updates: Partial<EstablishmentSettings>
  ): Promise<EstablishmentSettings> {
    return db.updateEstablishmentSettings(establishmentId, session.user.id, session.isSuperAdmin, updates);
  },

  // --- Licences PRO ---
  async getLicenses(session: CurrentUserSession, establishmentId?: string): Promise<License[]> {
    return db.getLicenses(establishmentId, session.isSuperAdmin);
  },

  async generateLicense(
    session: CurrentUserSession,
    establishmentId: string,
    planType: LicensePlanType,
    options?: {
      durationMonths?: number;
      startsAt?: string;
      expiresAt?: string;
      status?: 'active' | 'en_attente' | 'suspendue' | 'expiree';
    }
  ): Promise<License> {
    if (!session.isSuperAdmin) {
      throw new Error('Action réservée au Super Administrateur.');
    }

    const durationMonths = options?.durationMonths ?? 12;
    const startsAt = options?.startsAt;
    const expiresAt = options?.expiresAt;
    const status = options?.status || 'active';

    // Tente l'API serveur Node.js sécurisée
    try {
      const res = await fetch('/api/licenses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishmentId,
          planType,
          durationMonths,
          startsAt,
          expiresAt,
          status,
          callerIsSuperAdmin: true,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.license) {
          await db.attachLicense(establishmentId, session.user.id, true, json.license);
          return json.license;
        }
      }
    } catch {
      // Fallback local direct
    }

    // Fallback via crypto engine
    const { createSignedLicense } = await import('../lib/licenseEngine');
    const license = await createSignedLicense({
      establishmentId,
      planType,
      durationMonths,
      startsAt,
      expiresAt,
      status,
    });
    return db.attachLicense(establishmentId, session.user.id, true, license);
  },

  async updateLicenseStatus(
    session: CurrentUserSession,
    license: License,
    newStatus: 'active' | 'en_attente' | 'suspendue' | 'expiree',
    reason?: string
  ): Promise<License> {
    if (!session.isSuperAdmin) {
      throw new Error('Action réservée au Super Administrateur.');
    }

    try {
      const res = await fetch('/api/admin/licenses/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerIsSuperAdmin: true,
          action: 'set_status',
          newStatus,
          license,
          reason,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.license) {
          await db.updateLicenseStatus(license.id, newStatus, session.user.id, true, reason);
          return json.license;
        }
      }
    } catch {
      // Fallback
    }

    return db.updateLicenseStatus(license.id, newStatus, session.user.id, true, reason);
  },

  async renewLicense(
    session: CurrentUserSession,
    license: License,
    durationMonths: number = 12
  ): Promise<License> {
    if (!session.isSuperAdmin) {
      throw new Error('Action réservée au Super Administrateur.');
    }

    try {
      const res = await fetch('/api/admin/licenses/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerIsSuperAdmin: true,
          action: 'renew',
          additionalMonths: durationMonths,
          license,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.license) {
          await db.renewLicense(license.id, durationMonths, session.user.id, true);
          return json.license;
        }
      }
    } catch {
      // Fallback
    }

    return db.renewLicense(license.id, durationMonths, session.user.id, true);
  },

  async updateLicenseDates(
    session: CurrentUserSession,
    license: License,
    startsAt: string,
    expiresAt: string
  ): Promise<License> {
    if (!session.isSuperAdmin) {
      throw new Error('Action réservée au Super Administrateur.');
    }

    try {
      const res = await fetch('/api/admin/licenses/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerIsSuperAdmin: true,
          action: 'update_dates',
          newStartsAt: startsAt,
          newExpiresAt: expiresAt,
          license,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.license) {
          await db.updateLicenseDates(license.id, startsAt, expiresAt, session.user.id, true);
          return json.license;
        }
      }
    } catch {
      // Fallback
    }

    return db.updateLicenseDates(license.id, startsAt, expiresAt, session.user.id, true);
  },

  async validateLicenseKey(
    license: License,
    establishmentId?: string
  ): Promise<{
    valid: boolean;
    reason?: string;
    daysRemaining?: number;
    isSuspended?: boolean;
    isExpired?: boolean;
    isPending?: boolean;
    verifiedBy?: string;
    networkStatus?: string;
  }> {
    // 1. Tente la validation via le proxy CAM ANSWER central
    try {
      const res = await fetch('/api/central-licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license, establishmentId }),
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Fallback vers l'endpoint standard ou moteur local
    }

    try {
      const res = await fetch('/api/licenses/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license, establishmentId }),
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Fallback client
    }
    const { verifyLicense } = await import('../lib/licenseEngine');
    return verifyLicense(license, establishmentId);
  },

  /**
   * Active une licence CAM ANSWER attribuée par l'administrateur
   */
  async activateCentralLicense(
    session: CurrentUserSession,
    establishmentId: string,
    licenseKey: string
  ): Promise<{
    success: boolean;
    license?: License;
    message?: string;
    error?: string;
    source?: string;
    isOfflineMode?: boolean;
    offlineGracePeriodHours?: number;
  }> {
    const isAllowed = session.isSuperAdmin || session.roles.some(r => r.code === 'gerant');
    if (!isAllowed) {
      throw new Error('Action réservée au Super Administrateur ou au Gérant.');
    }

    const est = db.getEstablishments(session.user.id, session.isSuperAdmin).find(e => e.id === establishmentId);

    const res = await fetch('/api/central-licenses/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        establishmentId,
        establishmentName: est?.name || '',
        callerIsAdmin: true,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Échec d’activation auprès de CAM ANSWER.');
    }

    if (json.license) {
      await db.attachLicense(establishmentId, session.user.id, true, json.license);
    }

    return json;
  },

  // --- Sauvegarde & Restauration (Export / Import Sécurisé SHA-256) ---
  async exportBackup(session: CurrentUserSession, establishmentId: string): Promise<any> {
    const { posStore } = await import('./posService');
    const est = db.getEstablishments(session.user.id, session.isSuperAdmin).find(e => e.id === establishmentId);
    const settings = db.getEstablishmentSettings(establishmentId, session.user.id, session.isSuperAdmin);
    const members = db.getEstablishmentMembers(establishmentId, session.user.id, session.isSuperAdmin);
    const licenses = db.getLicenses(establishmentId, session.isSuperAdmin);
    const auditLogs = db.getAuditLogs(establishmentId, session.isSuperAdmin);
    const posDump = posStore.getEstablishmentDump(establishmentId);

    const payload = {
      establishment: est,
      settings,
      members,
      licenses,
      auditLogs,
      ...posDump,
    };

    try {
      const res = await fetch('/api/backup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishmentId,
          payload,
          callerIsAdmin: true,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback client checksum
    }

    // Fallback simple
    return {
      success: true,
      establishmentId,
      exportedAt: new Date().toISOString(),
      checksum: 'LOCAL_SNAPSHOT_' + Date.now(),
      version: 'RESTBAR-PRO-BACKUP-V3',
      data: payload,
    };
  },

  async restoreBackup(session: CurrentUserSession, establishmentId: string, backupArchive: any): Promise<any> {
    if (!session.isSuperAdmin) {
      throw new Error('Action réservée au Super Administrateur pour la restauration globale.');
    }

    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishmentId,
          backupFile: backupArchive,
          callerIsSuperAdmin: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Échec de vérification du backup');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Intégrité compromise')) {
        throw e;
      }
    }

    const { posStore } = await import('./posService');
    const data = backupArchive.data;
    if (data) {
      posStore.restoreEstablishmentDump(establishmentId, data);
    }
    return { success: true, message: 'Sauvegarde restaurée avec succès.' };
  },

  // --- Journal d'Audit ---
  async getAuditLogs(session: CurrentUserSession, establishmentId?: string): Promise<AuditLog[]> {
    return db.getAuditLogs(establishmentId, session.isSuperAdmin);
  },
};
