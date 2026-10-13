// RESTBAR PRO — Tables & Zones Floor Plan Management
import React, { useEffect, useState } from 'react';
import {
  Store,
  Plus,
  Users,
  CheckCircle2,
  Clock,
  Receipt,
  Sparkles,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Trash2,
  Ban,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore, realtimeBus } from '../../services/posService';
import { DiningTable, TableStatus, Zone } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';
import { canManageStaff, hasPermission } from '../../lib/permissions';

interface TablesViewProps {
  onSelectTableForOrder: (table: DiningTable) => void;
  onNavigateToBilling: (orderId?: string) => void;
}

export const TablesView: React.FC<TablesViewProps> = ({
  onSelectTableForOrder,
  onNavigateToBilling,
}) => {
  const { session } = useAuth();
  const { success, error, info } = useNotification();

  const [zones, setZones] = useState<Zone[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('all');
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);

  // New table form
  const [newTableNum, setNewTableNum] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [newZoneId, setNewZoneId] = useState('');

  // Cancel Order Modal (Serveuse / Gérant)
  const [cancellingTable, setCancellingTable] = useState<DiningTable | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const estId = session?.activeEstablishment?.id;

  const loadData = () => {
    if (!estId) return;
    const z = posStore.getZones(estId);
    const t = posStore.getTables(estId, selectedZoneId === 'all' ? undefined : selectedZoneId);
    setZones(z);
    setTables(t);
    if (z.length > 0 && !newZoneId) setNewZoneId(z[0].id);
  };

  useEffect(() => {
    loadData();
    const unsub = realtimeBus.subscribe('TABLE_UPDATED', () => loadData());
    return () => unsub();
  }, [estId, selectedZoneId]);

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estId || !newTableNum) return;
    try {
      const created = posStore.createTable(estId, {
        table_number: newTableNum.trim(),
        capacity: Number(newCapacity) || 4,
        zone_id: newZoneId || undefined,
      });
      success('Table créée', `Table ${created.table_number} ajoutée avec succès.`);
      setIsAddTableOpen(false);
      setNewTableNum('');
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const handleReleaseTable = (table: DiningTable) => {
    if (!session) return;
    try {
      const res = posStore.releaseTable(table.id, session.user.id);
      success('Table libérée', res.message);
      loadData();
    } catch (err: any) {
      error('Opération refusée', err.message);
    }
  };

  const handleCleanTable = (table: DiningTable) => {
    posStore.updateTableStatus(table.id, 'libre');
    success('Table prête', `La table ${table.table_number} est propre et disponible.`);
    loadData();
  };

  const handleCancelOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTable || !cancellingTable.current_order_id || !estId || !session) return;
    try {
      posStore.cancelOrder(
        estId,
        cancellingTable.current_order_id,
        session.user.id,
        cancelReason || 'Annulation demandée par le client'
      );
      success('Commande annulée', `La commande de la table ${cancellingTable.table_number} a été annulée et la table est libérée.`);
      setCancellingTable(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      error('Erreur annulation', err.message);
    }
  };

  const statusStyles: Record<TableStatus, { label: string; badge: string; border: string; bg: string }> = {
    libre: {
      label: 'Libre',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      border: 'hover:border-emerald-500/50 border-slate-800',
      bg: 'bg-slate-900/80',
    },
    occupee: {
      label: 'Occupée (En cours)',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      border: 'border-blue-500/40 hover:border-blue-400',
      bg: 'bg-blue-950/20',
    },
    addition_demandee: {
      label: 'Addition demandée',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse',
      border: 'border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-950/30',
      bg: 'bg-amber-950/20',
    },
    a_nettoyer: {
      label: 'À nettoyer',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      border: 'border-purple-500/30 hover:border-purple-400',
      bg: 'bg-purple-950/20',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Plan de Salle & Tables
            </h1>
            <Badge variant="amber">{tables.length} Tables au total</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Suivi visuel des tables en temps réel : libres, occupées, additions demandées et à nettoyer.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canManageStaff(session) && (
            <button
              onClick={() => setIsAddTableOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Table
            </button>
          )}
        </div>
      </div>

      {/* Zone Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-xs">
        <button
          onClick={() => setSelectedZoneId('all')}
          className={`px-3 py-1.5 rounded-xl transition ${
            selectedZoneId === 'all'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          Toutes les zones ({tables.length})
        </button>
        {zones.map((zone) => {
          const count = tables.filter((t) => t.zone_id === zone.id).length;
          return (
            <button
              key={zone.id}
              onClick={() => setSelectedZoneId(zone.id)}
              className={`px-3 py-1.5 rounded-xl transition ${
                selectedZoneId === zone.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {zone.name}
            </button>
          );
        })}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((table) => {
          const meta = statusStyles[table.status];
          const hasOrder = !!table.current_order;

          return (
            <div
              key={table.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between shadow-xl ${meta.border} ${meta.bg}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xl font-black text-white font-mono tracking-tight">
                      {table.table_number}
                    </h3>
                    <p className="text-[11px] text-slate-400">{table.zone?.name || 'Salle'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Capacité : {table.capacity} couverts</span>
                </div>

                {hasOrder && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1 mb-4">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Ticket en cours :</span>
                      <span className="font-mono font-bold text-amber-400">
                        {table.current_order?.order_number}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Total :</span>
                      <span className="font-mono font-bold text-white">
                        {table.current_order?.total_amount.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-400">
                      <span>Serveur :</span>
                      <span>{table.current_order?.server_name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions based on state */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                {table.status === 'libre' && (
                  <button
                    onClick={() => onSelectTableForOrder(table)}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/30"
                  >
                    <span>Prendre commande</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {table.status === 'occupee' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectTableForOrder(table)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
                    >
                      Ajouter
                    </button>
                    <button
                      onClick={() => {
                        if (table.current_order_id && session) {
                          posStore.requestBill(estId!, table.id, table.current_order_id, session.user.id);
                          success('Addition demandée', `Table ${table.table_number} signalée à la caisse.`);
                          loadData();
                        }
                      }}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      Addition
                    </button>
                  </div>
                )}

                {table.status === 'addition_demandee' && (
                  (hasPermission(session, 'billing.payment') || hasPermission(session, 'payments.create')) ? (
                    <button
                      onClick={() => onNavigateToBilling(table.current_order_id)}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/40"
                    >
                      <Receipt className="w-4 h-4" />
                      Encaisser en Caisse
                    </button>
                  ) : (
                    <div className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Transmis en caisse</span>
                    </div>
                  )
                )}

                {table.status === 'a_nettoyer' && (
                  <button
                    onClick={() => handleCleanTable(table)}
                    className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Nettoyée & Prête
                  </button>
                )}

                {/* Annulation de commande (autorisée pour la serveuse ou le gérant) */}
                {table.current_order_id && (hasPermission(session, 'orders.cancel') || canManageStaff(session)) && (
                  <button
                    onClick={() => {
                      setCancellingTable(table);
                      setCancelReason('');
                    }}
                    className="w-full py-1 text-center text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition flex items-center justify-center gap-1 border border-rose-500/20"
                  >
                    <Ban className="w-3 h-3 text-rose-400" />
                    <span>Annuler la commande</span>
                  </button>
                )}

                {table.status !== 'libre' && canManageStaff(session) && (
                  <button
                    onClick={() => handleReleaseTable(table)}
                    className="w-full text-center text-[10px] text-slate-500 hover:text-rose-400 py-0.5 transition"
                  >
                    Forcer la libération (Gérant)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Nouvelle Table */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setIsAddTableOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Ajouter une Table</h3>
                <p className="text-xs text-slate-400">Numéro unique dans l'établissement</p>
              </div>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Numéro ou Nom de Table *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: T8, VIP 2, Terrasse 3"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Zone d'implantation
                </label>
                <select
                  value={newZoneId}
                  onChange={(e) => setNewZoneId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nombre de couverts (Capacité)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value) || 2)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
                >
                  Créer la Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Annulation de Commande (Serveuse / Gérant) */}
      {cancellingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setCancellingTable(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Annuler la Commande : Table {cancellingTable.table_number}
                </h3>
                <p className="text-xs text-slate-400">
                  Ticket {cancellingTable.current_order?.order_number} • Total : {cancellingTable.current_order?.total_amount.toLocaleString()} FCFA
                </p>
              </div>
            </div>

            <form onSubmit={handleCancelOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Motif d'annulation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Client parti sans consommer, erreur de saisie, commande dupliquée..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[11px] text-rose-300 leading-relaxed">
                <p>
                  <strong>Attention :</strong> L'annulation clôturera le ticket sans encaissement, libérera immédiatement la table et tracera l'opération dans le journal de l'établissement.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancellingTable(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg shadow-rose-950/40"
                >
                  Confirmer l'Annulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
