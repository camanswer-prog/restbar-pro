/**
 * RESTBAR PRO — Phase 1 & Phase 2 : Fondations, POS, Bar, Cuisine, Caisse & Stocks
 */
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { NavTab, getAllowedNavTabs, getDefaultLandingTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { StaffMembersView } from './components/team/StaffMembersView';
import { RolesPermissionsMatrixView } from './components/team/RolesPermissionsMatrixView';
import { EstablishmentSettingsView } from './components/establishments/EstablishmentSettingsView';
import { LicenseManagerView } from './components/licenses/LicenseManagerView';
import { SuperAdminEstablishmentsView } from './components/establishments/SuperAdminEstablishmentsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { SqlConsoleView } from './components/sql-console/SqlConsoleView';
import { LoginView } from './components/auth/LoginView';
import { FirstLoginPasswordModal } from './components/auth/FirstLoginPasswordModal';

// Phase 2 Modules
import { TablesView } from './components/pos/TablesView';
import { OrderTakingView } from './components/pos/OrderTakingView';
import { BarKdsView } from './components/pos/BarKdsView';
import { KitchenKdsView } from './components/pos/KitchenKdsView';
import { CashRegisterView } from './components/pos/CashRegisterView';
import { MenuCatalogView } from './components/pos/MenuCatalogView';
import { StockManagementView } from './components/pos/StockManagementView';
import { ExpensesView } from './components/pos/ExpensesView';
import { ReportsView } from './components/pos/ReportsView';
import { PosTestSuiteView } from './components/pos/PosTestSuiteView';
import { DiningTable } from './types/database';

const MainAppContent: React.FC = () => {
  const { session, isLoading, mustChangePassword } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isLoggedOutExplicitly, setIsLoggedOutExplicitly] = useState(false);

  // Cross-view state (e.g. from table select to order taking, or from table to cashier)
  const [activeTableForOrder, setActiveTableForOrder] = useState<DiningTable | null>(null);
  const [targetOrderIdForBilling, setTargetOrderIdForBilling] = useState<string | undefined>(undefined);

  // Synchronisation dynamique du menu selon le compte connecté & son rôle
  React.useEffect(() => {
    if (session) {
      const allowed = getAllowedNavTabs(session);
      if (!allowed.includes(currentTab)) {
        setCurrentTab(getDefaultLandingTab(session));
      }
    }
  }, [session?.user.id, session?.roles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono tracking-wider text-slate-400">
          Initialisation RESTBAR PRO & Realtime KDS...
        </p>
      </div>
    );
  }

  if (isLoggedOutExplicitly || !session) {
    return <LoginView onSuccess={() => setIsLoggedOutExplicitly(false)} />;
  }

  const allowedTabs = getAllowedNavTabs(session);

  const renderCurrentView = () => {
    // 1. RÈGLE STRICTE : Audit et Console SQL / Supabase réservés UNIQUEMENT au Super Admin
    if ((currentTab === 'audit' || currentTab === 'sql_console') && !session.isSuperAdmin) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-rose-900/40 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Accès Réservé au Super Admin</h2>
            <p className="text-xs text-slate-400 mt-1">
              Le journal d'audit et la console SQL / Supabase sont strictement réservés au Super Administrateur. Le rôle Gérant et les collaborateurs opérationnels n'y ont pas accès.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab(getDefaultLandingTab(session))}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Retourner à mon espace de travail
          </button>
        </div>
      );
    }

    // 2. RÈGLE STRICTE : Le gérant ne joue pas le rôle des autres (serveuse, barman, cuisinier, caissier)
    const primaryRole = session.roles[0]?.code;
    const isOperationalRoleTab = ['tables', 'orders', 'kds_bar', 'kds_kitchen', 'cashier'].includes(currentTab);
    if (primaryRole === 'gerant' && isOperationalRoleTab) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-amber-900/40 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Séparation des Rôles & Postes</h2>
            <p className="text-xs text-slate-400 mt-1">
              Le rôle Gérant ne joue pas le rôle des collaborateurs de salle, du bar, de la cuisine ou de la caisse.
              Votre espace est dédié au pilotage : carte & prix, supervision des stocks, dépenses, rapports de vente et gestion du personnel.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Retourner au tableau de bord gérance
          </button>
        </div>
      );
    }

    // 3. RÈGLE STRICTE RLS : Le caissier est strictement restreint aux tickets de caisse
    if (primaryRole === 'caissier' && (currentTab === 'expenses' || currentTab === 'reports')) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-cyan-900/40 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Politique RLS : Module Financier Restreint</h2>
            <p className="text-xs text-slate-400 mt-1">
              En application de la politique PostgreSQL RLS, le rôle Caissier est strictement restreint à la consultation et à l'impression des tickets de caisse (payés ou non payés).
              L'accès aux dépenses générales de l'établissement et aux rapports financiers consolidés est réservé à la gérance et au Super Admin.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('cashier')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Retourner à la Caisse & Tickets
          </button>
        </div>
      );
    }

    // 4. RÈGLE STRICTE RLS : Le magasinier est exclusivement restreint au module des stocks
    if (primaryRole === 'magasinier' && currentTab !== 'stocks') {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-teal-900/40 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Accès Exclusif au Module des Stocks</h2>
            <p className="text-xs text-slate-400 mt-1">
              En tant que Magasinier, votre accès est exclusivement réservé à la gestion des stocks (entrées/sorties, inventaires, modification et suppression des mouvements).
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('stocks')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Accéder à la gestion des stocks
          </button>
        </div>
      );
    }

    // Garde de sécurité générale : l'utilisateur ne peut pas accéder à un écran réservé à un autre rôle
    if (!allowedTabs.includes(currentTab)) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Espace Non Autorisé</h2>
            <p className="text-xs text-slate-400 mt-1">
              Votre rôle actuel ({session.roles[0]?.name || 'Collaborateur'}) ne dispose pas des permissions requises pour accéder à ce menu.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab(getDefaultLandingTab(session))}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
          >
            Retourner à mon espace de travail
          </button>
        </div>
      );
    }
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'tables':
        return (
          <TablesView
            onSelectTableForOrder={(table) => {
              setActiveTableForOrder(table);
              setCurrentTab('orders');
            }}
            onNavigateToBilling={(orderId) => {
              setTargetOrderIdForBilling(orderId);
              setCurrentTab('cashier');
            }}
          />
        );
      case 'orders':
        return (
          <OrderTakingView
            initialTable={activeTableForOrder}
            onOrderCompleted={() => {
              setActiveTableForOrder(null);
              setCurrentTab('tables');
            }}
            onBackToTables={() => {
              setActiveTableForOrder(null);
              setCurrentTab('tables');
            }}
          />
        );
      case 'kds_bar':
        return <BarKdsView />;
      case 'kds_kitchen':
        return <KitchenKdsView />;
      case 'cashier':
        return <CashRegisterView initialOrderId={targetOrderIdForBilling} />;
      case 'menu':
        return <MenuCatalogView />;
      case 'stocks':
        return <StockManagementView />;
      case 'expenses':
        return <ExpensesView />;
      case 'reports':
        return <ReportsView />;
      case 'tests':
        return <PosTestSuiteView />;
      case 'establishment':
        return <EstablishmentSettingsView />;
      case 'staff':
        return <StaffMembersView />;
      case 'permissions':
        return <RolesPermissionsMatrixView />;
      case 'licenses':
        return <LicenseManagerView />;
      case 'audit':
        return <AuditLogsView />;
      case 'superadmin':
        return <SuperAdminEstablishmentsView />;
      case 'sql_console':
        return <SqlConsoleView />;
      default:
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <>
      <Layout currentTab={currentTab} onSelectTab={(tab) => setCurrentTab(tab)}>
        {renderCurrentView()}
      </Layout>
      {mustChangePassword && <FirstLoginPasswordModal />}
    </>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}
