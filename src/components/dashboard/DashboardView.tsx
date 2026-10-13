// RESTBAR PRO — Dashboard Overview (Phase 1 & Phase 2 Enriched)
import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Store,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ChefHat,
  Wine,
  CreditCard,
  Crown,
  Database,
  Lock,
  Boxes,
  Send,
  Activity,
  Utensils,
  History,
  User,
  Bell,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { posStore, realtimeBus } from '../../services/posService';
import { Badge } from '../common/Badge';
import { NavTab } from '../layout/Sidebar';
import { ROLE_LABELS } from '../../lib/permissions';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { session } = useAuth();
  const estId = session?.activeEstablishment?.id;

  const [memberCount, setMemberCount] = useState(0);
  const [licenseValidation, setLicenseValidation] = useState<{ valid: boolean; daysRemaining?: number } | null>(null);

  // POS Phase 2 live metrics
  const [tablesCount, setTablesCount] = useState({ total: 0, occupied: 0, pendingBill: 0 });
  const [kdsCounts, setKdsCounts] = useState({ bar: 0, kitchen: 0 });
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [dailyOrders, setDailyOrders] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'bar' | 'cuisine'>('all');

  const loadData = () => {
    if (!estId || !session) return;

    apiService.getMembers(session, estId).then((m) => {
      setMemberCount(m.filter((x) => x.is_active).length);
    });

    if (session.activeLicense) {
      apiService.validateLicenseKey(session.activeLicense).then((res) => {
        setLicenseValidation(res);
      });
    }

    const tables = posStore.getTables(estId);
    setTablesCount({
      total: tables.length,
      occupied: tables.filter((t) => t.status === 'occupee').length,
      pendingBill: tables.filter((t) => t.status === 'addition_demandee').length,
    });

    setKdsCounts({
      bar: posStore.getKdsItems(estId, 'bar').length,
      kitchen: posStore.getKdsItems(estId, 'cuisine').length,
    });

    setSalesSummary(posStore.getSalesReport(estId));
    setDailyOrders(posStore.getDailyOrderHistory(estId));
  };

  useEffect(() => {
    loadData();

    const unsubTable = realtimeBus.subscribe('TABLE_UPDATED', () => loadData());
    const unsubOrder = realtimeBus.subscribe('ORDER_CREATED', () => loadData());
    const unsubStatus = realtimeBus.subscribe('ITEM_STATUS_CHANGED', () => loadData());
    const unsubPay = realtimeBus.subscribe('PAYMENT_RECEIVED', () => loadData());

    return () => {
      unsubTable();
      unsubOrder();
      unsubStatus();
      unsubPay();
    };
  }, [estId]);

  if (!session) return null;

  const currentRole = session.roles[0]?.code;
  const roleMeta = currentRole ? ROLE_LABELS[currentRole] : null;

  return (
    <div className="space-y-6">
      {/* Top Banner: Establishment & Role Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="amber" size="sm">
                RESTBAR PRO • Phase 2 Actif
              </Badge>
              {session.isSuperAdmin && (
                <Badge variant="purple" size="sm">
                  <Crown className="w-3 h-3 text-purple-400 inline mr-1" />
                  Super Administrateur
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {session.activeEstablishment?.name || 'Tableau de bord'}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Connecté en tant que <strong className="text-white">{session.user.full_name}</strong>{' '}
              {roleMeta && (
                <span>
                  avec le rôle <span className="text-amber-400 font-semibold">{roleMeta.label}</span>
                </span>
              )}
              . Prise de commandes, écrans KDS Bar & Cuisine et encaissements Wave/OM opérationnels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('tables')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-amber-950/40"
            >
              <Store className="w-4 h-4" />
              Plan de Salle ({tablesCount.occupied} occupées)
            </button>
            <button
              onClick={() => onNavigate('tests')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-2 border border-slate-700"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Banc de Tests
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Chiffre d'Affaires du Jour */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ventes Encaissées
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
              {salesSummary ? salesSummary.totalRevenue.toLocaleString() : '0'} FCFA
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Cash net : {salesSummary ? salesSummary.netCashInTill.toLocaleString() : '0'} F
          </p>
        </div>

        {/* KPI 2: Tables en Service */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Occupation Salle
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {tablesCount.occupied} / {tablesCount.total}
            </span>
            <span className="text-xs text-slate-400">tables actives</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            {tablesCount.pendingBill > 0 ? (
              <span className="text-amber-400 font-bold animate-pulse">
                ★ {tablesCount.pendingBill} addition(s) demandée(s)
              </span>
            ) : (
              <span>Toutes les tables sont à jour</span>
            )}
          </p>
        </div>

        {/* KPI 3: Bons en Production (Bar & Cuisine) */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              En Production (KDS)
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div>
              <span className="text-xs text-purple-400 font-bold block">Bar</span>
              <span className="text-xl font-bold font-mono text-white">{kdsCounts.bar}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-xs text-emerald-400 font-bold block">Cuisine</span>
              <span className="text-xl font-bold font-mono text-white">{kdsCounts.kitchen}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Temps réel synchronisé
          </p>
        </div>

        {/* KPI 4: Statut Licence PRO */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Licence PRO Active
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white uppercase font-mono">
              {session.activeLicense?.plan_type || 'PRO'}
            </span>
            <Badge variant="success" size="sm">
              Valide
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {memberCount} / {session.activeLicense?.max_users || 15} utilisateurs max
          </p>
        </div>
      </div>

      {/* Role-Specific Workstation Cards */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Accès Direct aux Postes Métier</h2>
            <p className="text-xs text-slate-400">
              Chaque module est configuré selon le rôle attribué par le gérant de l’établissement.
            </p>
          </div>
          <Badge variant="default">Postes Opérationnels</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Workstation 1: Salle */}
          <button
            onClick={() => onNavigate('tables')}
            className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-blue-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Store className="w-5 h-5" />
              </div>
              <Badge variant="info" size="sm">Serveuse / Salle</Badge>
            </div>
            <h3 className="font-bold text-white text-sm">Plan de Salle & Tables</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Visualiser les tables libres, occupées et demander l'addition.
            </p>
          </button>

          {/* Workstation 2: KDS Cuisine */}
          <button
            onClick={() => onNavigate('kds_kitchen')}
            className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <ChefHat className="w-5 h-5" />
              </div>
              <Badge variant="success" size="sm">{kdsCounts.kitchen} en attente</Badge>
            </div>
            <h3 className="font-bold text-white text-sm">Écran Cuisine (KDS)</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Bons plats chronologiques, temps écoulé et validation des cuissons.
            </p>
          </button>

          {/* Workstation 3: KDS Bar */}
          <button
            onClick={() => onNavigate('kds_bar')}
            className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <Wine className="w-5 h-5" />
              </div>
              <Badge variant="purple" size="sm">{kdsCounts.bar} en attente</Badge>
            </div>
            <h3 className="font-bold text-white text-sm">Écran Bar</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Bons boissons exclusifs, cocktails et préparation comptoir.
            </p>
          </button>

          {/* Workstation 4: Caisse */}
          <button
            onClick={() => onNavigate('cashier')}
            className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 text-left transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <Badge variant="amber" size="sm">Wave • OM • Cash</Badge>
            </div>
            <h3 className="font-bold text-white text-sm">Caisse & Règlements</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Encaissements multi-moyens, tickets thermiques et solde.
            </p>
          </button>
        </div>
      </div>

      {/* Histoire Journalière & Suivi en Direct des Commandes (Bar & Cuisine) */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Histoire Journalière & Suivi en Direct des Commandes
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dès que la serveuse valide un bon en salle, le Barman et la Cuisine le reçoivent instantanément avec la chronologie complète du service.
            </p>
          </div>

          {/* Destination filter buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                historyFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toutes ({dailyOrders.length})
            </button>
            <button
              onClick={() => setHistoryFilter('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                historyFilter === 'bar'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wine className="w-3.5 h-3.5" />
              Barman
            </button>
            <button
              onClick={() => setHistoryFilter('cuisine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                historyFilter === 'cuisine'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Cuisine
            </button>
          </div>
        </div>

        {/* Orders Timeline Feed */}
        {dailyOrders.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <Bell className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-xs font-bold text-white">Aucune commande passée aujourd'hui</p>
            <p className="text-[11px] text-slate-500">
              Lancez une commande depuis la prise de commande en salle pour tester la transmission en direct vers le Bar et la Cuisine.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {dailyOrders
              .filter((order) => {
                if (historyFilter === 'bar') {
                  return order.allItems?.some((i: any) => i.destination === 'bar');
                }
                if (historyFilter === 'cuisine') {
                  return order.allItems?.some((i: any) => i.destination === 'cuisine');
                }
                return true;
              })
              .map((order) => {
                const timeStr = order.created_at
                  ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const barLines = order.allItems?.filter((i: any) => i.destination === 'bar') || [];
                const kitchenLines = order.allItems?.filter((i: any) => i.destination === 'cuisine') || [];

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      {/* Ticket header line */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold">
                          {order.order_number}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-bold">
                          Table {order.table_number}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {timeStr}
                        </span>
                        <span className="text-xs text-slate-300 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          Lancé par : <strong className="text-white">{order.server_name}</strong>
                        </span>
                      </div>

                      {/* Item Breakdown: Bar vs Cuisine */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {/* Bar Segment */}
                        {barLines.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-purple-300 font-bold text-[11px]">
                              <span className="flex items-center gap-1">
                                <Wine className="w-3.5 h-3.5 text-purple-400" />
                                Barman ({barLines.length})
                              </span>
                              <button
                                onClick={() => onNavigate('kds_bar')}
                                className="text-[10px] text-purple-400 hover:text-purple-200 underline"
                              >
                                Ouvrir KDS Bar
                              </button>
                            </div>
                            <div className="space-y-1">
                              {barLines.map((line: any) => (
                                <div key={line.id} className="flex items-center justify-between text-[11px]">
                                  <span className="text-white">
                                    {line.quantity}x {line.item_name}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      line.status === 'servi'
                                        ? 'text-emerald-400 bg-emerald-950/50'
                                        : line.status === 'pret'
                                        ? 'text-cyan-400 bg-cyan-950/50'
                                        : line.status === 'en_preparation'
                                        ? 'text-blue-400 bg-blue-950/50'
                                        : 'text-amber-400 bg-amber-950/50'
                                    }`}
                                  >
                                    {line.status === 'servi' ? 'Servi' : line.status === 'pret' ? 'Prêt' : line.status === 'en_preparation' ? 'En cours' : 'En attente'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cuisine Segment */}
                        {kitchenLines.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-emerald-300 font-bold text-[11px]">
                              <span className="flex items-center gap-1">
                                <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
                                Cuisine ({kitchenLines.length})
                              </span>
                              <button
                                onClick={() => onNavigate('kds_kitchen')}
                                className="text-[10px] text-emerald-400 hover:text-emerald-200 underline"
                              >
                                Ouvrir KDS Cuisine
                              </button>
                            </div>
                            <div className="space-y-1">
                              {kitchenLines.map((line: any) => (
                                <div key={line.id} className="flex items-center justify-between text-[11px]">
                                  <span className="text-white">
                                    {line.quantity}x {line.item_name}
                                  </span>
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                      line.status === 'servi'
                                        ? 'text-emerald-400 bg-emerald-950/50'
                                        : line.status === 'pret'
                                        ? 'text-cyan-400 bg-cyan-950/50'
                                        : line.status === 'en_preparation'
                                        ? 'text-blue-400 bg-blue-950/50'
                                        : 'text-amber-400 bg-amber-950/50'
                                    }`}
                                  >
                                    {line.status === 'servi' ? 'Servi' : line.status === 'pret' ? 'Prêt passe' : line.status === 'en_preparation' ? 'En cuisson' : 'En attente'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex md:flex-col items-center md:items-end justify-between md:justify-start gap-1">
                      <span className="text-xs font-bold text-white font-mono">
                        {order.total_amount?.toLocaleString()} FCFA
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          order.status === 'payee'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : order.status === 'addition_demandee'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {order.status === 'payee' ? 'Soldée' : order.status === 'addition_demandee' ? 'Addition demandée' : 'En cours'}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Security & RLS Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Contrôles d'Intégrité Phase 2</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            RESTBAR PRO garantit l'intégrité de la caisse et des tables : une table ne peut être libérée que
            si l'ensemble des tickets associés est soldé. Les doubles encaissements concurrents sont
            rejetés au niveau serveur par transaction atomique.
          </p>

          <div className="space-y-2 pt-2">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex items-center justify-between">
              <span className="text-slate-300">Routage automatique Bar / Cuisine</span>
              <span className="text-emerald-400 font-semibold font-mono">100% ISOLÉ</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex items-center justify-between">
              <span className="text-slate-300">Validation Références Wave / Orange Money</span>
              <span className="text-emerald-400 font-semibold font-mono">ACTIF</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs flex items-center justify-between">
              <span className="text-slate-300">Libération de Table Conditionnelle (Solde = 0)</span>
              <span className="text-emerald-400 font-semibold font-mono">VERROUILLÉ</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Gestion Complète des Stocks & Ventes</h3>
            <span className="text-xs text-slate-400">Phase 2 Avancée</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('stocks')}
              className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-left transition group"
            >
              <div className="flex items-center justify-between">
                <Boxes className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="font-semibold text-white text-xs mt-2">Stocks & Ingrédients</p>
              <p className="text-[11px] text-slate-400">Entrées, pertes & alertes</p>
            </button>

            <button
              onClick={() => onNavigate('menu')}
              className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-left transition group"
            >
              <div className="flex items-center justify-between">
                <Utensils className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="font-semibold text-white text-xs mt-2">Carte & Tarifs</p>
              <p className="text-[11px] text-slate-400">Prix FCFA & fiches</p>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-left transition group"
            >
              <div className="flex items-center justify-between">
                <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="font-semibold text-white text-xs mt-2">Rapport de Ventes</p>
              <p className="text-[11px] text-slate-400">Rapport Z & statistiques</p>
            </button>

            <button
              onClick={() => onNavigate('tests')}
              className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-left transition group"
            >
              <div className="flex items-center justify-between">
                <Activity className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
              </div>
              <p className="font-semibold text-white text-xs mt-2">Banc de Tests</p>
              <p className="text-[11px] text-slate-400">Validation 7 scénarios</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
