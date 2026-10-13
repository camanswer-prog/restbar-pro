// RESTBAR PRO — Dynamic Role-Based Sidebar Navigation
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Store,
  Users,
  ShieldCheck,
  KeyRound,
  FileText,
  Terminal,
  Crown,
  Utensils,
  Wine,
  ChefHat,
  CreditCard,
  Boxes,
  TrendingUp,
  Receipt,
  Activity,
  Send,
  UserCheck,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CurrentUserSession, RoleCode } from '../../types/database';
import { hasPermission, ROLE_LABELS } from '../../lib/permissions';
import { UserProfileModal } from '../common/UserProfileModal';

export type NavTab =
  | 'dashboard'
  | 'tables'
  | 'orders'
  | 'kds_bar'
  | 'kds_kitchen'
  | 'cashier'
  | 'menu'
  | 'stocks'
  | 'expenses'
  | 'reports'
  | 'tests'
  | 'establishment'
  | 'staff'
  | 'permissions'
  | 'licenses'
  | 'audit'
  | 'superadmin'
  | 'sql_console';

export interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ReactNode;
  category: string;
  badge?: string;
}

/**
 * Calcule la liste exacte des onglets autorisés pour une session donnée
 */
export function getAllowedNavTabs(session: CurrentUserSession | null): NavTab[] {
  if (!session) return ['dashboard'];

  // 1. SUPER ADMIN : Uniquement l'administration globale
  if (session.isSuperAdmin) {
    return [
      'dashboard',
      'superadmin',
      'licenses',
      'staff',
      'reports',
      'audit',
      'sql_console',
      'tests',
    ];
  }

  const primaryRole = session.roles[0]?.code as RoleCode | undefined;

  // 2. GÉRANT : Menus de gestion de son bar/restaurant
  // RÈGLE STRICTE :
  // - La gérante ne doit pas voir le journal d'audit ('audit') ni la console SQL/Supabase ('sql_console') (réservés uniquement au Super Admin).
  // - Le gérant ne joue pas le rôle des autres : ni serveuse ('tables', 'orders'), ni barman ('kds_bar'), ni cuisinier ('kds_kitchen'), ni caissier ('cashier').
  // Le gérant supervise : Carte/Menu, Stocks, Dépenses, Rapports, Équipe, Rôles/Permissions, Établissement, Licence et Tests.
  if (primaryRole === 'gerant') {
    return [
      'dashboard',
      'menu',
      'stocks',
      'expenses',
      'reports',
      'staff',
      'permissions',
      'establishment',
      'licenses',
      'tests',
    ];
  }

  // 3. SERVEUR / SERVEUSE : Espace Service en Salle
  if (primaryRole === 'serveur') {
    return ['dashboard', 'tables', 'orders', 'kds_kitchen'];
  }

  // 4. BARMAN : File bar et production boissons
  if (primaryRole === 'barman') {
    return ['dashboard', 'kds_bar'];
  }

  // 5. CUISINE : File cuisine et production plats
  if (primaryRole === 'cuisine') {
    return ['dashboard', 'kds_kitchen'];
  }

  // 6. CAISSIER / CAISSIÈRE : Caisse, encaissements et tickets (consultation & impression uniquement)
  // RÈGLE STRICTE RLS : Le caissier ne doit pas voir les dépenses ni les rapports globaux
  if (primaryRole === 'caissier') {
    return ['dashboard', 'cashier'];
  }

  // 7. MAGASINIER : Accès EXCLUSIF au module de gestion des stocks (entrées/sorties)
  if (primaryRole === 'magasinier') {
    return ['stocks'];
  }

  // Permissions granulaires de secours
  const tabs: NavTab[] = ['dashboard'];
  if (hasPermission(session, 'tables.view')) tabs.push('tables');
  if (hasPermission(session, 'orders.create')) tabs.push('orders');
  if (hasPermission(session, 'bar.kds_view')) tabs.push('kds_bar');
  if (hasPermission(session, 'kitchen.kds_view')) tabs.push('kds_kitchen');
  if (hasPermission(session, 'billing.payment') || hasPermission(session, 'payments.create')) tabs.push('cashier');
  if (hasPermission(session, 'stock.manage')) tabs.push('stocks');
  if (hasPermission(session, 'reports.view')) tabs.push('reports');
  if (hasPermission(session, 'staff.view') || hasPermission(session, 'users.view')) tabs.push('staff');
  if (hasPermission(session, 'staff.roles') || hasPermission(session, 'roles.manage')) tabs.push('permissions');
  if (hasPermission(session, 'settings.view') || hasPermission(session, 'settings.manage')) tabs.push('establishment');
  if (hasPermission(session, 'licenses.manage')) tabs.push('licenses');
  return tabs;
}

/**
 * Retourne l'onglet d'atterrissage recommandé selon le rôle
 */
export function getDefaultLandingTab(session: CurrentUserSession | null): NavTab {
  if (!session) return 'dashboard';
  if (session.isSuperAdmin) return 'dashboard';
  const role = session.roles[0]?.code;
  switch (role) {
    case 'serveur':
      return 'tables';
    case 'barman':
      return 'kds_bar';
    case 'cuisine':
      return 'kds_kitchen';
    case 'caissier':
      return 'cashier';
    case 'magasinier':
      return 'stocks';
    case 'gerant':
    default:
      return 'dashboard';
  }
}

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { session } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!session) return null;

  const isSuperAdmin = session.isSuperAdmin;
  const primaryRole = session.roles[0]?.code as RoleCode | undefined;
  const roleMeta = primaryRole ? ROLE_LABELS[primaryRole] : null;
  const allowedTabs = getAllowedNavTabs(session);

  // Définition de tous les éléments de navigation avec catégorisation
  const allNavItems: NavItemConfig[] = [
    // --- SERVICE EN SALLE & POS ---
    {
      id: 'dashboard',
      label: isSuperAdmin
        ? 'Supervision Globale'
        : primaryRole === 'serveur'
        ? 'Tableau de bord Service'
        : primaryRole === 'barman'
        ? 'Tableau de bord Bar'
        : primaryRole === 'cuisine'
        ? 'Tableau de bord Cuisine'
        : primaryRole === 'caissier'
        ? 'Tableau de bord Caisse'
        : primaryRole === 'magasinier'
        ? 'Tableau de bord Stocks'
        : 'Tableau de bord',
      icon: <LayoutDashboard className="w-4 h-4 text-amber-400" />,
      category: isSuperAdmin ? 'Supervision Plateforme' : 'Espace de Travail',
    },
    {
      id: 'tables',
      label: 'Plan de Salle & Tables',
      icon: <Store className="w-4 h-4 text-amber-400" />,
      category: 'Service en Salle & POS',
      badge: 'Tables',
    },
    {
      id: 'orders',
      label: 'Prise de Commandes',
      icon: <Send className="w-4 h-4 text-blue-400" />,
      category: 'Service en Salle & POS',
      badge: 'Salle',
    },
    {
      id: 'kds_bar',
      label: 'Écran Production Bar',
      icon: <Wine className="w-4 h-4 text-purple-400" />,
      category: primaryRole === 'barman' ? 'Espace Bar' : 'Production KDS',
      badge: 'Bar',
    },
    {
      id: 'kds_kitchen',
      label: primaryRole === 'serveur' ? 'Suivi Production Cuisine' : 'Écran Production Cuisine',
      icon: <ChefHat className="w-4 h-4 text-emerald-400" />,
      category: primaryRole === 'cuisine' ? 'Espace Cuisine' : primaryRole === 'serveur' ? 'Service en Salle & POS' : 'Production KDS',
      badge: 'KDS',
    },
    {
      id: 'cashier',
      label: 'Caisse & Règlements',
      icon: <CreditCard className="w-4 h-4 text-amber-400" />,
      category: primaryRole === 'caissier' ? 'Espace Caisse' : 'Encaissement & Gestion',
      badge: 'Wave / OM',
    },
    {
      id: 'menu',
      label: 'Carte, Plats & Boissons',
      icon: <Utensils className="w-4 h-4 text-orange-400" />,
      category: 'Encaissement & Gestion',
    },
    {
      id: 'stocks',
      label: 'Stocks & Ingrédients',
      icon: <Boxes className="w-4 h-4 text-cyan-400" />,
      category: 'Encaissement & Gestion',
    },
    {
      id: 'expenses',
      label: 'Dépenses & Décaissements',
      icon: <Receipt className="w-4 h-4 text-rose-400" />,
      category: primaryRole === 'caissier' ? 'Espace Caisse' : 'Encaissement & Gestion',
    },
    {
      id: 'reports',
      label: isSuperAdmin ? 'Statistiques Globales' : 'Rapports de Ventes (Z)',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      category: isSuperAdmin ? 'Supervision Plateforme' : 'Encaissement & Gestion',
    },
    {
      id: 'tests',
      label: 'Banc de Tests Automatisés',
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      category: isSuperAdmin ? 'Supervision Plateforme' : 'Contrôles & Sécurité',
      badge: '11 Tests',
    },
    // --- ADMINISTRATION ÉTABLISSEMENT ---
    {
      id: 'establishment',
      label: 'Établissement & TVA',
      icon: <Store className="w-4 h-4 text-slate-300" />,
      category: 'Administration Établissement',
    },
    {
      id: 'staff',
      label: isSuperAdmin ? 'Utilisateurs & Gérants' : 'Équipe & Collaborateurs',
      icon: <Users className="w-4 h-4 text-slate-300" />,
      category: isSuperAdmin ? 'Supervision Plateforme' : 'Administration Établissement',
    },
    {
      id: 'permissions',
      label: 'Rôles & Permissions',
      icon: <ShieldCheck className="w-4 h-4 text-slate-300" />,
      category: 'Administration Établissement',
    },
    {
      id: 'licenses',
      label: isSuperAdmin ? 'Licences PRO (Émission)' : 'Licence Établissement',
      icon: <KeyRound className="w-4 h-4 text-amber-400" />,
      category: isSuperAdmin ? 'Supervision Plateforme' : 'Sécurité & Licences',
      badge: 'HMAC',
    },
    {
      id: 'audit',
      label: "Journal d'Audit",
      icon: <FileText className="w-4 h-4 text-slate-300" />,
      category: 'Supervision Plateforme',
      badge: 'SuperAdmin',
    },
    // --- SUPER ADMIN SEULEMENT ---
    {
      id: 'superadmin',
      label: 'Établissements & Réseau',
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      category: 'Supervision Plateforme',
      badge: 'Global',
    },
    {
      id: 'sql_console',
      label: 'Console SQL & Supabase',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      category: 'Supervision Plateforme',
      badge: 'Dev',
    },
  ];

  // FILTRAGE STRICT : On ne retient QUE les items dans allowedTabs
  // Aucun élément verrouillé ou menu d'un autre rôle n'est affiché.
  const authorizedItems = allNavItems.filter((item) => allowedTabs.includes(item.id));

  // Extraction ordonnée des catégories
  const categories = Array.from(new Set(authorizedItems.map((item) => item.category)));

  // Label de l'espace de travail
  const workspaceTitle = isSuperAdmin
    ? 'ESPACE SUPER ADMIN'
    : primaryRole === 'gerant'
    ? 'GESTION DU RESTAURANT'
    : primaryRole === 'serveur'
    ? 'ESPACE SALLE & SERVICE'
    : primaryRole === 'barman'
    ? 'ESPACE BAR KDS'
    : primaryRole === 'cuisine'
    ? 'ESPACE CUISINE KDS'
    : primaryRole === 'caissier'
    ? 'ESPACE CAISSE'
    : 'ESPACE COLLABORATEUR';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-amber-500/20">
              R
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white tracking-wider text-base">RESTBAR</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-amber-400 font-mono font-semibold tracking-tight">
                Phase 3 • Sécurité & Licences
              </p>
            </div>
          </div>
        </div>

        {/* Espace de travail badge */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-500">
                Espace Connecté
              </p>
              <p className="text-xs font-bold text-amber-400 truncate tracking-tight">
                {workspaceTitle}
              </p>
            </div>
            {isSuperAdmin ? (
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            ) : roleMeta ? (
              <span className={`w-2 h-2 rounded-full ${primaryRole === 'serveur' ? 'bg-blue-400' : primaryRole === 'barman' ? 'bg-purple-400' : primaryRole === 'cuisine' ? 'bg-emerald-400' : primaryRole === 'caissier' ? 'bg-cyan-400' : 'bg-amber-400'} animate-pulse`} />
            ) : null}
          </div>
        </div>

        {/* Navigation Items (Exclusivement ceux autorisés pour l'utilisateur) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {categories.map((cat) => {
            const itemsInCat = authorizedItems.filter((i) => i.category === cat);
            if (itemsInCat.length === 0) return null;

            return (
              <div key={cat} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {cat}
                </p>
                {itemsInCat.map((item) => {
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition group ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-md shadow-amber-950/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={
                            isActive
                              ? 'text-amber-400 shrink-0'
                              : 'text-slate-400 group-hover:text-slate-200 shrink-0'
                          }
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Action Profil Personnel & Session Info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0 space-y-2">
          {/* Bouton Profil Personnel */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-left transition group text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0 border border-amber-500/30">
                {session.user.full_name.charAt(0)}
              </div>
              <div className="truncate">
                <p className="font-semibold text-white truncate text-[11px]">
                  {session.user.full_name}
                </p>
                <p className="text-[9px] text-slate-400 truncate">
                  Profil personnel & droits
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
          </button>

          {/* Statut Établissement Actif */}
          <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{session.activeEstablishment?.name}</span>
            </span>
            <span className="font-mono text-emerald-400 text-[9px] shrink-0">Actif</span>
          </div>
        </div>
      </aside>

      {/* Modal Profil Personnel */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
