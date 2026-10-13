// RESTBAR PRO — Establishment & Financial Settings
import React, { useEffect, useState } from 'react';
import {
  Store,
  Save,
  Clock,
  Receipt,
  Tv,
  Bell,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { Establishment, EstablishmentSettings, OpeningHours } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';
import { canManageStaff } from '../../lib/permissions';

export const EstablishmentSettingsView: React.FC = () => {
  const { session, refreshSession } = useAuth();
  const { success, error } = useNotification();

  const isManager = canManageStaff(session);

  const [estInfo, setEstInfo] = useState<Partial<Establishment>>({});
  const [settings, setSettings] = useState<Partial<EstablishmentSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.activeEstablishment) {
      setEstInfo({ ...session.activeEstablishment });
      apiService
        .getSettings(session, session.activeEstablishment.id)
        .then((s) => {
          setSettings(s);
          setIsLoading(false);
        })
        .catch((err) => {
          error('Erreur paramètres', err.message);
          setIsLoading(false);
        });
    }
  }, [session?.activeEstablishment]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.activeEstablishment || !isManager) return;

    setIsSaving(true);
    try {
      // 1. Sauvegarde des infos établissement
      await apiService.updateEstablishment(session, session.activeEstablishment.id, {
        name: estInfo.name,
        legal_name: estInfo.legal_name,
        vat_number: estInfo.vat_number,
        phone: estInfo.phone,
        email: estInfo.email,
        address: estInfo.address,
        city: estInfo.city,
        postal_code: estInfo.postal_code,
      });

      // 2. Sauvegarde des settings métier & TVA
      await apiService.updateSettings(session, session.activeEstablishment.id, {
        vat_rate: Number(settings.vat_rate) || 20,
        service_charge_rate: Number(settings.service_charge_rate) || 0,
        order_ticket_footer: settings.order_ticket_footer,
        sound_notifications: settings.sound_notifications,
        realtime_kds: settings.realtime_kds,
        kitchen_display_columns: Number(settings.kitchen_display_columns) || 4,
        opening_hours: settings.opening_hours,
      });

      success('Modifications enregistrées', 'Les paramètres de l’établissement ont été mis à jour.');
      refreshSession();
    } catch (err: any) {
      error('Échec enregistrement', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const daysList: Array<{ key: keyof OpeningHours; label: string }> = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' },
  ];

  const handleHoursChange = (dayKey: keyof OpeningHours, field: 'open' | 'close', value: string) => {
    if (!settings.opening_hours) return;
    setSettings((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours!,
        [dayKey]: {
          ...prev.opening_hours![dayKey],
          [field]: value,
        },
      },
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Paramètres & Configuration de l’Établissement
            </h1>
            <Badge variant="amber">Édition Gérant</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Coordonnées légales, fiscalité TVA, horaires de service et affichage des postes de cuisine.
          </p>
        </div>

        {isManager && (
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-amber-950/40"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        )}
      </div>

      {!isManager && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <Lock className="w-4 h-4 shrink-0" />
          <p>
            Vous consultez ces réglages en lecture seule. Seul le Gérant peut modifier la
            configuration de l'établissement.
          </p>
        </div>
      )}

      {/* Grid: 2 Colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne 1 : Coordonnées & Données Légales */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Store className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-white text-base">Identité & Coordonnées</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Nom Commercial *
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={estInfo.name || ''}
                onChange={(e) => setEstInfo({ ...estInfo, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Raison Sociale
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={estInfo.legal_name || ''}
                onChange={(e) => setEstInfo({ ...estInfo, legal_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Numéro de TVA Intracommunautaire
              </label>
              <input
                type="text"
                disabled={!isManager}
                placeholder="FR12345678901"
                value={estInfo.vat_number || ''}
                onChange={(e) => setEstInfo({ ...estInfo, vat_number: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                disabled={!isManager}
                value={estInfo.phone || ''}
                onChange={(e) => setEstInfo({ ...estInfo, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email de contact
              </label>
              <input
                type="email"
                disabled={!isManager}
                value={estInfo.email || ''}
                onChange={(e) => setEstInfo({ ...estInfo, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Adresse
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={estInfo.address || ''}
                onChange={(e) => setEstInfo({ ...estInfo, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Ville
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={estInfo.city || ''}
                onChange={(e) => setEstInfo({ ...estInfo, city: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Code Postal
              </label>
              <input
                type="text"
                disabled={!isManager}
                value={estInfo.postal_code || ''}
                onChange={(e) => setEstInfo({ ...estInfo, postal_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Colonne 2 : Fiscalité & Facturation */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-white text-base">Fiscalité, TVA & Tickets</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Taux de TVA Standard (%)
              </label>
              <input
                type="number"
                step="0.1"
                disabled={!isManager}
                value={settings.vat_rate ?? 20}
                onChange={(e) => setSettings({ ...settings, vat_rate: parseFloat(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500">20.0% standard restauration</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Frais de service (%)
              </label>
              <input
                type="number"
                step="0.5"
                disabled={!isManager}
                value={settings.service_charge_rate ?? 0}
                onChange={(e) =>
                  setSettings({ ...settings, service_charge_rate: parseFloat(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500">0% par défaut en France</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Message en Pied de Ticket de Caisse
              </label>
              <textarea
                rows={2}
                disabled={!isManager}
                value={settings.order_ticket_footer || ''}
                onChange={(e) => setSettings({ ...settings, order_ticket_footer: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Affichage KDS Cuisine & Audio */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Affichage Cuisine & Notifications
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Alertes Sonores</p>
                  <p className="text-[10px] text-slate-400">Sonnerie lors d’un nouveau bon envoyé</p>
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!isManager}
                checked={settings.sound_notifications ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, sound_notifications: e.target.checked })
                }
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-white">KDS Temps Réel</p>
                  <p className="text-[10px] text-slate-400">Synchronisation via Supabase Realtime</p>
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!isManager}
                checked={settings.realtime_kds ?? true}
                onChange={(e) => setSettings({ ...settings, realtime_kds: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Ligne pleine : Horaires d'Ouverture */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-blue-400" />
              <h2 className="font-bold text-white text-base">Horaires d'Ouverture & Service</h2>
            </div>
            <span className="text-xs text-slate-400">Gestion des services midi et soir</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {daysList.map(({ key, label }) => {
              const day = settings.opening_hours?.[key] || { open: '11:00', close: '23:00' };

              return (
                <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-white text-center">{label}</p>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Ouverture</span>
                    <input
                      type="time"
                      disabled={!isManager}
                      value={day.open}
                      onChange={(e) => handleHoursChange(key, 'open', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Fermeture</span>
                    <input
                      type="time"
                      disabled={!isManager}
                      value={day.close}
                      onChange={(e) => handleHoursChange(key, 'close', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </form>
  );
};
