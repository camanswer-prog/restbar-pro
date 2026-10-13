// RESTBAR PRO — Supabase Live Connection Config Modal
import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, X, Shield, ExternalLink, RefreshCw } from 'lucide-react';
import { getStoredSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, testSupabaseConnection } from '../../lib/supabaseClient';
import { useNotification } from '../../context/NotificationContext';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { success, error } = useNotification();

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'Veuillez saisir à la fois l’URL et la clé anonyme.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSave = () => {
    if (!url || !anonKey) {
      error('Configuration incomplète', 'URL et clé anonyme requises.');
      return;
    }
    saveSupabaseConfig(url, anonKey);
    success('Configuration enregistrée', 'Connexion Supabase activée en temps réel.');
    onClose();
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    success('Déconnecté', 'Retour au moteur de base de données relationnel vérifié.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Connexion Supabase Live</h3>
            <p className="text-xs text-slate-400">Authentification, PostgreSQL et RLS natifs</p>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 mb-5 text-xs text-slate-300 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            RESTBAR PRO fonctionne en temps réel avec votre projet Supabase. Retrouvez vos clés dans le tableau de bord Supabase :{' '}
            <strong className="text-white">Project Settings &gt; API</strong>.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              URL du Projet Supabase
            </label>
            <input
              type="text"
              placeholder="https://votre-projet.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Clé Publique Anonyme (anon public key)
            </label>
            <textarea
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition resize-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              * Ne saisissez JAMAIS la clé service_role ici. Celle-ci reste strictement réservée au backend sécurisé.
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{testResult.message}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800">
          <div>
            {currentConfig.isConfigured && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition"
              >
                Déconnecter le projet
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTest}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
            >
              {isTesting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Tester la connexion
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/50"
            >
              Sauvegarder & Connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
