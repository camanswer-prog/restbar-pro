// RESTBAR PRO — Bar KDS Production Display Screen & Histoire Journalière
import React, { useEffect, useState } from 'react';
import {
  Wine,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Send,
  Volume2,
  VolumeX,
  X,
  Store,
  History,
  Search,
  Filter,
  User,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore, realtimeBus } from '../../services/posService';
import { OrderItem, OrderItemStatus } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';
import { playOrderAlertSound } from '../../lib/soundAlert';

export const BarKdsView: React.FC = () => {
  const { session } = useAuth();
  const { success, error, info } = useNotification();

  const estId = session?.activeEstablishment?.id;

  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [items, setItems] = useState<any[]>([]);
  const [dailyHistory, setDailyHistory] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState({
    totalItems: 0,
    servedItems: 0,
    inProgressItems: 0,
    cancelledItems: 0,
    avgPrepMinutes: 0,
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchHistory, setSearchHistory] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancelModalItem, setCancelModalItem] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [latestAlertOrder, setLatestAlertOrder] = useState<any | null>(null);

  const loadData = () => {
    if (!estId) return;
    const barItems = posStore.getKdsItems(estId, 'bar');
    const history = posStore.getDailyHistoryItems(estId, 'bar');
    const stats = posStore.getDailyKdsStats(estId, 'bar');
    setItems(barItems);
    setDailyHistory(history);
    setDailyStats(stats);
  };

  useEffect(() => {
    loadData();

    // Abonnement en direct
    const unsubOrder = realtimeBus.subscribe('ORDER_CREATED', (order: any) => {
      loadData();
      const barLines = order?.items?.filter((i: any) => i.destination === 'bar') || [];
      if (barLines.length > 0 || !order?.items) {
        if (soundEnabled) {
          playOrderAlertSound('bar');
        }
        setLatestAlertOrder(order);
        setTimeout(() => setLatestAlertOrder(null), 8000);
        info(
          '🔔 Nouveau Bon Bar Reçu !',
          `Table ${order?.table_number || 'N/A'} — Serveuse : ${order?.server_name || 'Salle'}`
        );
      }
    });

    const unsubStatus = realtimeBus.subscribe('ITEM_STATUS_CHANGED', () => {
      loadData();
    });

    return () => {
      unsubOrder();
      unsubStatus();
    };
  }, [estId, soundEnabled]);

  const handleUpdateStatus = (itemId: string, newStatus: OrderItemStatus) => {
    try {
      posStore.updateOrderItemStatus(itemId, newStatus);
      const labels: Record<OrderItemStatus, string> = {
        en_preparation: 'Préparation cocktail lancée',
        pret: 'Boisson marquée comme prête au bar',
        servi: 'Boisson servie',
        envoye: '',
        annule: '',
      };
      success('Statut mis à jour', labels[newStatus]);
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalItem || !cancelReason || !session) return;
    try {
      posStore.cancelOrderItem(cancelModalItem.id, cancelReason, session.user.id);
      info('Boisson annulée', `Article ${cancelModalItem.item_name} retiré du bon de commande.`);
      setCancelModalItem(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  // Group by Order Number for Live View
  const ordersMap: Record<string, any[]> = {};
  items.forEach((item) => {
    const key = `${item.order_number} - Table ${item.table_number}`;
    if (!ordersMap[key]) ordersMap[key] = [];
    ordersMap[key].push(item);
  });

  // Filtered Daily History
  const filteredHistory = dailyHistory.filter((item) => {
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const query = searchHistory.toLowerCase().trim();
    const matchQuery =
      !query ||
      (item.item_name && item.item_name.toLowerCase().includes(query)) ||
      (item.order_number && item.order_number.toLowerCase().includes(query)) ||
      (item.table_number && item.table_number.toLowerCase().includes(query)) ||
      (item.server_name && item.server_name.toLowerCase().includes(query)) ||
      (item.notes && item.notes.toLowerCase().includes(query));
    return matchStatus && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Wine className="w-6 h-6 text-purple-400" />
              Écran de Production du Bar
            </h1>
            <Badge variant="purple">{items.length} Boissons en cours</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Réception en temps réel des cocktails et boissons lancés par les serveuses en salle avec journal journalier de bord.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playOrderAlertSound('bar');
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              soundEnabled
                ? 'bg-purple-950/60 border-purple-500/40 text-purple-300 hover:bg-purple-900/60'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Activer/désactiver l'alerte sonore lors de la réception des commandes"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Sonnette Active' : 'Sonnette Muette'}
          </button>

          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Temps Réel Actif
          </span>
        </div>
      </div>

      {/* Banner Alerte Nouvelle Commande Reçue */}
      {latestAlertOrder && (
        <div className="p-4 rounded-2xl bg-purple-950/90 border-2 border-purple-500/80 shadow-2xl shadow-purple-950/50 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 animate-bounce">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
                Nouveau bon transmis par la serveuse !
              </p>
              <h3 className="text-sm font-bold text-white">
                Ticket {latestAlertOrder.order_number} • Table {latestAlertOrder.table_number} • Serveuse : {latestAlertOrder.server_name || 'Salle'}
              </h3>
            </div>
          </div>
          <button
            onClick={() => setLatestAlertOrder(null)}
            className="text-xs text-purple-300 hover:text-white px-2 py-1 rounded-lg bg-purple-900/50"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Navigation Tabs : Bons en direct vs Histoire journalière */}
      <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'live'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Bons en direct
          {items.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-purple-900 text-purple-200 text-[10px]">
              {items.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'history'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Histoire Journalière du Bar
          <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
            {dailyHistory.length}
          </span>
        </button>
      </div>

      {/* TAB 1: BONS EN DIRECT */}
      {activeTab === 'live' && (
        <>
          {Object.keys(ordersMap).length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <Wine className="w-12 h-12 text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-white">Aucune commande de bar en attente</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Toutes les boissons ont été préparées et servies aux tables. Dès qu'une serveuse lancera une commande en salle, le bon apparaîtra instantanément ici avec son alerte sonore.
              </p>
              <button
                onClick={() => setActiveTab('history')}
                className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" /> Voir l'histoire journalière du bar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(ordersMap).map(([orderTitle, orderLines]) => {
                const firstLine = orderLines[0];
                const elapsedMinutes = Math.floor(
                  (Date.now() - new Date(firstLine.created_at).getTime()) / 60000
                );

                return (
                  <div
                    key={orderTitle}
                    className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-4 hover:border-purple-500/60 transition"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-xs font-bold text-white uppercase">{orderTitle}</span>
                          <p className="text-[11px] text-purple-300 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-purple-400" />
                            Serveuse : <strong>{firstLine.server_name}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Lancé à {new Date(firstLine.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                            elapsedMinutes > 15
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                              : 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {elapsedMinutes} min
                        </span>
                      </div>

                      {/* Drink Lines */}
                      <div className="space-y-3 pt-3">
                        {orderLines.map((line) => (
                          <div
                            key={line.id}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black text-xs flex items-center justify-center font-mono">
                                  {line.quantity}
                                </span>
                                <span className="font-bold text-white text-xs">{line.item_name}</span>
                              </div>

                              {/* Status Pill */}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  line.status === 'envoye'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : line.status === 'en_preparation'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {line.status === 'envoye' && 'En attente'}
                                {line.status === 'en_preparation' && 'En mixologie'}
                                {line.status === 'pret' && 'Prêt au bar'}
                              </span>
                            </div>

                            {line.notes && (
                              <p className="text-[11px] text-amber-300 bg-amber-950/30 px-2 py-1 rounded border border-amber-500/20">
                                ★ {line.notes}
                              </p>
                            )}

                            {/* Workflow Buttons */}
                            <div className="flex items-center justify-between pt-1 gap-1.5">
                              <button
                                onClick={() => setCancelModalItem(line)}
                                className="text-[10px] text-slate-500 hover:text-rose-400 p-1"
                              >
                                Annuler
                              </button>

                              <div className="flex items-center gap-1.5">
                                {line.status === 'envoye' && (
                                  <button
                                    onClick={() => handleUpdateStatus(line.id, 'en_preparation')}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition flex items-center gap-1 shadow"
                                  >
                                    <Play className="w-3 h-3" />
                                    Préparer
                                  </button>
                                )}

                                {line.status === 'en_preparation' && (
                                  <button
                                    onClick={() => handleUpdateStatus(line.id, 'pret')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition flex items-center gap-1 shadow"
                                  >
                                    <Check className="w-3 h-3" />
                                    Marquer Prêt
                                  </button>
                                )}

                                {line.status === 'pret' && (
                                  <button
                                    onClick={() => handleUpdateStatus(line.id, 'servi')}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition flex items-center gap-1 shadow"
                                  >
                                    <Send className="w-3 h-3" />
                                    Servi à table
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: HISTOIRE JOURNALIÈRE DU BAR (TIMELINE COMPLÈTE DU JOUR) */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Daily Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Boissons commandées
              </span>
              <p className="text-2xl font-extrabold text-white mt-1 font-mono">
                {dailyStats.totalItems}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Au cours du service</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                Boissons servies
              </span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {dailyStats.servedItems}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Livrés aux tables</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-purple-400 font-semibold">
                En cours / En attente
              </span>
              <p className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">
                {dailyStats.inProgressItems}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">File active au bar</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                Temps moyen service
              </span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                {dailyStats.avgPrepMinutes > 0 ? `${dailyStats.avgPrepMinutes} min` : '< 1 min'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Prise en charge barman</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par boisson, serveuse, table, ticket..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="servi">Servis</option>
                <option value="pret">Prêts au bar</option>
                <option value="en_preparation">En mixologie</option>
                <option value="envoye">En attente</option>
                <option value="annule">Annulés</option>
              </select>
            </div>
          </div>

          {/* Timeline de la journée */}
          {filteredHistory.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800">
              <History className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">Aucun historique trouvé</h3>
              <p className="text-xs text-slate-500">
                Aucune boisson ne correspond aux critères de filtre sélectionnés.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item) => {
                const orderTime = item.created_at
                  ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const servedTime = item.served_at
                  ? new Date(item.served_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : null;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs font-bold flex flex-col items-center">
                        <Clock className="w-3.5 h-3.5 mb-1" />
                        <span>{orderTime}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">
                            {item.quantity}x {item.item_name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-purple-300 font-mono font-semibold">
                            Table {item.table_number || 'N/A'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {item.order_number}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3.5 h-3.5 text-purple-400" />
                            Lancé par : <strong className="text-white">{item.server_name || 'Serveuse'}</strong>
                          </span>
                          {servedTime && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Servi à {servedTime}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded text-[11px]">
                              Note : {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-bold ${
                          item.status === 'servi'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : item.status === 'pret'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : item.status === 'en_preparation'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : item.status === 'annule'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.status === 'servi' && '✓ Servi'}
                        {item.status === 'pret' && 'Prêt au bar'}
                        {item.status === 'en_preparation' && 'En mixologie'}
                        {item.status === 'envoye' && 'En attente'}
                        {item.status === 'annule' && 'Annulé'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Annulation avec Motif Obligatoire */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setCancelModalItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Annuler : {cancelModalItem.item_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Cette action modifie le total du ticket et sera inscrite dans le journal d'audit.
                </p>
              </div>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Motif d'annulation obligatoire *
                </label>
                <select
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none mb-2"
                >
                  <option value="">Sélectionnez un motif...</option>
                  <option value="Client a changé d'avis">Client a changé d'avis</option>
                  <option value="Erreur de saisie de commande">Erreur de saisie de commande</option>
                  <option value="Rupture d'ingrédient au bar">Rupture d'ingrédient au bar</option>
                  <option value="Verre cassé ou renversé">Verre cassé ou renversé</option>
                </select>
                <input
                  type="text"
                  placeholder="Ou précisez un autre motif..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancelModalItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg shadow-rose-950/40"
                >
                  Confirmer l'annulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
