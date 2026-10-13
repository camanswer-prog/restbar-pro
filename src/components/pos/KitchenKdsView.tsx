// RESTBAR PRO — Kitchen KDS Production Display Screen & Histoire Journalière
import React, { useEffect, useState } from 'react';
import {
  Utensils,
  Clock,
  Play,
  Check,
  Send,
  AlertTriangle,
  X,
  Flame,
  ChefHat,
  Volume2,
  VolumeX,
  History,
  Search,
  Filter,
  User,
  Sparkles,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore, realtimeBus } from '../../services/posService';
import { OrderItem, OrderItemStatus } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';
import { playOrderAlertSound } from '../../lib/soundAlert';

export const KitchenKdsView: React.FC = () => {
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
    const kitchenItems = posStore.getKdsItems(estId, 'cuisine');
    const history = posStore.getDailyHistoryItems(estId, 'cuisine');
    const stats = posStore.getDailyKdsStats(estId, 'cuisine');
    setItems(kitchenItems);
    setDailyHistory(history);
    setDailyStats(stats);
  };

  useEffect(() => {
    loadData();

    // Abonnement Realtime
    const unsubOrder = realtimeBus.subscribe('ORDER_CREATED', (order: any) => {
      loadData();
      const kitchenLines = order?.items?.filter((i: any) => i.destination === 'cuisine') || [];
      if (kitchenLines.length > 0 || !order?.items) {
        if (soundEnabled) {
          playOrderAlertSound('kitchen');
        }
        setLatestAlertOrder(order);
        setTimeout(() => setLatestAlertOrder(null), 8000);
        info(
          '🔔 Nouveau Bon Cuisine Reçu !',
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
        en_preparation: 'Cuisson lancée en cuisine',
        pret: 'Plat dressé et prêt en passe',
        servi: 'Plat envoyé en salle',
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
      info('Plat annulé', `Article ${cancelModalItem.item_name} retiré du bon de commande.`);
      setCancelModalItem(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  // Group by Order Number & Table
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
              <ChefHat className="w-6 h-6 text-emerald-400" />
              Écran de Production Cuisine (KDS)
            </h1>
            <Badge variant="success">{items.length} Plats en cours</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Réception instantanée des plats et grillades lancés par les serveuses en salle avec journal journalier de bord.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playOrderAlertSound('kitchen');
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Activer/désactiver la cloche de cuisine lors de la réception des commandes"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            {soundEnabled ? 'Cloche Active' : 'Cloche Muette'}
          </button>

          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Temps Réel Passe Plat
          </span>
        </div>
      </div>

      {/* Banner Alerte Nouveau Bon Reçu */}
      {latestAlertOrder && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/50 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 animate-bounce">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-300 uppercase tracking-wider">
                Nouveau bon de plats transmis par la serveuse !
              </p>
              <h3 className="text-sm font-bold text-white">
                Ticket {latestAlertOrder.order_number} • Table {latestAlertOrder.table_number} • Serveuse : {latestAlertOrder.server_name || 'Salle'}
              </h3>
            </div>
          </div>
          <button
            onClick={() => setLatestAlertOrder(null)}
            className="text-xs text-emerald-300 hover:text-white px-2 py-1 rounded-lg bg-emerald-900/50"
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
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          Bons en passe
          {items.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-900 text-emerald-200 text-[10px]">
              {items.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Histoire Journalière Cuisine
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
              <ChefHat className="w-12 h-12 text-slate-700 mx-auto" />
              <h3 className="text-sm font-bold text-white">Aucun plat de cuisine en attente</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Toutes les commandes sont dressées et sorties de cuisine. Dès qu'une serveuse validera un panier en salle, le ticket apparaîtra ici avec notification sonore immédiate.
              </p>
              <button
                onClick={() => setActiveTab('history')}
                className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5" /> Voir l'histoire journalière de cuisine
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
                    className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-4 hover:border-emerald-500/60 transition"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-xs font-bold text-white uppercase">{orderTitle}</span>
                          <p className="text-[11px] text-emerald-300 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-emerald-400" />
                            Serveuse : <strong>{firstLine.server_name}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Lancé à {new Date(firstLine.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                            elapsedMinutes > 20
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {elapsedMinutes} min
                        </span>
                      </div>

                      {/* Food Lines */}
                      <div className="space-y-3 pt-3">
                        {orderLines.map((line) => (
                          <div
                            key={line.id}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-xs flex items-center justify-center font-mono">
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
                                {line.status === 'en_preparation' && 'En cuisson'}
                                {line.status === 'pret' && 'Prêt au passe'}
                              </span>
                            </div>

                            {line.notes && (
                              <p className="text-[11px] text-amber-300 bg-amber-950/30 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1">
                                <Flame className="w-3 h-3 text-amber-400" />
                                {line.notes}
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
                                    Cuisson
                                  </button>
                                )}

                                {line.status === 'en_preparation' && (
                                  <button
                                    onClick={() => handleUpdateStatus(line.id, 'pret')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition flex items-center gap-1 shadow"
                                  >
                                    <Check className="w-3 h-3" />
                                    Prêt en passe
                                  </button>
                                )}

                                {line.status === 'pret' && (
                                  <button
                                    onClick={() => handleUpdateStatus(line.id, 'servi')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] transition flex items-center gap-1 shadow"
                                  >
                                    <Send className="w-3 h-3" />
                                    Envoyé en salle
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

      {/* TAB 2: HISTOIRE JOURNALIÈRE DE CUISINE (TIMELINE COMPLÈTE DU JOUR) */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Daily Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                Plats lancés en cuisine
              </span>
              <p className="text-2xl font-extrabold text-white mt-1 font-mono">
                {dailyStats.totalItems}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Au cours du service</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
                Plats envoyés en salle
              </span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                {dailyStats.servedItems}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Servis chauds aux clients</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                En cours / En cuisson
              </span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
                {dailyStats.inProgressItems}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Sur les feux & passe</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">
                Temps moyen cuisson
              </span>
              <p className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">
                {dailyStats.avgPrepMinutes > 0 ? `${dailyStats.avgPrepMinutes} min` : '< 1 min'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Performance brigade</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par plat, serveuse, table, ticket, note de cuisson..."
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="servi">Servis en salle</option>
                <option value="pret">Prêts en passe</option>
                <option value="en_preparation">En cuisson</option>
                <option value="envoye">En attente</option>
                <option value="annule">Annulés</option>
              </select>
            </div>
          </div>

          {/* Timeline de la journée Cuisine */}
          {filteredHistory.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800">
              <History className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-white">Aucun historique de cuisine trouvé</h3>
              <p className="text-xs text-slate-500">
                Aucun plat ne correspond aux critères de filtre sélectionnés.
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
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs font-bold flex flex-col items-center">
                        <Clock className="w-3.5 h-3.5 mb-1" />
                        <span>{orderTime}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">
                            {item.quantity}x {item.item_name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-300 font-mono font-semibold">
                            Table {item.table_number || 'N/A'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {item.order_number}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1 text-slate-300">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            Lancé par : <strong className="text-white">{item.server_name || 'Serveuse'}</strong>
                          </span>
                          {servedTime && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Servi à {servedTime}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-400" />
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
                        {item.status === 'servi' && '✓ Envoyé en salle'}
                        {item.status === 'pret' && 'Prêt en passe'}
                        {item.status === 'en_preparation' && 'En cuisson'}
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
                  <option value="Rupture d'ingrédient en cuisine">Rupture d'ingrédient en cuisine</option>
                  <option value="Plat brûlé ou impropre">Plat brûlé ou impropre</option>
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
