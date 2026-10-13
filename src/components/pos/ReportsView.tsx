// RESTBAR PRO — Rapports de Ventes & Clôture Journalière
import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  Wine,
  Utensils,
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore } from '../../services/posService';
import { Badge } from '../common/Badge';

export const ReportsView: React.FC = () => {
  const { session } = useAuth();
  const estId = session?.activeEstablishment?.id;

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!estId) return;
    try {
      const report = posStore.getSalesReport(estId, session?.user.id);
      setStats(report);
    } catch (err: any) {
      console.warn('RLS Access check:', err);
    }
  }, [estId, session?.user.id]);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              Rapport des Ventes & Clôture de Caisse (Z)
            </h1>
            <Badge variant="amber">Service en Cours</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Analyse des encaissements par moyen de règlement (Espèces, Wave, Orange Money) et ventilation Bar / Cuisine.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-1.5 border border-slate-700"
        >
          <Download className="w-4 h-4 text-slate-300" />
          Imprimer le Rapport Z
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Chiffre d'Affaires Encaissé
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono mt-2 block">
            {stats.totalRevenue.toLocaleString()} FCFA
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats.ordersCount} commandes réglées
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Espèces Nettes en Caisse
          </span>
          <span className="text-2xl font-black text-emerald-400 font-mono mt-2 block">
            {stats.netCashInTill.toLocaleString()} FCFA
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Après -{stats.expensesTotal.toLocaleString()} F de dépenses
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Part Mobile Money (Wave / OM)
          </span>
          <span className="text-2xl font-black text-cyan-400 font-mono mt-2 block">
            {(stats.revenueByMethod.wave + stats.revenueByMethod.orange_money).toLocaleString()} FCFA
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Vérifié par passerelle
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Ventilation Bar vs Cuisine
          </span>
          <div className="mt-2 flex items-center gap-3">
            <div>
              <span className="text-xs text-purple-400 font-bold block">Bar</span>
              <span className="font-mono text-xs text-white">
                {stats.barRevenue.toLocaleString()} F
              </span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-xs text-emerald-400 font-bold block">Cuisine</span>
              <span className="font-mono text-xs text-white">
                {stats.kitchenRevenue.toLocaleString()} F
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            Encaissements par Mode de Règlement
          </h3>

          <div className="space-y-3">
            {[
              {
                label: 'Espèces (Cash)',
                val: stats.revenueByMethod.especes,
                icon: <Banknote className="w-4 h-4 text-emerald-400" />,
                color: 'bg-emerald-500',
              },
              {
                label: 'Wave Money',
                val: stats.revenueByMethod.wave,
                icon: <Smartphone className="w-4 h-4 text-cyan-400" />,
                color: 'bg-cyan-500',
              },
              {
                label: 'Orange Money',
                val: stats.revenueByMethod.orange_money,
                icon: <Smartphone className="w-4 h-4 text-orange-400" />,
                color: 'bg-orange-500',
              },
              {
                label: 'Carte Bancaire (TPE)',
                val: stats.revenueByMethod.carte_bancaire,
                icon: <CreditCard className="w-4 h-4 text-blue-400" />,
                color: 'bg-blue-500',
              },
            ].map((m) => {
              const pct = stats.totalRevenue > 0 ? (m.val / stats.totalRevenue) * 100 : 0;
              return (
                <div key={m.label} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      {m.icon}
                      <span>{m.label}</span>
                    </div>
                    <span className="font-mono font-bold text-white">
                      {m.val.toLocaleString()} FCFA ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Services & Expenses Balance */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            Bilan Réconciliation de Fin de Service
          </h3>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Total Ventes Brutes :</span>
              <span className="font-mono font-bold text-white">
                {stats.totalRevenue.toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Moins Décaissements Dépenses :</span>
              <span className="font-mono font-bold text-rose-400">
                -{stats.expensesTotal.toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-900">
              <span className="text-slate-400">Virements Mobiles (Wave / OM) :</span>
              <span className="font-mono text-cyan-400">
                {(stats.revenueByMethod.wave + stats.revenueByMethod.orange_money).toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex justify-between py-2 border-t border-slate-800 text-sm font-black text-emerald-400">
              <span>SOLDE ESPÈCES PHYSIQUE À CLÔTURER :</span>
              <span className="font-mono">{stats.netCashInTill.toLocaleString()} FCFA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
