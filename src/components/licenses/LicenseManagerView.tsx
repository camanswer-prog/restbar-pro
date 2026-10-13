// RESTBAR PRO — License Management & Cryptographic Validation
import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sparkles,
  Server,
  Lock,
  Clock,
  Crown,
  Check,
  RefreshCw,
  Download,
  Globe,
  Wifi,
  WifiOff,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { License, LicensePlanType } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

export const LicenseManagerView: React.FC = () => {
  const { session, refreshSession } = useAuth();
  const { success, error, info } = useNotification();

  const [copiedKey, setCopiedKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationReport, setValidationReport] = useState<{
    valid: boolean;
    daysRemaining?: number;
    reason?: string;
    verifiedBy?: string;
    networkStatus?: string;
  } | null>(null);

  // CAM ANSWER Activation Form State
  const [camLicenseKeyInput, setCamLicenseKeyInput] = useState('');
  const [isActivatingCam, setIsActivatingCam] = useState(false);
  const [camActivationResult, setCamActivationResult] = useState<{
    success: boolean;
    message: string;
    isOffline?: boolean;
  } | null>(null);

  // Super Admin Generator Form State
  const [targetEstId, setTargetEstId] = useState(session?.activeEstablishment?.id || '');
  const [selectedPlan, setSelectedPlan] = useState<LicensePlanType>('pro');
  const [durationMonths, setDurationMonths] = useState(12);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeLicense = session?.activeLicense;
  const isSuperAdmin = session?.isSuperAdmin ?? false;
  const isGerant = session?.roles.some((r) => r.code === 'gerant') ?? false;

  const handleCopyKey = () => {
    if (!activeLicense) return;
    navigator.clipboard.writeText(activeLicense.license_key);
    setCopiedKey(true);
    success('Clé copiée', 'La clé de licence a été copiée dans le presse-papier.');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleValidateServer = async () => {
    if (!activeLicense) return;
    setIsValidating(true);
    setValidationReport(null);

    try {
      const report = await apiService.validateLicenseKey(activeLicense, session?.activeEstablishment?.id);
      setValidationReport(report);
      if (report.valid) {
        success('Licence Authentique', `Validée avec succès côté serveur. Reste ${report.daysRemaining} jours.`);
      } else {
        error('Échec de Validation', report.reason || 'Licence invalide.');
      }
    } catch (err: any) {
      error('Erreur Serveur', err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleActivateCamAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || (!isSuperAdmin && !isGerant)) {
      error('Action refusée', 'Seul le Super Administrateur ou le Gérant peut activer une licence.');
      return;
    }

    const estId = session.activeEstablishment?.id;
    if (!estId) {
      error('Erreur', 'Aucun établissement actif sélectionné.');
      return;
    }

    if (!camLicenseKeyInput.trim()) {
      error('Champ requis', 'Veuillez saisir votre clé de licence attribuée par CAM ANSWER.');
      return;
    }

    setIsActivatingCam(true);
    setCamActivationResult(null);

    try {
      const res = await apiService.activateCentralLicense(session, estId, camLicenseKeyInput.trim());
      setCamActivationResult({
        success: true,
        message: res.message || 'Licence CAM ANSWER activée avec succès !',
        isOffline: res.isOfflineMode,
      });
      success('Licence Activée', res.message || 'Licence rattachée avec succès à cet établissement.');
      setCamLicenseKeyInput('');
      refreshSession();
    } catch (err: any) {
      setCamActivationResult({
        success: false,
        message: err.message || 'Impossible d’activer la licence.',
      });
      error('Échec d’activation', err.message);
    } finally {
      setIsActivatingCam(false);
    }
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !isSuperAdmin) {
      error('Action refusée', 'Seul le Super Administrateur peut émettre des licences.');
      return;
    }

    const estId = targetEstId || session?.activeEstablishment?.id;
    if (!estId) {
      error('Erreur', 'Veuillez sélectionner un établissement.');
      return;
    }

    setIsGenerating(true);
    try {
      await apiService.generateLicense(
        session,
        estId,
        selectedPlan,
        { durationMonths: Number(durationMonths) }
      );
      success('Nouvelle Licence Émise', `Licence ${selectedPlan.toUpperCase()} générée et signée HMAC-SHA256.`);
      refreshSession();
    } catch (err: any) {
      error('Erreur Génération', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Licences PRO & Certification Serveur
            </h1>
            <Badge variant="amber">HMAC-SHA256 Signé</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Contrôle cryptographique des plafonds d'utilisateurs, des caisses et des modules souscrits.
          </p>
        </div>

        <button
          onClick={handleValidateServer}
          disabled={isValidating || !activeLicense}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-2 border border-slate-700 disabled:opacity-50"
        >
          {isValidating ? (
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          ) : (
            <Server className="w-4 h-4 text-emerald-400" />
          )}
          Vérifier la licence côté serveur
        </button>
      </div>

      {/* Main License Card */}
      {activeLicense ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success" size="sm">
                  ● STATUT : {activeLicense.status.toUpperCase()}
                </Badge>
                <Badge variant="amber" size="sm">
                  PLAN {activeLicense.plan_type.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wider">
                  {activeLicense.license_key}
                </h2>
                <button
                  onClick={handleCopyKey}
                  title="Copier la clé"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Attribuée à : <strong className="text-white">{session?.activeEstablishment?.name}</strong>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Expiration
                </span>
                <span className="text-sm font-semibold text-white font-mono">
                  {new Date(activeLicense.expires_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Bouton Export Sauvegarde (autorisé même si suspendu) */}
              <button
                onClick={async () => {
                  if (!session?.activeEstablishment) return;
                  try {
                    const dump = await apiService.exportBackup(session, session.activeEstablishment.id);
                    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `SAUVEGARDE_${session.activeEstablishment.slug}_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    success('Sauvegarde Exportée', 'Archive complète exportée avec signature SHA-256.');
                  } catch (e: any) {
                    error('Erreur export', e.message);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5 border border-slate-700"
                title="Exporter les données de cet établissement"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Exporter Sauvegarde
              </button>
            </div>
          </div>

          {/* Validation Result Box */}
          {validationReport && (
            <div
              className={`mt-4 p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in duration-200 ${
                validationReport.valid
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {validationReport.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="font-bold">
                    {validationReport.valid
                      ? 'Signature & Validation CAM ANSWER Confirmées'
                      : 'Alerte de vérification'}
                  </p>
                  <div className="flex items-center gap-2">
                    {validationReport.verifiedBy && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-700 font-mono text-slate-300">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        {validationReport.verifiedBy === 'cam_answer_central'
                          ? 'Plateforme Centrale CAM ANSWER'
                          : 'Certification HMAC-SHA256 Locale'}
                      </span>
                    )}
                    {validationReport.networkStatus === 'central_unreachable_using_offline_policy' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-950/80 border border-amber-700/50 text-amber-300 font-medium">
                        <WifiOff className="w-3 h-3 text-amber-400" />
                        Mode Hors-Ligne (Grâce 72h)
                      </span>
                    )}
                  </div>
                </div>
                <p className="opacity-90">
                  {validationReport.valid
                    ? `Contrôle de licence validé avec succès côté serveur. Reste ${validationReport.daysRemaining} jour(s) de validité sans restriction opérationnelle.`
                    : validationReport.reason}
                </p>
              </div>
            </div>
          )}

          {/* Quotas & Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Plafond Utilisateurs</span>
              <span className="text-2xl font-mono font-bold text-white mt-1 block">
                {activeLicense.max_users} Collaborateurs
              </span>
              <span className="text-[10px] text-slate-500">Gérant, serveurs, cuisine, bar, caisse</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Postes & Caisses Enregistreuses</span>
              <span className="text-2xl font-mono font-bold text-white mt-1 block">
                {activeLicense.max_registers} Caisses
              </span>
              <span className="text-[10px] text-slate-500">Tiroirs-caisses et TPE synchronisés</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Modules Inclus</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="success" size="sm">Écran Cuisine KDS</Badge>
                <Badge variant="purple" size="sm">Écran Bar</Badge>
                <Badge variant="info" size="sm">Rapports Financiers</Badge>
                {activeLicense.plan_type === 'enterprise' && (
                  <Badge variant="amber" size="sm">Gestion Stock</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Cryptographic Signature Trace */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span className="font-mono truncate max-w-lg">
              Empreinte SHA256 : <span className="text-slate-300">{activeLicense.signature}</span>
            </span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Non falsifiable
            </span>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <KeyRound className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Aucune licence active trouvée</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Cet établissement ne dispose pas d'une licence valide. Le gérant ou le Super Administrateur peut en
            activer une avec la clé attribuée ci-dessous.
          </p>
        </div>
      )}

      {/* Formulaire d'Activation de Licence CAM ANSWER MySQL Manager (Accessible au Gérant et au Super Admin) */}
      {(isGerant || isSuperAdmin) && (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-cyan-900/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base">
                  Activation de Licence Centrale — CAM ANSWER MySQL Manager
                </h2>
                <p className="text-xs text-slate-400">
                  Rattachement officiel de l'établissement à la plateforme centrale (<span className="text-cyan-400 font-mono">admin.connectsalon.net</span>).
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
              Établissement : <strong className="text-white">{session?.activeEstablishment?.name}</strong>
            </span>
          </div>

          <form onSubmit={handleActivateCamAnswer} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Clé de Licence attribuée par CAM ANSWER
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={camLicenseKeyInput}
                  onChange={(e) => setCamLicenseKeyInput(e.target.value)}
                  placeholder="Ex: RBP-001 ou RBP-PRO-7A9F-22B1-4E80-99C4"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-4 pr-32 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isActivatingCam || !camLicenseKeyInput.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  {isActivatingCam ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="w-3.5 h-3.5" />
                  )}
                  {isActivatingCam ? 'Activation...' : 'Activer'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Saisissez la clé transmise par l’administrateur CAM ANSWER. Les requêtes sont chiffrées en HTTPS et validées côté serveur.
              </p>
            </div>

            {camActivationResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  camActivationResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {camActivationResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{camActivationResult.message}</p>
                  {camActivationResult.isOffline && (
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Politique hors-ligne appliquée : délai de grâce de 72 heures actif.
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Super Admin Section: Émetteur de Licence */}
      {isSuperAdmin && (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Crown className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-bold text-white text-base">
                Espace Super Admin — Émission & Renouvellement de Licence PRO
              </h2>
              <p className="text-xs text-slate-400">
                Génération cryptographique côté serveur (HMAC-SHA256) avec attribution immédiate.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerateLicense} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Établissement Bénéficiaire
                </label>
                <select
                  value={targetEstId}
                  onChange={(e) => setTargetEstId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value={session?.activeEstablishment?.id}>
                    {session?.activeEstablishment?.name} (Actuel)
                  </option>
                  <option value="est_lounge_02">Bar & Lounge Le 1920 (Marseille)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Type d'Abonnement
                </label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as LicensePlanType)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="starter">STARTER (5 utilisateurs, 1 caisse)</option>
                  <option value="pro">PRO (15 utilisateurs, 4 caisses, KDS)</option>
                  <option value="enterprise">ENTERPRISE (50+ utilisateurs, 10 caisses, Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Durée de Validité
                </label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value={1}>1 Mois (Essai)</option>
                  <option value={3}>3 Mois</option>
                  <option value={6}>6 Mois</option>
                  <option value={12}>12 Mois (Annuel)</option>
                  <option value={24}>24 Mois (2 Ans)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {isGenerating ? 'Signature en cours...' : 'Émettre et Activer la Licence'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
