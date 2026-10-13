// RESTBAR PRO — Modal Obligatoire de Changement de Mot de Passe à la Première Connexion
import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Store,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const FirstLoginPasswordModal: React.FC = () => {
  const { session, completeFirstLoginPasswordChange, logout } = useAuth();
  const { success, error } = useNotification();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Criteria validation
  const hasMinLength = newPassword.length >= 6;
  const hasLetterAndNumber = /[a-zA-Z]/.test(newPassword) && /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && passwordsMatch;

  // Password strength score (0 to 3)
  const calculateStrength = () => {
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8 && /[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword) && /[^a-zA-Z0-9]/.test(newPassword)) score++;
    return score;
  };

  const strength = calculateStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength) {
      error('Mot de passe trop court', 'Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (!passwordsMatch) {
      error('Mots de passe non concordants', 'La confirmation ne correspond pas au nouveau mot de passe saisi.');
      return;
    }

    setIsSubmitting(true);
    const res = await completeFirstLoginPasswordChange(newPassword.trim());
    setIsSubmitting(false);

    if (res.success) {
      success(
        'Mot de passe mis à jour !',
        'Votre mot de passe personnel a été enregistré avec succès. Bienvenue sur votre poste.'
      );
    } else {
      error('Erreur', res.error || 'Impossible de mettre à jour le mot de passe.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden text-slate-100 flex flex-col">
        {/* Top Security Banner */}
        <div className="p-6 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 shadow-inner shrink-0 mt-0.5">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[11px] mb-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Première Connexion — Étape Obligatoire
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Définir votre mot de passe personnel
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pour des raisons de sécurité, le mot de passe temporaire fourni par votre gérant doit être remplacé par votre propre mot de passe confidentiel.
              </p>
            </div>
          </div>
        </div>

        {/* User context card */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white">{session?.user.full_name}</span>
            <span className="text-slate-500 font-mono text-[11px]">({session?.user.email})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
              <Store className="w-3 h-3 text-amber-400" />
              {session?.activeEstablishment?.name}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold">
              Poste : {session?.roles[0]?.name || 'Collaborateur'}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nouveau Mot de Passe Personnel *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Entrez votre mot de passe secret"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Force du mot de passe */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Robustesse :</span>
                  <span
                    className={`font-semibold ${
                      strength === 1
                        ? 'text-rose-400'
                        : strength === 2
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {strength === 1 ? 'Faible' : strength === 2 ? 'Moyen' : 'Excellent'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 h-1.5">
                  <div
                    className={`rounded-full transition-colors ${
                      strength >= 1 ? (strength === 1 ? 'bg-rose-500' : 'bg-amber-500') : 'bg-slate-800'
                    }`}
                  />
                  <div
                    className={`rounded-full transition-colors ${
                      strength >= 2 ? (strength === 2 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-800'
                    }`}
                  />
                  <div
                    className={`rounded-full transition-colors ${
                      strength >= 3 ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirmer le Nouveau Mot de Passe *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Répétez votre mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition ${
                  confirmPassword && !passwordsMatch
                    ? 'border-rose-500/70 focus:border-rose-500'
                    : confirmPassword && passwordsMatch
                    ? 'border-emerald-500/70 focus:border-emerald-500'
                    : 'border-slate-800 focus:border-amber-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Checklist des exigences */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-600'}`}
              />
              <span className={hasMinLength ? 'text-slate-300' : 'text-slate-500'}>
                Au moins 6 caractères
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${hasLetterAndNumber ? 'text-emerald-400' : 'text-slate-600'}`}
              />
              <span className={hasLetterAndNumber ? 'text-slate-300' : 'text-slate-500'}>
                Recommandé : lettres, chiffres ou symboles
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-600'}`}
              />
              <span className={passwordsMatch ? 'text-slate-300' : 'text-slate-500'}>
                Les deux mots de passe sont identiques
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                isFormValid && !isSubmitting
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-950/40 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <span>{isSubmitting ? 'Enregistrement en cours...' : 'Valider mon mot de passe et continuer'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-300 text-xs font-semibold transition border border-slate-800 flex items-center justify-center gap-1.5 shrink-0"
              title="Se déconnecter sans changer de mot de passe"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
