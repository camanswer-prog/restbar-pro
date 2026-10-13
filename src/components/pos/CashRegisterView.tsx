// RESTBAR PRO — Caisse, Règlements & Facturation
// Logique stricte pour le rôle Caissier : Consultation & Impression des tickets uniquement (payés ou non payés)
import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Printer,
  Sparkles,
  Calculator,
  ShieldCheck,
  RotateCcw,
  Clock,
  ArrowRight,
  Split,
  Search,
  Eye,
  FileText,
  Filter,
  Check,
  Calendar,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore, realtimeBus } from '../../services/posService';
import { Order, Payment, PaymentMethod, PaymentStatus } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';
import { ThermalTicketModal } from './ThermalTicketModal';

interface CashRegisterViewProps {
  initialOrderId?: string;
}

type TicketFilterTab = 'all' | 'unpaid' | 'paid';

export const CashRegisterView: React.FC<CashRegisterViewProps> = ({ initialOrderId }) => {
  const { session } = useAuth();
  const { success, error, info } = useNotification();

  const estId = session?.activeEstablishment?.id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<TicketFilterTab>('all');

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('especes');
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [receivedCash, setReceivedCash] = useState<number>(0);
  const [referenceCode, setReferenceCode] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Thermal Ticket Modal
  const [ticketModalOrder, setTicketModalOrder] = useState<Order | null>(null);

  const loadData = () => {
    if (!estId) return;
    const allOrders = posStore.getOrders(estId);
    setOrders(allOrders);

    if (selectedOrder) {
      const refreshed = posStore.getOrderById(selectedOrder.id);
      setSelectedOrder(refreshed || null);
    } else if (initialOrderId) {
      const init = posStore.getOrderById(initialOrderId);
      if (init) {
        setSelectedOrder(init);
        setAmountToPay(init.balance_due);
        setReceivedCash(init.balance_due);
      }
    } else if (allOrders.length > 0) {
      const pending = allOrders.find((o) => o.status === 'addition_demandee') || allOrders[0];
      setSelectedOrder(pending);
      setAmountToPay(pending.balance_due);
      setReceivedCash(pending.balance_due);
    }
  };

  useEffect(() => {
    loadData();

    const unsubBill = realtimeBus.subscribe('BILL_REQUESTED', (payload) => {
      loadData();
      info('Demande d’Addition reçue !', `Table ${payload.table?.table_number} attend sa note.`);
    });

    const unsubPay = realtimeBus.subscribe('PAYMENT_RECEIVED', () => {
      loadData();
    });

    return () => {
      unsubBill();
      unsubPay();
    };
  }, [estId]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setAmountToPay(order.balance_due);
    setReceivedCash(order.balance_due);
    setReferenceCode('');
    setPaymentNotes('');
  };

  const handleQuickCash = (addition: number) => {
    setReceivedCash((prev) => prev + addition);
  };

  const changeDue = Math.max(0, receivedCash - amountToPay);

  const handleProcessPayment = () => {
    if (!selectedOrder || !estId || !session) return;
    if (amountToPay <= 0) {
      error('Montant invalide', 'Le montant du règlement doit être supérieur à zéro.');
      return;
    }
    if (amountToPay > selectedOrder.balance_due) {
      error(
        'Montant supérieur au solde',
        `Le solde restant n'est que de ${selectedOrder.balance_due.toLocaleString()} FCFA.`
      );
      return;
    }

    // Validation référence pour Wave & OM
    if ((paymentMethod === 'wave' || paymentMethod === 'orange_money') && !referenceCode) {
      info(
        'Règlement Déclaré',
        `Sans référence de transaction, le paiement ${paymentMethod.toUpperCase()} restera marqué "déclaré" et nécessitera un rapprochement.`
      );
    }

    setIsProcessing(true);
    try {
      const { payment, order: updatedOrder, isFullyPaid } = posStore.processPayment(
        estId,
        selectedOrder.id,
        session.user.id,
        paymentMethod,
        amountToPay,
        referenceCode || undefined,
        paymentNotes || undefined
      );

      if (isFullyPaid) {
        success(
          'Facture Intégralement Payée !',
          `Ticket ${updatedOrder.order_number} soldé avec succès. Table ${updatedOrder.table_number} prête à être libérée.`
        );
        // Ouvrir automatiquement le ticket thermique payé
        setTicketModalOrder(updatedOrder);
      } else {
        success(
          'Paiement Partiel Enregistré',
          `${amountToPay.toLocaleString()} FCFA reçus. Reste dû : ${updatedOrder.balance_due.toLocaleString()} FCFA.`
        );
      }

      loadData();
    } catch (err: any) {
      error('Échec de validation', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrage strict des tickets
  const filteredOrders = orders.filter((o) => {
    // Filtre d'onglet
    if (filterTab === 'unpaid' && o.status === 'payee') return false;
    if (filterTab === 'paid' && o.status !== 'payee') return false;

    // Filtre de recherche
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchOrderNumber = o.order_number.toLowerCase().includes(q);
    const matchTable = (o.table_number || '').toString().toLowerCase().includes(q);
    const matchServer = (o.server_name || '').toLowerCase().includes(q);
    return matchOrderNumber || matchTable || matchServer;
  });

  const unpaidCount = orders.filter((o) => o.status !== 'payee').length;
  const paidCount = orders.filter((o) => o.status === 'payee').length;
  const activeBillsRequested = orders.filter((o) => o.status === 'addition_demandee');

  // Paiements enregistrés sur la commande sélectionnée
  const orderPayments = selectedOrder
    ? posStore.getPayments(estId || '').filter((p) => p.order_id === selectedOrder.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-amber-400" />
              Caisse, Règlements & Facturation
            </h1>
            <Badge variant="amber">Poste Caissier Certifié</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Consultation et impression sécurisée des tickets (payés et non payés) & encaissement multi-moyens (FCFA, Wave, Orange Money).
          </p>
        </div>

        {/* Protection RLS Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-cyan-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>RLS Actif : Périmètre Caisse & Tickets uniquement</span>
        </div>
      </div>

      {/* RLS Policy Notice Banner */}
      <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-start gap-3 text-xs">
        <Receipt className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-slate-300 leading-relaxed">
          <span className="font-bold text-white">Logique stricte du poste Caissier : </span>
          Vous avez accès à la <strong className="text-cyan-300">consultation intégrale</strong> de chaque ticket de table et à l'
          <strong className="text-cyan-300">impression thermique (80mm)</strong> des tickets non payés (notes proforma) ou payés (reçus acquittés).
          Les modules de dépenses générales et les rapports financiers globaux sont strictement cloisonnés par les politiques RLS PostgreSQL.
        </div>
      </div>

      {/* Main Two-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets list (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              Tickets de Caisse ({filteredOrders.length})
            </span>
            {activeBillsRequested.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                {activeBillsRequested.length} en attente
              </span>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par commande, table, serveur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
            <button
              onClick={() => setFilterTab('all')}
              className={`py-1.5 rounded-lg transition text-center ${
                filterTab === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous ({orders.length})
            </button>
            <button
              onClick={() => setFilterTab('unpaid')}
              className={`py-1.5 rounded-lg transition text-center ${
                filterTab === 'unpaid'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Non Payés ({unpaidCount})
            </button>
            <button
              onClick={() => setFilterTab('paid')}
              className={`py-1.5 rounded-lg transition text-center ${
                filterTab === 'paid'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Payés ({paidCount})
            </button>
          </div>

          {/* Orders Cards List */}
          <div className="overflow-y-auto max-h-[540px] space-y-2 pr-1">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucun ticket ne correspond aux critères de recherche.
              </div>
            ) : (
              filteredOrders.map((o) => {
                const isSelected = selectedOrder?.id === o.id;
                const isPendingBill = o.status === 'addition_demandee';
                const isPaid = o.status === 'payee';

                return (
                  <div
                    key={o.id}
                    className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-lg shadow-amber-950/40'
                        : isPendingBill
                        ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      onClick={() => handleSelectOrder(o)}
                      className="cursor-pointer flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm font-mono">{o.order_number}</span>
                          <span className="text-xs font-bold text-amber-400">Table {o.table_number}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Serveur : {o.server_name} • {(o.items || []).length} article(s)
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            : isPendingBill
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse'
                            : 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {isPaid ? 'PAYÉ' : isPendingBill ? 'ADDITION !' : 'EN COURS'}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400">Total : {o.total_amount.toLocaleString()} F • </span>
                        <span
                          className={`font-mono font-bold ${
                            o.balance_due === 0 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {o.balance_due === 0 ? 'Soldé' : `Dû : ${o.balance_due.toLocaleString()} F`}
                        </span>
                      </div>

                      {/* Quick Print and Consult Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSelectOrder(o)}
                          title="Consulter les détails du ticket"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {isPaid ? (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setTicketModalOrder(o);
                            }}
                            title="Imprimer le Reçu Payé"
                            className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Payé</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setTicketModalOrder(o);
                            }}
                            title="Imprimer la Note Proforma (Non Payé)"
                            className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Proforma</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Order Details, Printing & Settlement Workstation (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-6">
          {selectedOrder ? (
            <>
              {/* Order Header & Prominent Printing Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white font-mono">
                      {selectedOrder.order_number}
                    </h2>
                    <Badge variant="amber">Table {selectedOrder.table_number}</Badge>
                    {selectedOrder.status === 'payee' ? (
                      <Badge variant="success">PAYÉ (SOLDÉ)</Badge>
                    ) : (
                      <Badge variant="info">EN ATTENTE DE RÈGLEMENT</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Serveur : {selectedOrder.server_name} • Créé le{' '}
                    {new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')} à{' '}
                    {new Date(selectedOrder.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* LES DEUX BOUTONS D'IMPRESSION STRICTS DU CAISSIER */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTicketModalOrder(selectedOrder)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition flex items-center gap-1.5 border border-amber-500/30 shadow-sm"
                    title="Imprimer le ticket pour présentation au client avant règlement"
                  >
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Sortir Ticket Non Payé (Note)</span>
                  </button>

                  <button
                    onClick={() => setTicketModalOrder(selectedOrder)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 font-bold text-xs transition flex items-center gap-1.5 border border-emerald-500/40 shadow-sm"
                    title="Imprimer le ticket acquitté avec QR code et preuve de paiement"
                  >
                    <Printer className="w-4 h-4 text-emerald-400" />
                    <span>Sortir Ticket Payé (Reçu)</span>
                  </button>
                </div>
              </div>

              {/* Consultation des Lignes de Commande */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Détail des Articles Commandés ({(selectedOrder.items || []).length})
                  </span>
                  <span className="text-slate-500 text-[11px]">Format ticket thermique 80mm</span>
                </div>

                <div className="overflow-y-auto max-h-44 space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                  {(selectedOrder.items || []).filter((i) => i.status !== 'annule').map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-1 border-b border-slate-900">
                      <div>
                        <span className="font-semibold text-white">
                          {item.quantity}x {item.item_name}
                        </span>
                        {item.destination && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {item.destination === 'bar' ? 'Bar' : 'Cuisine'}
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-slate-400 text-[11px] mr-2">
                          ({item.unit_price.toLocaleString()} F)
                        </span>
                        <span className="font-bold text-white">
                          {item.total_price.toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consultation du Bilan Financier du Ticket */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Sous-total brut :</span>
                  <span>{selectedOrder.subtotal.toLocaleString()} FCFA</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Remise commerciale accordée :</span>
                    <span>-{selectedOrder.discount_amount.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300 font-bold pt-1 border-t border-slate-900">
                  <span>Total Net TTC :</span>
                  <span className="text-white font-mono">{selectedOrder.total_amount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Total Déjà Réglé (Acomptes / Versements) :</span>
                  <span className="font-mono font-semibold">{selectedOrder.total_paid.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-base font-black text-amber-400 pt-2 border-t border-slate-800">
                  <span>SOLDE RESTANT À PAYER :</span>
                  <span className="font-mono">{selectedOrder.balance_due.toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Historique des Règlements déjà effectués */}
              {orderPayments.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Règlements enregistrés ({orderPayments.length}) :
                  </span>
                  <div className="space-y-1">
                    {orderPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-[11px] p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold text-white uppercase">{p.payment_method}</span>
                          {p.reference_code && (
                            <span className="font-mono text-slate-400 text-[10px]">
                              Ref: {p.reference_code}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {p.amount.toLocaleString()} FCFA
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Encaissement (Active uniquement si solde dû > 0) */}
              {selectedOrder.balance_due > 0 ? (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-amber-400" />
                    Encaisser le Solde Dû
                  </h3>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'especes', label: 'Espèces (FCFA)', icon: <Banknote className="w-4 h-4" /> },
                      { id: 'wave', label: 'Wave Money', icon: <Smartphone className="w-4 h-4 text-cyan-400" /> },
                      { id: 'orange_money', label: 'Orange Money', icon: <Smartphone className="w-4 h-4 text-orange-400" /> },
                      { id: 'carte_bancaire', label: 'Carte Bancaire', icon: <CreditCard className="w-4 h-4 text-blue-400" /> },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                          paymentMethod === m.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-950/30'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Payment Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Montant à encaisser (FCFA)
                      </label>
                      <input
                        type="number"
                        min={100}
                        max={selectedOrder.balance_due}
                        value={amountToPay}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setAmountToPay(val);
                          setReceivedCash(val);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none"
                      />
                    </div>

                    {paymentMethod === 'especes' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                          Montant Reçu du Client (FCFA)
                        </label>
                        <input
                          type="number"
                          value={receivedCash}
                          onChange={(e) => setReceivedCash(Number(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none"
                        />
                        {changeDue > 0 && (
                          <p className="text-xs font-bold text-emerald-400 mt-1">
                            Monnaie à rendre : {changeDue.toLocaleString()} FCFA
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                          Référence Transaction (SMS / App)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: WAVE-TX-984421 ou OM-SN-..."
                          value={referenceCode}
                          onChange={(e) => setReferenceCode(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Quick Cash Buttons for Francs CFA */}
                  {paymentMethod === 'especes' && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-[10px] text-slate-500 self-center">Billets rapides :</span>
                      {[2000, 5000, 10000, 20000, 50000].map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => setReceivedCash(bill)}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white transition font-mono text-[11px]"
                        >
                          {bill.toLocaleString()} F
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Validation Button */}
                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessing || amountToPay <= 0}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      Encaisser {amountToPay.toLocaleString()} FCFA (
                      {paymentMethod.toUpperCase()}) & Sortir Ticket
                    </span>
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div>
                    <p className="font-bold text-emerald-300 text-sm">
                      Ce ticket est intégralement payé et soldé.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      La table {selectedOrder.table_number} a été libérée. Le reçu client peut être réimprimé à tout moment.
                    </p>
                  </div>
                  <button
                    onClick={() => setTicketModalOrder(selectedOrder)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer le Reçu Payé</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
              <p className="font-semibold text-slate-400">Aucun ticket sélectionné</p>
              <p className="text-xs text-slate-500 mt-1">
                Sélectionnez un ticket dans la liste de gauche pour consulter ses détails ou imprimer son reçu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Thermal Ticket Printable Modal */}
      {ticketModalOrder && (
        <ThermalTicketModal
          order={ticketModalOrder}
          establishmentName={session?.activeEstablishment?.name}
          onClose={() => setTicketModalOrder(null)}
        />
      )}
    </div>
  );
};
