// RESTBAR PRO — Audit Logs Viewer
import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Shield,
  Clock,
  User,
  Database,
  X,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { AuditLog } from '../../types/database';
import { Badge } from '../common/Badge';

export const AuditLogsView: React.FC = () => {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.activeEstablishment) {
      setIsLoading(true);
      apiService
        .getAuditLogs(
          session,
          session.isSuperAdmin ? undefined : session.activeEstablishment.id
        )
        .then((data) => {
          setLogs(data);
          setIsLoading(false);
        });
    }
  }, [session]);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const actionMatch = log.action.toLowerCase().includes(term);
    const entityMatch = log.entity_type.toLowerCase().includes(term);
    return actionMatch || entityMatch;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('GENERATED') || action.includes('ATTACHED'))
      return 'success';
    if (action.includes('DEACTIVATED') || action.includes('REVOKED') || action.includes('DELETED'))
      return 'danger';
    if (action.includes('UPDATED') || action.includes('CHANGED')) return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Journal d’Audit & Traçabilité Sécurisée
            </h1>
            <Badge variant="amber">Immuable PostgreSQL</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Historique certifié de chaque action sensible : créations d'employés, changements de droits, émissions de licences.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrer par action ou entité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Scope banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>
            Périmètre d'audit :{' '}
            <strong className="text-white">
              {session?.isSuperAdmin ? 'Tous les établissements (Super Admin)' : session?.activeEstablishment?.name}
            </strong>
          </span>
        </div>
        <span className="font-mono text-slate-400 text-[11px]">{filteredLogs.length} événements enregistrés</span>
      </div>

      {/* Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Date & Heure</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entité Ciblée</th>
                <th className="py-3.5 px-4">Opérateur (Acteur)</th>
                <th className="py-3.5 px-4 text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Aucun événement d'audit ne correspond à votre filtre.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition group">
                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                        {new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeColor(log.action)} size="sm">
                          {log.action}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                        <span className="text-slate-400">{log.entity_type}</span>{' '}
                        {log.entity_id && (
                          <span className="text-slate-500">({log.entity_id.substring(0, 12)}...)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{log.actor_id ? log.actor_id.substring(0, 16) : 'Système'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Consulter
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Détail Événement d'Audit */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Entrée du Journal d'Audit
                </h3>
                <p className="text-xs text-slate-400 font-mono">ID: {selectedLog.id}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Action :</span>
                <Badge variant={getActionBadgeColor(selectedLog.action)} size="sm">
                  {selectedLog.action}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Horodatage :</span>
                <span className="text-white font-mono">{new Date(selectedLog.created_at).toISOString()}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Entité & ID :</span>
                <span className="text-amber-400 font-mono">{selectedLog.entity_type} / {selectedLog.entity_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Opérateur :</span>
                <span className="text-white font-mono">{selectedLog.actor_id || 'Système'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Détails JSON :</span>
                <pre className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-40">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
