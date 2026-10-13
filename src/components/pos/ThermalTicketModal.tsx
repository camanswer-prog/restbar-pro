// RESTBAR PRO — Modal Reçu / Ticket Thermique de Caisse (80mm) : Support Ticket Non Payé (Note Proforma) & Ticket Payé
import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, QrCode, AlertCircle, Clock } from 'lucide-react';
import { Order, Payment } from '../../types/database';

interface ThermalTicketModalProps {
  order: Order | null;
  payments?: Payment[];
  establishmentName?: string;
  establishmentAddress?: string;
  establishmentPhone?: string;
  establishmentVat?: string;
  ticketFooter?: string;
  onClose: () => void;
}

export const ThermalTicketModal: React.FC<ThermalTicketModalProps> = ({
  order,
  payments = [],
  establishmentName = 'RESTBAR PRO',
  establishmentAddress = '14 Boulevard Saint-Germain, Paris / Dakar',
  establishmentPhone = '+221 77 123 45 67',
  establishmentVat = 'SN-DKR-2025-B-1234',
  ticketFooter = 'Merci de votre visite et à très bientôt !',
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPaid = order.status === 'payee' || order.balance_due <= 0;
  const isPartiallyPaid = !isPaid && order.total_paid > 0;
  const orderPayments = payments.length > 0 ? payments : order.payments || [];
  const printDate = order.paid_at ? new Date(order.paid_at) : new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {isPaid ? 'Ticket Payé (Facture Finale)' : 'Ticket Non Payé (Addition / Note Proforma)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Printable Ticket */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-[320px] bg-white text-slate-950 p-5 rounded-lg shadow-xl font-mono text-[11px] leading-tight select-all border border-slate-300"
          >
            {/* Header / Logo */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
              <p className="font-extrabold text-base tracking-wider uppercase">{establishmentName}</p>
              <p className="text-[10px] text-slate-600">{establishmentAddress}</p>
              <p className="text-[10px] text-slate-600">Tél: {establishmentPhone}</p>
              {establishmentVat && <p className="text-[9px] text-slate-500">NIF/TVA: {establishmentVat}</p>}
              
              <div className="pt-1">
                <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                  isPaid ? 'bg-emerald-50 text-emerald-800 border-emerald-400' : 'bg-amber-50 text-amber-900 border-amber-400'
                }`}>
                  {isPaid ? 'REÇU DE PAIEMENT DÉFINITIF' : 'ADDITION — NOTE PROFORMA'}
                </span>
              </div>
            </div>

            {/* Ticket Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>TICKET N°:</span>
                <span className="font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span>TABLE:</span>
                <span className="font-bold">{order.table_number}</span>
              </div>
              <div className="flex justify-between">
                <span>SERVEUR:</span>
                <span>{order.server_name}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE ÉMISSION:</span>
                <span>{printDate.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>STATUT:</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {isPaid ? 'ACQUITTÉ' : isPartiallyPaid ? 'ACOMPTE VERSÉ' : 'EN ATTENTE D’ENCAISSEMENT'}
                </span>
              </div>
            </div>

            {/* Articles Details */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5">
              <div className="flex justify-between text-[9px] text-slate-600 uppercase font-bold">
                <span className="w-7">QTÉ</span>
                <span className="flex-1 px-1">DÉSIGNATION</span>
                <span className="text-right">TOTAL</span>
              </div>
              {(order.items || []).filter((i) => i.status !== 'annule').map((item) => (
                <div key={item.id} className="flex justify-between items-start text-[10px]">
                  <span className="w-7 font-bold">{item.quantity}x</span>
                  <span className="flex-1 px-1 truncate">{item.item_name}</span>
                  <span className="text-right font-bold whitespace-nowrap">
                    {item.total_price.toLocaleString()} F
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>SOUS-TOTAL:</span>
                <span>{order.subtotal.toLocaleString()} FCFA</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>REMISE ACCORDÉE:</span>
                  <span>-{order.discount_amount.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                <span>TOTAL NET DU TICKET:</span>
                <span>{order.total_amount.toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Payments breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
              <span className="font-bold text-[9px] uppercase text-slate-700 block">
                {isPaid ? 'Règlements reçus :' : 'État des règlements :'}
              </span>
              {orderPayments.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic">Aucun paiement enregistré pour l'instant</p>
              ) : (
                orderPayments.map((p) => {
                  const methodLabels: Record<string, string> = {
                    especes: 'Espèces',
                    wave: 'Wave',
                    orange_money: 'Orange Money',
                    carte_bancaire: 'Carte Bancaire',
                  };
                  return (
                    <div key={p.id} className="flex justify-between">
                      <span>
                        {methodLabels[p.payment_method] || p.payment_method}{' '}
                        {p.reference_code ? `(${p.reference_code})` : ''}
                      </span>
                      <span className="font-bold">{p.amount.toLocaleString()} FCFA</span>
                    </div>
                  );
                })
              )}
              <div className={`flex justify-between font-black pt-1 ${isPaid ? 'text-emerald-800' : 'text-rose-800 text-[12px]'}`}>
                <span>{isPaid ? 'SOLDE RESTANT :' : 'NET À REGLER EN CAISSE :'}</span>
                <span>{order.balance_due.toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Status Stamp */}
            <div className="py-3 text-center space-y-1">
              {isPaid ? (
                <div className="inline-block px-3 py-1 border-2 border-emerald-700 text-emerald-800 font-extrabold text-xs tracking-widest uppercase rounded">
                  ✓ FACTURE PAYÉE
                </div>
              ) : (
                <div className="inline-block px-3 py-1 border-2 border-amber-600 text-amber-800 font-extrabold text-xs tracking-widest uppercase rounded">
                  ⚠ TICKET NON PAYÉ (ADDITION)
                </div>
              )}
              <p className="text-[9px] text-slate-600 mt-1">
                {isPaid ? ticketFooter : 'À régler en caisse — Merci de votre visite !'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isPaid ? 'Ticket soldé' : 'Addition provisoire'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg transition"
            >
              Fermer
            </button>
            <button
              onClick={handlePrint}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition shadow-md flex items-center gap-1.5 ${
                isPaid
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              {isPaid ? 'Imprimer Ticket Payé' : 'Imprimer Ticket Non Payé'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
