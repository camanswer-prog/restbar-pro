// RESTBAR PRO — Top Bar / Header Component
import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  KeyRound,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Database,
  Crown,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStoredSupabaseConfig } from '../../lib/supabaseClient';
import { Badge } from '../common/Badge';
import { SupabaseConfigModal } from '../auth/SupabaseConfigModal';
import { UserProfileModal } from '../common/UserProfileModal';
import { ROLE_LABELS } from '../../lib/permissions';

interface HeaderProps {
  onOpenSupabaseConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSupabaseConfig }) => {
  const {
    session,
    logout,
    switchUser,
    switchEstablishment,
    availableProfiles,
    userEstablishments,
  } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEstMenuOpen, setIsEstMenuOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalInitialTab, setProfileModalInitialTab] = useState<'profile' | 'password'>('profile');

  const supabaseConfig = getStoredSupabaseConfig();

  if (!session) return null;

  const currentRole = session.roles[0]?.code;
  const roleMeta = currentRole ? ROLE_LABELS[currentRole] : null;

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Active Establishment Selector & Status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsEstMenuOpen(!isEstMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-left transition text-xs group"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white tracking-tight truncate max-w-[150px] sm:max-w-[220px]">
                    {session.activeEstablishment?.name || 'Aucun établissement sélectionné'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="text-emerald-400 font-mono">● Actif</span>
                  <span>•</span>
                  <span>{session.activeEstablishment?.city || 'France'}</span>
                </div>
              </div>
            </button>

            {/* Establishment Switcher Dropdown */}
            {isEstMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Établissements Disponibles
                </p>
                <div className="space-y-1">
                  {userEstablishments.map((est) => {
                    const isSelected = est.id === session.activeEstablishment?.id;
                    return (
                      <button
                        key={est.id}
                        onClick={() => {
                          switchEstablishment(est.id);
                          setIsEstMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition ${
                          isSelected
                            ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <p className="text-white font-medium">{est.name}</p>
                          <p className="text-[10px] text-slate-400">{est.address || est.city}</p>
                        </div>
                        {isSelected && <span className="text-[10px] text-amber-400 font-bold">Actif</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* License Status Badge */}
          {session.activeLicense && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold uppercase tracking-wider">
                Licence {session.activeLicense.plan_type}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-300">{session.activeLicense.max_users} Utilisateurs Max</span>
            </div>
          )}
        </div>

        {/* Right: Quick Switcher, Supabase Status & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Supabase Status Pill — STRICTEMENT RÉSERVÉ AU SUPER ADMIN */}
          {session.isSuperAdmin && (
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition ${
                supabaseConfig.isConfigured
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-amber-500/40'
              }`}
              title="Gérer la connexion Supabase Live"
            >
              <Database className={`w-3.5 h-3.5 ${supabaseConfig.isConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="hidden md:inline">
                {supabaseConfig.isConfigured ? 'Supabase Live' : 'Moteur PostgreSQL'}
              </span>
            </button>
          )}

          {/* Quick Role & Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 transition text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-md">
                {session.user.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-tight">
                    {session.user.full_name}
                  </span>
                  {session.isSuperAdmin ? (
                    <Crown className="w-3 h-3 text-amber-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {session.isSuperAdmin ? (
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                      Super Admin
                    </span>
                  ) : roleMeta ? (
                    <span className="text-[10px] text-slate-400">{roleMeta.label}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Personnel</span>
                  )}
                </div>
              </div>
            </button>

            {/* Persona Switcher Dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="p-2 border-b border-slate-800 mb-1">
                  <p className="text-xs font-bold text-white">{session.user.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{session.user.email}</p>
                </div>

                <div className="py-2 space-y-1">
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                    <p className="font-semibold text-white mb-0.5">Rôle actif :</p>
                    <p className="text-amber-400 font-medium">
                      {session.isSuperAdmin ? 'Super Administrateur Global' : roleMeta ? roleMeta.label : 'Personnel'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Chaque collaborateur doit s'authentifier avec son propre compte et mot de passe.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setProfileModalInitialTab('profile');
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-xs text-slate-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span>Mon Profil & Permissions</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setProfileModalInitialTab('password');
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-xs text-amber-300 transition"
                  >
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Modifier mon mot de passe</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-xs text-slate-400 hover:text-white border border-slate-800 transition mt-2"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Changer de compte / Rôle</span>
                    </div>
                    <span className="text-[10px] text-amber-400/80 font-mono">Déconnexion</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 mt-1">
                  {session.isSuperAdmin && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsConfigModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-xs text-slate-300 transition"
                    >
                      <Database className="w-4 h-4 text-emerald-400" />
                      Paramètres Supabase
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-rose-950/40 text-xs text-rose-400 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        initialTab={profileModalInitialTab}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
