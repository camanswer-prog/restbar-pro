// RESTBAR PRO — Authentication & Login Screen
import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, resetPassword } = useAuth();
  const { success, error } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset password modal
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetSent, setIsResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      error('Email requis', 'Veuillez saisir votre adresse email professionnelle.');
      return;
    }
    if (!password.trim()) {
      error('Mot de passe requis', 'Veuillez saisir votre mot de passe pour vous authentifier.');
      return;
    }

    setIsLoading(true);
    const res = await login(email.trim(), password.trim());
    setIsLoading(false);

    if (res.success) {
      success('Connexion réussie', 'Bienvenue sur RESTBAR PRO.');
      if (onSuccess) onSuccess();
    } else {
      error('Échec de connexion', res.error || 'Identifiants ou mot de passe incorrects.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    const res = await resetPassword(resetEmail);
    if (res.success) {
      setIsResetSent(true);
      success('Email envoyé', `Instructions de réinitialisation transmises à ${resetEmail}`);
    } else {
      error('Erreur', res.error || 'Impossible de réinitialiser.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 mb-1">
            R
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-wider">RESTBAR</h1>
            <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Plateforme Sécurisée POS & Gestion Multi-Établissements
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              Connexion Collaborateur & Authentification
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Saisissez votre identifiant et votre mot de passe pour accéder à votre espace de travail.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Adresse Email Professionnelle *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="collaborateur@restaurant.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Mot de passe *
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline transition"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isLoading ? 'Vérification en cours...' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Security badge */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Authentification sécurisée avec mot de passe & RLS PostgreSQL</span>
        </div>
      </div>

      {/* Modal Récupération Mot de Passe */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => {
                setIsResetOpen(false);
                setIsResetSent(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Récupération de mot de passe
                </h3>
                <p className="text-xs text-slate-400">Supabase Auth Password Reset</p>
              </div>
            </div>

            {isResetSent ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Un lien sécurisé de réinitialisation a été envoyé à <strong>{resetEmail}</strong>.
                  Consultez votre boîte de réception.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Votre Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nom@restaurant.fr"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
                  >
                    Envoyer le lien
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
