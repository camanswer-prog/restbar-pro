// RESTBAR PRO — Main Layout Shell
import React, { useState } from 'react';
import { Menu, AlertTriangle, ShieldAlert, KeyRound, Download, ExternalLink } from 'lucide-react';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { SupabaseConfigModal } from '../auth/SupabaseConfigModal';
import { useAuth } from '../../context/AuthContext';

interface LayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const { session } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  const activeLicense = session?.activeLicense;
  const isExpired = activeLicense ? new Date(activeLicense.expires_at) < new Date() || activeLicense.status === 'expiree' || activeLicense.status === 'expired' : false;
  const isSuspended = activeLicense?.status === 'suspendue';
  const isPending = activeLicense?.status === 'en_attente';
  const isLocked = isSuspended || isExpired || isPending;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={onSelectTab}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between lg:hidden px-4 h-14 bg-slate-900 border-b border-slate-800">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-white tracking-wider text-sm">RESTBAR PRO</span>
            <div className="w-8" />
          </div>

          <Header onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)} />

          {/* Bannière de Contrôle de Licence Phase 3 (Blocage Opérations) */}
          {isLocked && (
            <div className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              isSuspended
                ? 'bg-rose-950/80 border-rose-800/80 text-rose-200'
                : isExpired
                ? 'bg-amber-950/80 border-amber-800/80 text-amber-200'
                : 'bg-blue-950/80 border-blue-800/80 text-blue-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isSuspended ? 'bg-rose-900/60 text-rose-400' : isExpired ? 'bg-amber-900/60 text-amber-400' : 'bg-blue-900/60 text-blue-400'
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-white">
                    {isSuspended
                      ? '⚠️ ACCÈS BLOQUÉ : Licence Temporairement Suspendue'
                      : isExpired
                      ? '⚠️ CONTRAT ÉCHU : Licence Arrivée à Expiration'
                      : '⏳ VALIDATION EN ATTENTE : Licence Non Activée'}
                  </p>
                  <p className="text-[11px] opacity-90">
                    {isSuspended
                      ? `Les opérations de caisse et de commande pour "${session?.activeEstablishment?.name}" sont verrouillées par le Super Administrateur. Vos données restent conservées en toute sécurité.`
                      : isExpired
                      ? `La licence de "${session?.activeEstablishment?.name}" a expiré. Les nouvelles commandes et règlements sont désactivés. Vos données et rapports restent préservés.`
                      : 'Cet établissement est en attente d’activation officielle de sa licence par la direction.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSelectTab(session?.isSuperAdmin ? 'superadmin' : 'licenses')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs border border-slate-700 transition flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  {session?.isSuperAdmin ? 'Régulariser (Super Admin)' : 'Consulter la Licence & Sauvegarde'}
                </button>
              </div>
            </div>
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>

      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
