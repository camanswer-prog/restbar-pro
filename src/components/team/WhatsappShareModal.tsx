// RESTBAR PRO — Modal de transmission des identifiants par WhatsApp
import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  Phone,
  Shield,
  Store,
  User,
  X,
  Send,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export interface WhatsappShareData {
  fullName: string;
  email: string;
  phone?: string;
  establishmentName: string;
  roleName: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
}

interface WhatsappShareModalProps {
  data: WhatsappShareData;
  onClose: () => void;
}

export const WhatsappShareModal: React.FC<WhatsappShareModalProps> = ({ data, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState(data.phone || '');

  // Nettoyage du numéro de téléphone (uniquement chiffres)
  const cleanPhone = (phoneStr: string) => {
    return phoneStr.replace(/[^\d+]/g, '').replace('+', '');
  };

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://restbar.pro';

  // Formatage du message WhatsApp conforme aux exigences
  const buildWhatsappMessage = () => {
    return (
`🏨 *RESTBAR PRO — VOS ACCÈS COLLABORATEUR* 🏨

Bonjour *${data.fullName}*,

Votre compte d'accès pour le restaurant vient d'être créé sur *RESTBAR PRO* :

🏢 *Établissement :* ${data.establishmentName}
👤 *Nom :* ${data.fullName}
🛡️ *Rôle :* ${data.roleName}
📧 *Login (Identifiant) :* ${data.email}
🔑 *Mot de passe initial :* ${data.tempPassword || '(Défini lors de la création)'}

${data.mustChangePassword ? '⚠️ *Sécurité :* Lors de votre toute première connexion, vous devrez obligatoirement choisir un nouveau mot de passe personnel.' : ''}

🌐 *Lien de connexion :* ${appUrl}

_Conservez ce message confidentiel._`
    ).trim();
  };

  const messageText = buildWhatsappMessage();

  const handleCopy = () => {
    navigator.clipboard?.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsapp = () => {
    const phoneParam = customPhone ? cleanPhone(customPhone) : '';
    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = phoneParam
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header Vert WhatsApp Signature */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-b border-emerald-500/20 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] shadow-inner shrink-0 mt-0.5">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Envoyer les Accès par WhatsApp
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold">
                  Compte créé
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transmettez instantanément les identifiants confidentiels à votre collaborateur via WhatsApp.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700 shrink-0"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la modal */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Récapitulatif des identifiants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center gap-2.5 text-xs">
              <Store className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Établissement</p>
                <p className="font-bold text-white truncate">{data.establishmentName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <User className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Nom Collaborateur</p>
                <p className="font-bold text-white truncate">{data.fullName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <Shield className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Rôle Attribué</p>
                <p className="font-bold text-white truncate">{data.roleName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Login / Identifiant</p>
                <p className="font-mono font-bold text-white truncate">{data.email}</p>
              </div>
            </div>

            {data.tempPassword && (
              <div className="col-span-1 sm:col-span-2 flex items-center gap-2.5 text-xs pt-1 border-t border-slate-800/80">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Mot de passe temporaire</p>
                  <p className="font-mono font-bold text-amber-300 text-sm tracking-wider">
                    {data.tempPassword}
                  </p>
                </div>
                {data.mustChangePassword && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    Changement obligatoire à la 1ère connexion
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Saisie ou ajustement du numéro de téléphone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Numéro de téléphone WhatsApp du destinataire
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="Ex: +221 77 123 45 67 ou 0708091011"
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#25D366] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {customPhone
                ? 'Le message s\'ouvrira directement dans la conversation avec ce numéro.'
                : 'Si vide, WhatsApp vous permettra de sélectionner le contact dans votre liste.'}
            </p>
          </div>

          {/* Aperçu du message WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Aperçu du message formaté
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copié dans le presse-papier !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier le texte</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-all">
              {messageText}
            </div>
          </div>

          {/* Note sur la sécurité */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Pour des raisons de sécurité, le mot de passe initial devra être modifié par le collaborateur dès sa première identification. Il ne pourra pas accéder aux fonctionnalités de son poste avant cette étape.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-2 shadow"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>Copier le message</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsapp}
              className="px-5 py-2.5 text-xs font-bold rounded-xl text-slate-950 bg-[#25D366] hover:bg-[#20ba59] transition flex items-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95"
            >
              <Send className="w-4 h-4 text-slate-950" />
              <span>Ouvrir sur WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
