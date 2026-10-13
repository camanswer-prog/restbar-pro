// RESTBAR PRO — Dépenses & Décaissements de Caisse
import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Plus,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  Clock,
  X,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore } from '../../services/posService';
import { Expense } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

export const ExpensesView: React.FC = () => {
  const { session } = useAuth();
  const { success, error } = useNotification();

  const estId = session?.activeEstablishment?.id;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('courses');
  const [amount, setAmount] = useState<number>(5000);
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [receiptRef, setReceiptRef] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    if (!estId) return;
    try {
      setExpenses(posStore.getExpenses(estId, session?.user.id));
    } catch (err: any) {
      error('Accès refusé', err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [estId]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estId || !session || !title || amount <= 0) return;

    try {
      posStore.createExpense(estId, session.user.id, {
        title,
        category,
        amount: Number(amount),
        payment_method: paymentMethod,
        receipt_reference: receiptRef || undefined,
        notes: notes || undefined,
      });

      success('Décaissement enregistré', `${amount.toLocaleString()} FCFA déduits du fond de caisse.`);
      setIsAddOpen(false);
      setTitle('');
      setAmount(5000);
      setReceiptRef('');
      setNotes('');
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-amber-400" />
              Dépenses & Décaissements de Caisse
            </h1>
            <Badge variant="amber">Total : {totalExpenses.toLocaleString()} FCFA</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Enregistrement des sorties d'espèces du tiroir-caisse pour achats d'urgence, marché, glace ou transport.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
        >
          <Plus className="w-4 h-4" />
          Nouveau Décaissement
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Date & Heure</th>
                <th className="py-3.5 px-4">Motif du Décaissement</th>
                <th className="py-3.5 px-4">Catégorie</th>
                <th className="py-3.5 px-4">Réf / Justificatif</th>
                <th className="py-3.5 px-4 font-mono text-right">Montant (FCFA)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Aucun décaissement enregistré sur le service en cours.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(exp.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 font-bold text-white">
                      <div>
                        <span>{exp.title}</span>
                        {exp.notes && (
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{exp.notes}</p>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 text-[11px]">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {exp.receipt_reference || 'Non renseigné'}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-rose-400 text-right text-sm">
                      -{exp.amount.toLocaleString()} FCFA
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nouveau Décaissement */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Sortie de Caisse</h3>
                <p className="text-xs text-slate-400">Enregistrement d'une dépense en espèces</p>
              </div>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Motif du Décaissement *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Achat glace en écailles ou transport marché"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Montant Retiré (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="glace">Glace & Boissons</option>
                    <option value="marche">Marché & Ingrédients</option>
                    <option value="transport">Transport / Course</option>
                    <option value="divers">Divers & Entretien</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Référence Facture ou Reçu
                </label>
                <input
                  type="text"
                  placeholder="Ex: RECU-0941"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Remarques
                </label>
                <input
                  type="text"
                  placeholder="Détail supplémentaire..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
                >
                  Valider le Décaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
