// RESTBAR PRO — Modal Profil Personnel, Droits d'Accès & Modification du Mot de Passe
import React, { useState } from 'react';
import {
  User,
  Shield,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  Lock,
  KeyRound,
  X,
  Crown,
  Calendar,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ROLE_LABELS, SYSTEM_PERMISSIONS } from '../../lib/permissions';
import { Badge } from './Badge';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'password';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
}) => {
  const { session, changePassword } = useAuth();
  const { success, error } = useNotification();

  const [activeTab, setActiveTab] = useState<'profile' | 'password'>(initialTab);

  // Formulaire changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen || !session) return null;

  const currentRole = session.roles[0]?.code;
  const roleMeta = currentRole ? ROLE_LABELS[currentRole] : null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword) {
      error('Erreur', 'Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      error('Erreur', 'Le nouveau mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('Erreur', 'La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        success('Mot de passe mis à jour !', 'Votre nouveau mot de passe est désormais actif.');
        setPasswordStatus({ success: true, message: 'Mot de passe modifié avec succès !' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        error('Échec', res.error || 'Impossible de mettre à jour le mot de passe.');
        setPasswordStatus({ success: false, message: res.error || 'Erreur lors du changement de mot de passe.' });
      }
    } catch (err: any) {
      error('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
              {session.user.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {session.user.full_name}
                {session.isSuperAdmin && <Crown className="w-4 h-4 text-amber-400" />}
              </h2>
              <p className="text-xs text-slate-400">Compte Personnel & Sécurité</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'profile'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Mon Profil & Permissions</span>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'password'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Modifier mon mot de passe</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {activeTab === 'profile' ? (
            <>
              {/* Identifiants et coordonnées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                    <Mail className="w-3 h-3 text-amber-400" />
                    Adresse Email
                  </span>
                  <p className="text-white font-medium truncate">{session.user.email}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    Téléphone
                  </span>
                  <p className="text-white font-medium">{session.user.phone || 'Non renseigné'}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-400" />
                    Rôle Système Attribué
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {session.isSuperAdmin ? (
                      <Badge variant="amber">SUPER ADMINISTRATEUR</Badge>
                    ) : roleMeta ? (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${roleMeta.badgeColor}`}>
                        {roleMeta.label}
                      </span>
                    ) : (
                      <Badge variant="default">Personnel</Badge>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-purple-400" />
                    Établissement Actif
                  </span>
                  <p className="text-white font-medium truncate">
                    {session.activeEstablishment?.name || 'Plateforme Globale'}
                  </p>
                </div>
              </div>

              {/* Espace de travail dédié */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                  <KeyRound className="w-4 h-4" />
                  <span>Espace de travail et restrictions de sécurité</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  En application du principe du moindre privilège, seuls les menus et opérations autorisés pour votre fonction sont accessibles. Les accès aux autres espaces métier et modules financiers sont rigoureusement filtrés par les politiques RLS.
                </p>
              </div>

              {/* Permissions effectives */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Permissions accordées ({session.isSuperAdmin ? 'Toutes (Super Admin)' : session.permissions.length})
                  </span>
                </div>

                {session.isSuperAdmin ? (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300">
                    Droits d'administration totale : gestion des licences globales, des établissements et supervision plateforme.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                    {session.permissions.map((permCode) => {
                      const permMeta = SYSTEM_PERMISSIONS.find((p) => p.code === permCode);
                      return (
                        <div
                          key={permCode}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-900 border border-slate-800"
                        >
                          <span className="text-slate-200 font-medium">
                            {permMeta?.name || permCode}
                          </span>
                          <span className="font-mono text-[10px] text-amber-400/80">
                            {permCode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* TAB: MODIFIER MON MOT DE PASSE */
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Modifiez votre mot de passe de connexion personnel. Votre session restera active et le nouveau mot de passe sera exigé lors de vos prochaines connexions.
                </p>
              </div>

              {passwordStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    passwordStatus.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {passwordStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{passwordStatus.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mot de passe actuel *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    placeholder="Saisissez votre mot de passe actuel"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Minimum 4 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirmer le nouveau mot de passe *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="Répétez le nouveau mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Mise à jour en cours...' : 'Mettre à jour mon mot de passe'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
