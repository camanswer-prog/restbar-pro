// RESTBAR PRO — Super Admin Multi-Establishments & License Command Center
import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Eye,
  Edit2,
  Power,
  Store,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Shield,
  Sparkles,
  KeyRound,
  Clock,
  RefreshCw,
  Copy,
  Check,
  FileText,
  Database,
  Download,
  Upload,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { Establishment, License, LicensePlanType, LicenseStatus, AuditLog } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { Badge } from '../common/Badge';

export const SuperAdminEstablishmentsView: React.FC = () => {
  const { session, switchEstablishment, refreshSession } = useAuth();
  const { success, error, info } = useNotification();

  // Navigation interne Super Admin
  const [activeSubTab, setActiveSubTab] = useState<'establishments' | 'licenses' | 'audit' | 'backup'>('establishments');

  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals Établissement
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewEst, setViewEst] = useState<Establishment | null>(null);
  const [editEst, setEditEst] = useState<Establishment | null>(null);
  const [toggleConfirmEst, setToggleConfirmEst] = useState<Establishment | null>(null);

  // Formulaire Création Établissement
  const [newName, setNewName] = useState('');
  const [newLegalName, setNewLegalName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newPlan, setNewPlan] = useState<LicensePlanType>('pro');

  // Modals & Formulaires Licences
  const [isGenerateLicenseModalOpen, setIsGenerateLicenseModalOpen] = useState(false);
  const [licenseTargetEstId, setLicenseTargetEstId] = useState('');
  const [licensePlan, setLicensePlan] = useState<LicensePlanType>('pro');
  const [licenseDurationMonths, setLicenseDurationMonths] = useState(12);
  const [licenseStartsAt, setLicenseStartsAt] = useState(new Date().toISOString().split('T')[0]);
  const [licenseCustomExpiresAt, setLicenseCustomExpiresAt] = useState('');
  const [licenseInitialStatus, setLicenseInitialStatus] = useState<'active' | 'en_attente' | 'suspendue' | 'expiree'>('active');
  const [isGeneratingLicense, setIsGeneratingLicense] = useState(false);

  // Action sur Licence spécifique
  const [selectedLicenseForAction, setSelectedLicenseForAction] = useState<License | null>(null);
  const [licenseActionType, setLicenseActionType] = useState<'suspend' | 'renew' | 'edit_dates' | null>(null);
  const [suspendReason, setSuspendReason] = useState('Non-respect des conditions d’abonnement ou suspension administrative');
  const [renewMonths, setRenewMonths] = useState(12);
  const [editStartInput, setEditStartInput] = useState('');
  const [editExpireInput, setEditExpireInput] = useState('');

  // Filtre Licence
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<'all' | 'active' | 'en_attente' | 'suspendue' | 'expiree'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sauvegarde & Restauration
  const [backupEstId, setBackupEstId] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedBackupData, setExportedBackupData] = useState<any | null>(null);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const loadData = async () => {
    if (!session?.isSuperAdmin) return;
    setIsLoading(true);
    try {
      const [estData, licData, logs] = await Promise.all([
        apiService.getEstablishments(session),
        apiService.getLicenses(session),
        apiService.getAuditLogs(session),
      ]);
      setEstablishments(estData);
      setLicenses(licData);
      setAuditLogs(logs);
      if (estData.length > 0 && !licenseTargetEstId) {
        setLicenseTargetEstId(estData[0].id);
        setBackupEstId(estData[0].id);
      }
    } catch (err: any) {
      error('Erreur chargement', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    success('Clé copiée', 'Clé de licence copiée dans le presse-papier.');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newName) {
      error('Nom requis', 'Veuillez saisir le nom de l’établissement.');
      return;
    }

    try {
      const slug = newName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { establishment, license } = await apiService.createEstablishment(session, {
        name: newName,
        slug,
        legal_name: newLegalName,
        email: newEmail,
        phone: newPhone,
        address: newAddress,
        city: newCity,
        plan_type: newPlan,
      });

      success('Établissement Créé', `${establishment.name} a été provisionné avec une licence ${newPlan.toUpperCase()}.`);
      setIsCreateModalOpen(false);
      setNewName('');
      setNewLegalName('');
      setNewEmail('');
      setNewPhone('');
      setNewAddress('');
      setNewCity('');
      loadData();
      refreshSession();
    } catch (err: any) {
      error('Échec création', err.message);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !editEst) return;

    try {
      await apiService.updateEstablishment(session, editEst.id, {
        name: editEst.name,
        legal_name: editEst.legal_name,
        email: editEst.email,
        phone: editEst.phone,
        address: editEst.address,
        city: editEst.city,
        status: editEst.status,
      });

      success('Mise à jour réussie', `Les informations de ${editEst.name} ont été enregistrées.`);
      setEditEst(null);
      loadData();
      refreshSession();
    } catch (err: any) {
      error('Échec mise à jour', err.message);
    }
  };

  const handleToggleStatus = async () => {
    if (!session || !toggleConfirmEst) return;
    const newStatus = toggleConfirmEst.status === 'active' ? 'suspended' : 'active';

    try {
      await apiService.updateEstablishment(session, toggleConfirmEst.id, {
        status: newStatus,
      });

      if (newStatus === 'active') {
        success('Établissement activé', `${toggleConfirmEst.name} est à nouveau opérationnel.`);
      } else {
        info('Établissement suspendu', `L'accès à ${toggleConfirmEst.name} est suspendu.`);
      }
      setToggleConfirmEst(null);
      loadData();
      refreshSession();
    } catch (err: any) {
      error('Erreur statut', err.message);
    }
  };

  // Génération de Licence avec dates personnalisées
  const handleGenerateLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !session.isSuperAdmin) return;
    if (!licenseTargetEstId) {
      error('Erreur', 'Veuillez sélectionner un établissement.');
      return;
    }

    setIsGeneratingLicense(true);
    try {
      let expiresAtIso: string | undefined = undefined;
      if (licenseCustomExpiresAt) {
        expiresAtIso = new Date(licenseCustomExpiresAt).toISOString();
      }

      const generated = await apiService.generateLicense(session, licenseTargetEstId, licensePlan, {
        durationMonths: Number(licenseDurationMonths),
        startsAt: licenseStartsAt ? new Date(licenseStartsAt).toISOString() : undefined,
        expiresAt: expiresAtIso,
        status: licenseInitialStatus,
      });

      success(
        'Licence Émise avec Succès',
        `Licence ${licensePlan.toUpperCase()} signée HMAC-SHA256 pour l'établissement sélectionné.`
      );
      setIsGenerateLicenseModalOpen(false);
      loadData();
      refreshSession();
    } catch (err: any) {
      error('Erreur Génération', err.message);
    } finally {
      setIsGeneratingLicense(false);
    }
  };

  // Actions Cycle de Vie de Licence
  const handleExecuteLicenseAction = async () => {
    if (!session || !selectedLicenseForAction) return;

    try {
      if (licenseActionType === 'suspend') {
        await apiService.updateLicenseStatus(session, selectedLicenseForAction, 'suspendue', suspendReason);
        success('Licence Suspendue', `La licence ${selectedLicenseForAction.license_key} a été suspendue. Les opérations métier de cet établissement sont verrouillées.`);
      } else if (licenseActionType === 'renew') {
        await apiService.renewLicense(session, selectedLicenseForAction, renewMonths);
        success('Licence Renouvelée', `Licence prolongée de ${renewMonths} mois avec signature recalculée.`);
      } else if (licenseActionType === 'edit_dates') {
        await apiService.updateLicenseDates(session, selectedLicenseForAction, editStartInput, editExpireInput);
        success('Dates Mises à Jour', 'Les dates de validité et la signature HMAC ont été mises à jour.');
      }
      setSelectedLicenseForAction(null);
      setLicenseActionType(null);
      loadData();
      refreshSession();
    } catch (err: any) {
      error('Erreur Action', err.message);
    }
  };

  const handleQuickActivateLicense = async (lic: License) => {
    if (!session) return;
    try {
      await apiService.updateLicenseStatus(session, lic, 'active', 'Activation directe par Super Admin');
      success('Licence Activée', `La licence ${lic.license_key} est désormais active.`);
      loadData();
      refreshSession();
    } catch (err: any) {
      error('Erreur activation', err.message);
    }
  };

  // Sauvegarde
  const handleExportBackup = async () => {
    if (!session || !backupEstId) return;
    setIsExporting(true);
    try {
      const dump = await apiService.exportBackup(session, backupEstId);
      setExportedBackupData(dump);
      success('Sauvegarde Certifiée', `Archive générée avec signature SHA-256 : ${dump.checksum?.substring(0, 16)}...`);
    } catch (err: any) {
      error('Erreur export', err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadBackupFile = () => {
    if (!exportedBackupData) return;
    const blob = new Blob([JSON.stringify(exportedBackupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RESTBAR_BACKUP_${backupEstId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    success('Téléchargement débuté', 'Le fichier JSON de sauvegarde a été téléchargé.');
  };

  const handleRestoreBackupSubmit = async () => {
    if (!session || !restoreJsonInput || !backupEstId) return;
    setIsRestoring(true);
    try {
      const parsed = JSON.parse(restoreJsonInput);
      await apiService.restoreBackup(session, backupEstId, parsed);
      success('Restauration Réussie', 'Intégrité vérifiée et données restaurées avec succès.');
      setRestoreJsonInput('');
      loadData();
      refreshSession();
    } catch (err: any) {
      error('Erreur Restauration', err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  // Formatage de la dernière activité
  const formatLastActivity = (isoString?: string) => {
    if (!isoString) return 'Aucune activité récente';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "À l'instant";
    if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Filtrage des licences
  const filteredLicenses = licenses.filter((lic) => {
    if (licenseStatusFilter === 'all') return true;
    if (licenseStatusFilter === 'expiree') {
      return lic.status === 'expiree' || lic.status === 'expired' || new Date(lic.expires_at) < new Date();
    }
    return lic.status === licenseStatusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Espace Administration Globale (Super Admin)
            </h1>
            <Badge variant="purple">Multi-Établissements & Licences PRO</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Gestion du parc complet d'établissements, émission cryptographique des licences, audit et sécurité.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGenerateLicenseModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition flex items-center gap-2 border border-slate-700"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Émettre une licence
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-amber-950/40"
          >
            <Plus className="w-4 h-4" />
            Créer un établissement
          </button>
        </div>
      </div>

      {/* Navigation Onglets Super Admin */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSubTab('establishments')}
          className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'establishments'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Établissements & Activité ({establishments.length})
        </button>
        <button
          onClick={() => setActiveSubTab('licenses')}
          className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'licenses'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Parc des Licences ({licenses.length})
        </button>
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'audit'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Historique d'Activation & Audit ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('backup')}
          className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'backup'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          Sauvegarde & Restauration (SHA-256)
        </button>
      </div>

      {/* ==================================================================== */}
      {/* ONGLET 1 : ÉTABLISSEMENTS & DERNIÈRE ACTIVITÉ                         */}
      {/* ==================================================================== */}
      {activeSubTab === 'establishments' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Établissement</th>
                  <th className="py-3.5 px-4">Identifiant (Slug)</th>
                  <th className="py-3.5 px-4">Coordonnées</th>
                  <th className="py-3.5 px-4">Dernière Activité</th>
                  <th className="py-3.5 px-4">Licence Active</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {establishments.map((est) => {
                  const isCurrent = est.id === session?.activeEstablishment?.id;
                  const estLic = licenses.find((l) => l.establishment_id === est.id && l.status === 'active');

                  return (
                    <tr key={est.id} className="hover:bg-slate-800/40 transition group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{est.name}</span>
                              {isCurrent && <Badge variant="amber" size="sm">Session Active</Badge>}
                            </div>
                            <p className="text-[11px] text-slate-400">{est.legal_name || 'Raison sociale standard'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[11px]">
                          {est.slug}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        <p className="text-white font-medium">{est.city || 'France'}</p>
                        <p className="text-[11px] text-slate-400">{est.phone || est.email || '—'}</p>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatLastActivity(est.last_activity_at)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {estLic ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-emerald-400 text-[11px] uppercase">
                              ● {estLic.plan_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Exp : {new Date(estLic.expires_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Aucune</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {est.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Suspendu
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Basculer dessus */}
                          <button
                            title="Basculer sur cet établissement"
                            onClick={() => {
                              switchEstablishment(est.id);
                              success('Établissement sélectionné', `Vous travaillez désormais sur ${est.name}.`);
                            }}
                            className="px-2 py-1 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-800 transition text-[11px] flex items-center gap-1 border border-slate-800"
                          >
                            Basculer
                          </button>

                          {/* Voir */}
                          <button
                            title="Voir les détails"
                            onClick={() => setViewEst(est)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Modifier */}
                          <button
                            title="Modifier les informations"
                            onClick={() => setEditEst(est)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Suspendre / Activer */}
                          <button
                            title={est.status === 'active' ? "Suspendre l'établissement" : "Activer l'établissement"}
                            onClick={() => setToggleConfirmEst(est)}
                            className={`p-1.5 rounded-lg transition ${
                              est.status === 'active'
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ONGLET 2 : PARC DES LICENCES & GESTION DU CYCLE DE VIE                 */}
      {/* ==================================================================== */}
      {activeSubTab === 'licenses' && (
        <div className="space-y-4">
          {/* Barre d'outils filtres */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-slate-400 font-semibold mr-2">Filtre Statut :</span>
              {(['all', 'active', 'en_attente', 'suspendue', 'expiree'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setLicenseStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition uppercase text-[11px] ${
                    licenseStatusFilter === st
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st === 'all' ? 'Toutes' : st}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsGenerateLicenseModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle Licence
            </button>
          </div>

          {/* Tableau des Licences */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Clé de Licence</th>
                    <th className="py-3.5 px-4">Établissement</th>
                    <th className="py-3.5 px-4">Plan & Quotas</th>
                    <th className="py-3.5 px-4">Période de Validité</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Actions Cycle de Vie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredLicenses.map((lic) => {
                    const est = establishments.find((e) => e.id === lic.establishment_id);
                    const isExp = new Date(lic.expires_at) < new Date() || lic.status === 'expiree' || lic.status === 'expired';
                    const diffDays = Math.ceil((new Date(lic.expires_at).getTime() - Date.now()) / (1000 * 3600 * 24));

                    return (
                      <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white tracking-wider text-xs">
                              {lic.license_key}
                            </span>
                            <button
                              onClick={() => handleCopyKey(lic.license_key)}
                              className="text-slate-400 hover:text-amber-400 p-1"
                              title="Copier la clé"
                            >
                              {copiedKey === lic.license_key ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            HMAC: {lic.signature ? `${lic.signature.substring(0, 14)}...` : 'N/A'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">{est?.name || lic.establishment_id}</p>
                          <p className="text-[10px] text-slate-400">{est?.city || 'Local'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="amber" size="sm">
                            {lic.plan_type.toUpperCase()}
                          </Badge>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {lic.max_users} users • {lic.max_registers} caisses
                          </p>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <p className="text-slate-300">
                            Du {new Date(lic.starts_at).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-slate-400">
                            Au {new Date(lic.expires_at).toLocaleDateString('fr-FR')}
                            <span className={`ml-1 text-[10px] font-bold ${diffDays < 0 ? 'text-rose-400' : diffDays < 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              ({diffDays < 0 ? 'Échue' : `J-${diffDays}`})
                            </span>
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          {lic.status === 'active' && !isExp ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                              ● ACTIVE
                            </span>
                          ) : lic.status === 'suspendue' ? (
                            <span className="inline-flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                              ● SUSPENDUE
                            </span>
                          ) : lic.status === 'en_attente' ? (
                            <span className="inline-flex items-center gap-1 text-blue-400 font-semibold text-[11px]">
                              ⏳ EN ATTENTE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                              ⚠️ EXPIRÉE
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Activer si en attente */}
                            {lic.status === 'en_attente' && (
                              <button
                                onClick={() => handleQuickActivateLicense(lic)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                              >
                                Activer
                              </button>
                            )}

                            {/* Suspendre */}
                            {lic.status === 'active' && (
                              <button
                                onClick={() => {
                                  setSelectedLicenseForAction(lic);
                                  setLicenseActionType('suspend');
                                }}
                                className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-lg text-[10px] font-semibold"
                              >
                                Suspendre
                              </button>
                            )}

                            {/* Réactiver si suspendue */}
                            {lic.status === 'suspendue' && (
                              <button
                                onClick={() => handleQuickActivateLicense(lic)}
                                className="px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800 text-emerald-300 rounded-lg text-[10px] font-semibold"
                              >
                                Réactiver
                              </button>
                            )}

                            {/* Renouveler */}
                            <button
                              onClick={() => {
                                setSelectedLicenseForAction(lic);
                                setLicenseActionType('renew');
                              }}
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-semibold"
                            >
                              Renouveler
                            </button>

                            {/* Modifier Dates */}
                            <button
                              onClick={() => {
                                setSelectedLicenseForAction(lic);
                                setLicenseActionType('edit_dates');
                                setEditStartInput(lic.starts_at.split('T')[0]);
                                setEditExpireInput(lic.expires_at.split('T')[0]);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                              title="Modifier dates de validité"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ONGLET 3 : HISTORIQUE D'ACTIVATION & JOURNAL D'AUDIT                   */}
      {/* ==================================================================== */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider">
              Traçabilité Cryptographique & Journaux d'Audit Super Admin
            </h3>
            <span className="text-xs text-slate-400">{auditLogs.length} événements enregistrés</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Établissement</th>
                  <th className="py-3 px-4">Entité / Réf</th>
                  <th className="py-3 px-4">Détails de l'opération</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {auditLogs.map((log) => {
                  const est = establishments.find((e) => e.id === log.establishment_id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition font-mono text-[11px]">
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.action.includes('SUSPEND')
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : log.action.includes('RENEW') || log.action.includes('ACTIVAT')
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans font-medium">
                        {est?.name || log.establishment_id || 'Global'}
                      </td>
                      <td className="py-3 px-4 text-amber-400">
                        {log.entity_id || log.entity_type}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ONGLET 4 : SAUVEGARDE & RESTAURATION (EXPORT / IMPORT SHA-256)        */}
      {/* ==================================================================== */}
      {activeSubTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exportation de Sauvegarde */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Export de Sauvegarde Certifiée</h3>
                <p className="text-xs text-slate-400">Extraction sécurisée avec Checksum SHA-256 pour archivage ou migration.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Sélectionner l'établissement cible
              </label>
              <select
                value={backupEstId}
                onChange={(e) => setBackupEstId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
              >
                {establishments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.city || 'France'})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Générer et Certifier la Sauvegarde
            </button>

            {exportedBackupData && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-emerald-400 font-bold">
                  <span>✓ Sauvegarde Certifiée Générée</span>
                  <span className="font-mono text-[10px]">{exportedBackupData.exportedAt}</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all">
                  SHA-256 : {exportedBackupData.checksum}
                </div>
                <button
                  onClick={handleDownloadBackupFile}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Télécharger le fichier JSON
                </button>
              </div>
            )}
          </div>

          {/* Restauration de Sauvegarde */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Procédure de Restauration</h3>
                <p className="text-xs text-slate-400">Vérification cryptographique de l'intégrité avant injection dans la base.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Coller le contenu de la sauvegarde JSON
              </label>
              <textarea
                rows={5}
                value={restoreJsonInput}
                onChange={(e) => setRestoreJsonInput(e.target.value)}
                placeholder='Collez ici le JSON complet {"checksum": "...", "data": {...}}'
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white font-mono"
              />
            </div>

            <button
              onClick={handleRestoreBackupSubmit}
              disabled={isRestoring || !restoreJsonInput.trim()}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Vérifier l'Intégrité & Restaurer
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : CRÉER UN NOUVEL ÉTABLISSEMENT                                */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Provisionner un Nouvel Établissement
                </h3>
                <p className="text-xs text-slate-400">
                  Création d'un bar/restaurant isolé avec licence PRO automatique.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nom commercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Le RoofTop Panoramique"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Raison Sociale
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SAS Panoramique"
                    value={newLegalName}
                    onChange={(e) => setNewLegalName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email de contact
                  </label>
                  <input
                    type="email"
                    placeholder="contact@rooftop.fr"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    placeholder="Abidjan / Paris"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Plan de licence initial
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as LicensePlanType)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="starter">Starter (1 caisse, 5 serveurs)</option>
                    <option value="pro">PRO (4 caisses, 15 serveurs, KDS)</option>
                    <option value="enterprise">Enterprise (20 caisses, illimité, Stocks)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-lg shadow-amber-950/40"
                >
                  Créer et Provisionner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : ÉMETTRE UNE NOUVELLE LICENCE UNIQUE                          */}
      {/* ==================================================================== */}
      {isGenerateLicenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setIsGenerateLicenseModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Générer une Clé de Licence Unique
                </h3>
                <p className="text-xs text-slate-400">
                  Signature cryptographique HMAC-SHA256 avec date de début et expiration.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateLicenseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Établissement Bénéficiaire *
                </label>
                <select
                  value={licenseTargetEstId}
                  onChange={(e) => setLicenseTargetEstId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  {establishments.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.name} ({est.city || 'France'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Formule / Plan
                  </label>
                  <select
                    value={licensePlan}
                    onChange={(e) => setLicensePlan(e.target.value as LicensePlanType)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">PRO (Standard)</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Statut Initial
                  </label>
                  <select
                    value={licenseInitialStatus}
                    onChange={(e) => setLicenseInitialStatus(e.target.value as 'active' | 'en_attente' | 'suspendue' | 'expiree')}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="active">Active (Immédiate)</option>
                    <option value="en_attente">En Attente de Règlement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={licenseStartsAt}
                    onChange={(e) => setLicenseStartsAt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Durée en mois
                  </label>
                  <select
                    value={licenseDurationMonths}
                    onChange={(e) => {
                      setLicenseDurationMonths(Number(e.target.value));
                      setLicenseCustomExpiresAt('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    <option value={1}>1 mois (Essai)</option>
                    <option value={6}>6 mois</option>
                    <option value={12}>12 mois (1 an standard)</option>
                    <option value={24}>24 mois (2 ans)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateLicenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingLicense}
                  className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-lg shadow-amber-950/40 flex items-center gap-2"
                >
                  {isGeneratingLicense ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Émettre et Signer la Licence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : ACTIONS CYCLE DE VIE (SUSPENDRE, RENOUVELER, MODIFIER DATES)  */}
      {/* ==================================================================== */}
      {selectedLicenseForAction && licenseActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => {
                setSelectedLicenseForAction(null);
                setLicenseActionType(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-2">
              {licenseActionType === 'suspend'
                ? '⚠️ Suspendre la Licence'
                : licenseActionType === 'renew'
                ? '🔄 Renouveler la Licence'
                : '📅 Modifier les Dates de Validité'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              {selectedLicenseForAction.license_key}
            </p>

            {licenseActionType === 'suspend' && (
              <div className="space-y-3">
                <p className="text-xs text-rose-300 bg-rose-950/50 p-3 rounded-xl border border-rose-900">
                  Attention : La suspension bloque immédiatement les prises de commandes et la caisse pour l'établissement concerné.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Motif de suspension (tracé dans l'audit)
                  </label>
                  <textarea
                    rows={3}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {licenseActionType === 'renew' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  La date d'expiration actuelle est :{' '}
                  <span className="font-bold text-white">
                    {new Date(selectedLicenseForAction.expires_at).toLocaleDateString('fr-FR')}
                  </span>.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Prolongation à ajouter
                  </label>
                  <select
                    value={renewMonths}
                    onChange={(e) => setRenewMonths(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value={6}>+ 6 mois</option>
                    <option value={12}>+ 12 mois (1 an)</option>
                    <option value={24}>+ 24 mois (2 ans)</option>
                  </select>
                </div>
              </div>
            )}

            {licenseActionType === 'edit_dates' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={editStartInput}
                    onChange={(e) => setEditStartInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Date d'expiration
                  </label>
                  <input
                    type="date"
                    value={editExpireInput}
                    onChange={(e) => setEditExpireInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedLicenseForAction(null);
                  setLicenseActionType(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteLicenseAction}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  licenseActionType === 'suspend'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                Confirmer l'opération
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Voir Détails Établissement */}
      {viewEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setViewEst(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">{viewEst.name}</h3>
                <p className="text-xs text-slate-400">{viewEst.legal_name || 'Raison sociale standard'}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Identifiant Unique (UUID) :</span>
                <span className="font-mono text-slate-300 text-[10px]">{viewEst.id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Slug URL :</span>
                <span className="font-mono text-amber-400">{viewEst.slug}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Dernière Activité :</span>
                <span className="text-emerald-400 font-mono">{formatLastActivity(viewEst.last_activity_at)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Statut :</span>
                <span className="font-semibold text-emerald-400 uppercase">{viewEst.status}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Ville & Adresse :</span>
                <span className="text-white">{viewEst.address ? `${viewEst.address}, ${viewEst.city}` : viewEst.city || 'Non renseigné'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Créé le :</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {new Date(viewEst.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setViewEst(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Modifier Établissement */}
      {editEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setEditEst(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              Modifier l'Établissement "{editEst.name}"
            </h3>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nom commercial
                </label>
                <input
                  type="text"
                  required
                  value={editEst.name}
                  onChange={(e) => setEditEst({ ...editEst, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={editEst.city || ''}
                    onChange={(e) => setEditEst({ ...editEst, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Statut
                  </label>
                  <select
                    value={editEst.status}
                    onChange={(e) => setEditEst({ ...editEst, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white"
                  >
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditEst(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal pour Suspendre / Activer Établissement */}
      <ConfirmModal
        isOpen={!!toggleConfirmEst}
        variant={toggleConfirmEst?.status === 'active' ? 'danger' : 'info'}
        title={
          toggleConfirmEst?.status === 'active'
            ? `Suspendre l'établissement "${toggleConfirmEst?.name}" ?`
            : `Réactiver l'établissement "${toggleConfirmEst?.name}" ?`
        }
        message={
          toggleConfirmEst?.status === 'active'
            ? 'Tous les membres et employés de cet établissement ne pourront plus accéder aux caisses et commandes jusqu’à réactivation.'
            : 'L’ensemble du personnel et des caisses enregistreuses de cet établissement pourront immédiatement reprendre le service.'
        }
        confirmLabel={toggleConfirmEst?.status === 'active' ? 'Suspendre' : 'Réactiver'}
        cancelLabel="Annuler"
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleConfirmEst(null)}
      />
    </div>
  );
};
