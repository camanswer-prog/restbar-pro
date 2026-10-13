// RESTBAR PRO — Roles & Permissions Matrix Management
import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Save,
  RotateCcw,
  Info,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { Role } from '../../types/database';
import { SYSTEM_PERMISSIONS, ROLE_LABELS, canManageStaff } from '../../lib/permissions';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

export const RolesPermissionsMatrixView: React.FC = () => {
  const { session } = useAuth();
  const { success, error } = useNotification();

  const [roles, setRoles] = useState<Role[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({}); // roleId -> permissionCodes[]
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isManager = canManageStaff(session);

  const loadData = async () => {
    if (!session?.activeEstablishment) return;
    try {
      const rolesData = await apiService.getRoles(session.activeEstablishment.id);
      setRoles(rolesData);

      const mapping: Record<string, string[]> = {};
      for (const r of rolesData) {
        mapping[r.id] = await apiService.getRolePermissions(r.id);
      }
      setMatrix(mapping);
      setHasChanges(false);
    } catch (err: any) {
      error('Erreur matrice', err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [session?.activeEstablishment]);

  const togglePermission = (roleId: string, roleCode: string, permCode: string) => {
    if (!isManager) return;
    // Gérant conserve obligatoirement les droits de base
    if (roleCode === 'gerant' && permCode.startsWith('staff.')) {
      error('Protection', 'Le rôle gérant doit impérativement conserver la gestion du personnel.');
      return;
    }

    const currentPerms = matrix[roleId] || [];
    const hasPerm = currentPerms.includes(permCode);

    const updated = hasPerm
      ? currentPerms.filter((p) => p !== permCode)
      : [...currentPerms, permCode];

    setMatrix((prev) => ({
      ...prev,
      [roleId]: updated,
    }));
    setHasChanges(true);
  };

  const handleSaveMatrix = async () => {
    if (!session?.activeEstablishment || !isManager) return;
    setIsSaving(true);
    try {
      for (const role of roles) {
        const perms = matrix[role.id] || [];
        await apiService.updateRolePermissions(
          session,
          session.activeEstablishment.id,
          role.id,
          perms
        );
      }
      success('Matrice enregistrée', 'Les permissions de tous les rôles ont été synchronisées.');
      setHasChanges(false);
    } catch (err: any) {
      error('Échec sauvegarde', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { id: 'orders', label: 'Commandes & Tickets' },
    { id: 'tables', label: 'Salle & Tables' },
    { id: 'kitchen', label: 'Cuisine (KDS)' },
    { id: 'bar', label: 'Bar & Boissons' },
    { id: 'billing', label: 'Encaissement & Clôture Z' },
    { id: 'stock', label: 'Stocks & Magasin' },
    { id: 'staff', label: 'Personnel & Équipe' },
    { id: 'reports', label: 'Rapports & Chiffre d’Affaires' },
    { id: 'settings', label: 'Configuration Établissement' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Rôles & Matrice des Permissions
            </h1>
            <Badge variant="amber">Établissement : {session?.activeEstablishment?.name}</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Contrôle d'accès granulaire (RBAC). Seul le gérant peut adapter les prérogatives des postes.
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2.5">
            <button
              disabled={!hasChanges || isSaving}
              onClick={loadData}
              className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
            <button
              disabled={!hasChanges || isSaving}
              onClick={handleSaveMatrix}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer la matrice'}
            </button>
          </div>
        )}
      </div>

      {!isManager && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <Lock className="w-4 h-4 shrink-0" />
          <p>
            Mode consultation seule : Vous visualisez la matrice des droits en vigueur, mais seul
            le Gérant de l’établissement est habilité à la modifier.
          </p>
        </div>
      )}

      {/* Permission Matrix Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-4 px-5 font-bold uppercase tracking-wider text-[11px] w-80">
                  Permission Fonctionnelle
                </th>
                {roles.map((r) => {
                  const meta = ROLE_LABELS[r.code];
                  return (
                    <th key={r.id} className="py-4 px-3 text-center min-w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-white text-xs">{r.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {r.code}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categories.map((cat) => {
                const permsInCat = SYSTEM_PERMISSIONS.filter((p) => p.category === cat.id);
                if (permsInCat.length === 0) return null;

                return (
                  <React.Fragment key={cat.id}>
                    {/* Category Title Row */}
                    <tr className="bg-slate-950/80">
                      <td
                        colSpan={roles.length + 1}
                        className="py-2.5 px-5 text-[10px] font-black uppercase text-amber-400 tracking-wider bg-slate-950/80"
                      >
                        {cat.label}
                      </td>
                    </tr>

                    {/* Permissions rows */}
                    {permsInCat.map((perm) => {
                      return (
                        <tr
                          key={perm.code}
                          className="hover:bg-slate-800/40 transition group"
                        >
                          <td className="py-3 px-5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white tracking-tight">
                                  {perm.name}
                                </span>
                                <code className="text-[10px] text-slate-400 font-mono">
                                  {perm.code}
                                </code>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">{perm.description}</p>
                            </div>
                          </td>

                          {/* Columns per role */}
                          {roles.map((role) => {
                            const isAllowed = (matrix[role.id] || []).includes(perm.code);
                            const isLockedRole = !isManager;

                            return (
                              <td key={role.id} className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  disabled={isLockedRole}
                                  onClick={() => togglePermission(role.id, role.code, perm.code)}
                                  className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition border ${
                                    isAllowed
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                                  } ${isLockedRole ? 'cursor-not-allowed opacity-80' : 'cursor-pointer active:scale-95'}`}
                                >
                                  {isAllowed ? (
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                  ) : (
                                    <X className="w-3.5 h-3.5 opacity-40" />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
