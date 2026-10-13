// RESTBAR PRO — Staff & Team Members Management
import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Eye,
  EyeOff,
  Edit2,
  UserX,
  UserCheck,
  Shield,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Lock,
  Store,
  Utensils,
  Wine,
  ChefHat,
  CreditCard,
  User,
  KeyRound,
  RefreshCw,
  Copy,
  Check,
  Search,
  MessageSquare,
  Share2,
  Send,
  SlidersHorizontal,
  Boxes,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/apiService';
import { EstablishmentMember, Role } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { ConfirmModal } from '../common/ConfirmModal';
import { Badge } from '../common/Badge';
import { ROLE_LABELS, canManageStaff } from '../../lib/permissions';
import { WhatsappShareModal, WhatsappShareData } from './WhatsappShareModal';

export const StaffMembersView: React.FC = () => {
  const { session } = useAuth();
  const { success, error, info } = useNotification();

  const [members, setMembers] = useState<EstablishmentMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [viewModalMember, setViewModalMember] = useState<EstablishmentMember | null>(null);
  const [editRoleMember, setEditRoleMember] = useState<EstablishmentMember | null>(null);
  const [toggleConfirmMember, setToggleConfirmMember] = useState<EstablishmentMember | null>(null);
  const [resetPasswordMember, setResetPasswordMember] = useState<EstablishmentMember | null>(null);
  const [whatsappShareModalData, setWhatsappShareModalData] = useState<WhatsappShareData | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Helper to generate temporary secure passwords
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `RestBar-${code}!`;
  };

  // Invite Form State
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [invitePassword, setInvitePassword] = useState('RestBar2026!');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [inviteMustChangePassword, setInviteMustChangePassword] = useState(true);
  const [openWhatsappAfterCreate, setOpenWhatsappAfterCreate] = useState(true);

  // Reset Password Modal State
  const [newTempPassword, setNewTempPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);

  // Edit Role Form State
  const [selectedNewRoleId, setSelectedNewRoleId] = useState('');

  const isManager = canManageStaff(session);

  const loadData = async () => {
    if (!session?.activeEstablishment) return;
    setIsLoading(true);
    try {
      const [membersData, rolesData] = await Promise.all([
        apiService.getMembers(session, session.activeEstablishment.id),
        apiService.getRoles(session.activeEstablishment.id),
      ]);
      setMembers(membersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !inviteRoleId) {
        setInviteRoleId(rolesData[1]?.id || rolesData[0].id); // default to serveur or first
      }
    } catch (err: any) {
      error('Erreur chargement équipe', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session?.activeEstablishment]);

  const activeMembersCount = members.filter((m) => m.is_active).length;
  const maxAllowed = session?.activeLicense?.max_users || 5;
  const isLicenseFull = activeMembersCount >= maxAllowed;

  // Filtered members list for real-time search & filter
  const filteredMembers = members.filter((member) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      member.profile?.full_name?.toLowerCase().includes(term) ||
      member.profile?.email?.toLowerCase().includes(term) ||
      (member.profile?.phone && member.profile.phone.toLowerCase().includes(term));

    const matchesRole =
      roleFilter === 'all' ||
      member.roles?.some((r) => r.code === roleFilter || r.id === roleFilter);

    return matchesSearch && matchesRole;
  });

  // Open invite modal with fresh generated password
  const handleOpenInviteModal = () => {
    setInvitePassword(generateSecurePassword());
    setIsInviteModalOpen(true);
  };

  // Handler: Invite Member
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.activeEstablishment) return;

    if (!inviteFullName.trim() || !inviteEmail.trim() || !inviteRoleId) {
      error('Champs incomplets', 'Veuillez remplir le nom, l’email et sélectionner un poste.');
      return;
    }

    if (!invitePassword || invitePassword.trim().length < 4) {
      error('Mot de passe requis', 'Veuillez définir un mot de passe initial (au moins 4 caractères).');
      return;
    }

    try {
      await apiService.createMember(session, session.activeEstablishment.id, {
        full_name: inviteFullName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        phone: invitePhone.trim(),
        role_id: inviteRoleId,
        initial_password: invitePassword.trim(),
        must_change_password: inviteMustChangePassword,
      });

      const selectedRole = roles.find((r) => r.id === inviteRoleId);
      const roleName = selectedRole ? selectedRole.name : 'Collaborateur';

      success(
        'Collaborateur enregistré avec succès !',
        `${inviteFullName} a été intégré(e) au poste de ${roleName}. Mot de passe temporaire : ${invitePassword}`
      );

      setIsInviteModalOpen(false);

      if (openWhatsappAfterCreate) {
        setWhatsappShareModalData({
          fullName: inviteFullName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          phone: invitePhone.trim(),
          establishmentName: session.activeEstablishment.name,
          roleName: roleName,
          tempPassword: invitePassword.trim(),
          mustChangePassword: inviteMustChangePassword,
        });
      }

      setInviteFullName('');
      setInviteEmail('');
      setInvitePhone('');
      setInvitePassword(generateSecurePassword());
      loadData();
    } catch (err: any) {
      error('Échec de création', err.message);
    }
  };

  // Handler: Reset Member Password by Manager
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordMember || !session?.activeEstablishment) return;

    if (!newTempPassword || newTempPassword.trim().length < 4) {
      error('Mot de passe trop court', 'Le mot de passe temporaire doit comporter au moins 4 caractères.');
      return;
    }

    try {
      const res = await apiService.resetMemberPassword(
        session,
        session.activeEstablishment.id,
        resetPasswordMember.profile_id,
        newTempPassword.trim()
      );

      if (res.success) {
        success(
          'Mot de passe réinitialisé !',
          `Nouveau mot de passe temporaire attribué à ${resetPasswordMember.profile?.full_name} : ${newTempPassword}. L'utilisateur devra obligatoirement le modifier à sa prochaine connexion.`
        );
        const memberRoleName = resetPasswordMember.roles?.[0]?.name || 'Collaborateur';
        setWhatsappShareModalData({
          fullName: resetPasswordMember.profile?.full_name || 'Collaborateur',
          email: resetPasswordMember.profile?.email || '',
          phone: resetPasswordMember.profile?.phone || '',
          establishmentName: session.activeEstablishment.name,
          roleName: memberRoleName,
          tempPassword: newTempPassword.trim(),
          mustChangePassword: true,
        });
        setResetPasswordMember(null);
        setNewTempPassword('');
        loadData();
      } else {
        error('Erreur', res.error || 'Impossible de réinitialiser le mot de passe.');
      }
    } catch (err: any) {
      error('Erreur réinitialisation', err.message);
    }
  };

  // Handler: Edit Role
  const handleSaveRole = async () => {
    if (!editRoleMember || !session?.activeEstablishment || !selectedNewRoleId) return;
    try {
      await apiService.assignRole(session, session.activeEstablishment.id, editRoleMember.id, selectedNewRoleId);
      success('Rôle mis à jour', `Le rôle de ${editRoleMember.profile?.full_name} a été modifié.`);
      setEditRoleMember(null);
      loadData();
    } catch (err: any) {
      error('Échec de mise à jour', err.message);
    }
  };

  // Handler: Toggle Active/Deactive
  const handleToggleStatus = async () => {
    if (!toggleConfirmMember || !session?.activeEstablishment) return;
    const newStatus = !toggleConfirmMember.is_active;

    try {
      await apiService.toggleMemberStatus(
        session,
        session.activeEstablishment.id,
        toggleConfirmMember.id,
        newStatus
      );

      if (newStatus) {
        success('Compte réactivé', `L'accès de ${toggleConfirmMember.profile?.full_name} est rétabli.`);
      } else {
        info('Compte désactivé', `L'accès de ${toggleConfirmMember.profile?.full_name} a été révoqué.`);
      }
      setToggleConfirmMember(null);
      loadData();
    } catch (err: any) {
      error('Erreur statut', err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setHasCopiedPassword(true);
    setTimeout(() => setHasCopiedPassword(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* PAGE HEADER ARRANGÉ : ÉQUIPE & COLLABORATEURS                       */}
      {/* ==================================================================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Titre & Établissement */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-inner shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Équipe & Collaborateurs
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs shadow-sm">
                  <Store className="w-3.5 h-3.5 text-amber-400" />
                  {session?.activeEstablishment?.name}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLicenseFull ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  {activeMembersCount} / {maxAllowed} postes actifs
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Gestion des collaborateurs, affectation des postes métier (Salle, Bar, Cuisine, Caisse, Gérance), définition des mots de passe avec renouvellement obligatoire à la première connexion, et transmission instantanée par WhatsApp.
              </p>
            </div>
          </div>

          {/* Action Principale CTA Ajouter Collaborateur */}
          {isManager && (
            <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
              <button
                onClick={handleOpenInviteModal}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs transition flex items-center gap-2.5 shadow-xl shadow-amber-950/50 hover:shadow-amber-500/25 active:scale-95 group"
              >
                <UserPlus className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
                <span>Ajouter un collaborateur</span>
                <span className="ml-1 px-2 py-0.5 rounded-md bg-slate-950/25 text-slate-950 text-[10px] font-mono font-bold">
                  +{Math.max(0, maxAllowed - activeMembersCount)} libre{Math.max(0, maxAllowed - activeMembersCount) > 1 ? 's' : ''}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* KPI Mini-Cards Bar Arrangée */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Membres</p>
              <p className="text-base font-extrabold text-white">{members.length}</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Postes Actifs</p>
              <p className="text-base font-extrabold text-emerald-400">
                {activeMembersCount} <span className="text-xs font-normal text-slate-500">/ {maxAllowed}</span>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">1ère Connexion Requise</p>
              <p className="text-base font-extrabold text-amber-300">
                {members.filter((m) => m.profile?.must_change_password).length}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Places Disponibles</p>
              <p className="text-base font-extrabold text-purple-300">
                {Math.max(0, maxAllowed - activeMembersCount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recherche & Filtres rapides */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition ${
              roleFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({members.length})
          </button>
          {roles.map((r) => {
            const count = members.filter((m) => m.roles?.some((mr) => mr.id === r.id || mr.code === r.code)).length;
            return (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.code || r.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition ${
                  roleFilter === (r.code || r.id)
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* License Limit Alert Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white">
              Capacité Licence PRO : {activeMembersCount} / {maxAllowed} utilisateurs actifs
            </span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              {isLicenseFull
                ? 'Limite atteinte. Veuillez mettre à niveau la licence pour ajouter de nouveaux postes.'
                : `Il vous reste ${maxAllowed - activeMembersCount} place(s) disponible(s) pour votre équipe.`}
            </p>
          </div>
        </div>

        <div className="w-full sm:w-48 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all ${
              isLicenseFull ? 'bg-rose-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, (activeMembersCount / maxAllowed) * 100)}%` }}
          />
        </div>
      </div>

      {!isManager && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <Lock className="w-4 h-4 shrink-0" />
          <p>
            Vous êtes connecté avec un rôle opérationnel restreint. Seul le gérant de l’établissement a le droit
            de créer ou modifier des collaborateurs et de réinitialiser leurs mots de passe.
          </p>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Collaborateurs de l'Établissement ({members.length})
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Profils ayant un accès configuré aux fonctionnalités RESTBAR PRO de cet établissement
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px]">
              {members.filter((m) => m.profile?.must_change_password).length} en attente 1ère connexion
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Collaborateur</th>
                <th className="py-3 px-4">Poste & Rôle Métier</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Statut & Sécurité</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMembers.map((member) => {
                const primaryRole = member.roles?.[0];
                const roleMeta = primaryRole ? ROLE_LABELS[primaryRole.code] : null;
                const mustChangePwd = Boolean(member.profile?.must_change_password);

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Nom + Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 shrink-0">
                          {member.profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-white tracking-tight flex items-center gap-1.5">
                            {member.profile?.full_name}
                            {member.profile?.is_super_admin && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                                SuperAdmin
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role Pill */}
                    <td className="py-3.5 px-4">
                      {roleMeta ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${roleMeta.badgeColor}`}
                        >
                          <Shield className="w-3 h-3" />
                          {roleMeta.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Sans rôle</span>
                      )}
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="space-y-0.5 text-[11px]">
                        {member.profile?.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{member.profile.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Non renseigné</span>
                        )}
                      </div>
                    </td>

                    {/* Status & Security Badge */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Désactivé
                          </span>
                        )}

                        {mustChangePwd ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                            <KeyRound className="w-2.5 h-2.5 text-amber-400" />
                            1ère connexion requise
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-[10px]">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            Mot de passe personnel
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions CRUD */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Voir */}
                        <button
                          title="Voir les détails"
                          onClick={() => setViewModalMember(member)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Partager les accès via WhatsApp */}
                        <button
                          title="Transmettre les identifiants par WhatsApp"
                          onClick={() => {
                            const roleName =
                              member.roles?.[0]?.name ||
                              'Collaborateur';
                            setWhatsappShareModalData({
                              fullName: member.profile?.full_name || 'Collaborateur',
                              email: member.profile?.email || '',
                              phone: member.profile?.phone || '',
                              establishmentName: session?.activeEstablishment?.name || 'Restaurant',
                              roleName: roleName,
                              tempPassword: member.profile?.temp_password || '',
                              mustChangePassword: Boolean(member.profile?.must_change_password),
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#25D366] hover:bg-emerald-950/40 transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Réinitialiser Mot de passe temporaire */}
                        {isManager && (
                          <button
                            title="Définir un nouveau mot de passe temporaire"
                            onClick={() => {
                              setResetPasswordMember(member);
                              setNewTempPassword(generateSecurePassword());
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}

                        {/* Modifier Rôle */}
                        {isManager && (
                          <button
                            title="Modifier le rôle"
                            onClick={() => {
                              setEditRoleMember(member);
                              setSelectedNewRoleId(member.roles?.[0]?.id || roles[0]?.id || '');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Activer / Désactiver */}
                        {isManager && (
                          <button
                            title={member.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                            onClick={() => setToggleConfirmMember(member)}
                            className={`p-1.5 rounded-lg transition ${
                              member.is_active
                                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30'
                            }`}
                          >
                            {member.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMembers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    {members.length === 0
                      ? 'Aucun collaborateur enregistré pour le moment.'
                      : 'Aucun collaborateur ne correspond aux critères de recherche.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL ARRANGÉ : AJOUTER UN COLLABORATEUR                            */}
      {/* ==================================================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
            {/* Header de la Modal Arrêté & Soigné */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-inner shrink-0 mt-0.5">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-xl font-black text-white tracking-tight">
                        Ajouter un Collaborateur
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300 font-semibold">
                        <Store className="w-3 h-3 text-amber-400" />
                        {session?.activeEstablishment?.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                          isLicenseFull
                            ? 'bg-rose-950/50 border-rose-500/30 text-rose-300'
                            : 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        {isLicenseFull
                          ? 'Quota atteint'
                          : `${maxAllowed - activeMembersCount} place(s) libre(s)`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Définissez les coordonnées, le poste métier et le mot de passe initial avec envoi direct par WhatsApp.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition border border-transparent hover:border-slate-700 shrink-0"
                  title="Fermer la fenêtre"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Étapes visuelles du processus d'intégration */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px]">
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-amber-500/30 flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span className="truncate">Profil & Contact</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-amber-500/30 flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span className="truncate">Poste Métier</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-amber-500/30 flex items-center gap-1.5 text-amber-300 font-medium">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span className="truncate">Accès & WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Quota Alert Strip if Full */}
            {isLicenseFull && (
              <div className="px-6 py-2.5 bg-rose-950/40 border-b border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  <strong>Limite de licence atteinte :</strong> {activeMembersCount} / {maxAllowed} utilisateurs actifs. Pour enregistrer ce collaborateur, désactivez un compte inactif ou demandez une extension de licence à l'administrateur.
                </span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-5 overflow-y-auto">
              {/* Nom Complet */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nom Complet du Collaborateur *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aminata Diallo ou Moussa Traoré"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Email & Téléphone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Professionnel *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="collaborateur@restaurant.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Numéro de Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+221 77 123 45 67"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Attribution du Poste & Rôle Métier */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Attribution du Poste Métier & Rôle *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {roles.map((r) => {
                    const isSelected = inviteRoleId === r.id;
                    const meta = ROLE_LABELS[r.code];

                    const roleIcon =
                      r.code === 'serveur' ? (
                        <Utensils className="w-4 h-4 text-blue-400" />
                      ) : r.code === 'barman' ? (
                        <Wine className="w-4 h-4 text-purple-400" />
                      ) : r.code === 'cuisine' ? (
                        <ChefHat className="w-4 h-4 text-emerald-400" />
                      ) : r.code === 'caisse' ? (
                        <CreditCard className="w-4 h-4 text-amber-400" />
                      ) : r.code === 'magasinier' ? (
                        <Boxes className="w-4 h-4 text-teal-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-amber-400" />
                      );

                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setInviteRoleId(r.id)}
                        className={`p-3 rounded-xl border text-left text-xs transition flex items-start gap-3 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/30'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/80'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                          {roleIcon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-xs">{r.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                            {r.description || meta?.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================ */}
              {/* SECTION SÉCURITÉ : MOT DE PASSE INITIAL & 1ÈRE CONNEXION     */}
              {/* ============================================================ */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Mot de passe initial & Première connexion
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Mot de passe temporaire pour le premier accès du collaborateur
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setInvitePassword(generateSecurePassword())}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1.5 transition"
                    title="Générer un mot de passe aléatoire"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Générer</span>
                  </button>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showInvitePassword ? 'text' : 'password'}
                      required
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Mot de passe initial (ex: RestBar2026!)"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl pl-10 pr-20 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none transition"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(invitePassword)}
                        className="p-1 rounded text-slate-400 hover:text-white transition"
                        title="Copier le mot de passe"
                      >
                        {hasCopiedPassword ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInvitePassword(!showInvitePassword)}
                        className="p-1 rounded text-slate-400 hover:text-white transition"
                        title={showInvitePassword ? 'Masquer' : 'Afficher'}
                      >
                        {showInvitePassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Checkbox Forcer le changement à la 1ère connexion */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={inviteMustChangePassword}
                    onChange={(e) => setInviteMustChangePassword(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="text-[11px]">
                    <span className="font-semibold text-slate-200">
                      Exiger la modification du mot de passe à la première connexion (Recommandé)
                    </span>
                    <p className="text-slate-400 mt-0.5 leading-relaxed">
                      Dès sa connexion, le collaborateur verra un écran obligatoire lui demandant de choisir son propre mot de passe secret avant d'accéder à son poste.
                    </p>
                  </div>
                </label>
              </div>

              {/* ============================================================ */}
              {/* SECTION TRANSMISSION WHATSAPP                                */}
              {/* ============================================================ */}
              <div className="p-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openWhatsappAfterCreate}
                    onChange={(e) => setOpenWhatsappAfterCreate(e.target.checked)}
                    className="mt-0.5 rounded border-emerald-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="text-[11px]">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-[#25D366]" />
                      Transmettre les accès par WhatsApp dès l'enregistrement
                    </span>
                    <p className="text-emerald-200/70 mt-0.5 leading-relaxed">
                      Génère instantanément le message WhatsApp officiel avec les identifiants complets : <strong>Login</strong>, <strong>mot de passe</strong>, <strong>établissement</strong>, <strong>nom</strong> et <strong>rôle</strong>.
                    </p>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-[11px] text-slate-500">
                  * Accès sécurisé et isolé à cet établissement
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition hover:bg-slate-800"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLicenseFull}
                    className={`px-5 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg ${
                      isLicenseFull
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'text-slate-950 bg-gradient-to-r from-amber-500 via-amber-400 to-[#25D366] hover:brightness-110 shadow-amber-950/40 active:scale-95'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Enregistrer & Préparer WhatsApp</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : RÉINITIALISER LE MOT DE PASSE TEMPORAIRE                    */}
      {/* ==================================================================== */}
      {resetPasswordMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setResetPasswordMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Nouveau mot de passe temporaire
                </h3>
                <p className="text-xs text-slate-400">
                  Pour {resetPasswordMember.profile?.full_name}
                </p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                Définissez un nouveau mot de passe temporaire. Le collaborateur devra obligatoirement le renouveler lors de sa prochaine connexion.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Mot de Passe Provisoire *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewTempPassword(generateSecurePassword())}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Générer</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={newTempPassword}
                    onChange={(e) => setNewTempPassword(e.target.value)}
                    placeholder="Mot de passe temporaire"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-10 pr-20 py-2.5 text-xs text-white font-mono focus:outline-none transition"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newTempPassword)}
                      className="p-1 rounded text-slate-400 hover:text-white transition"
                      title="Copier"
                    >
                      {hasCopiedPassword ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="p-1 rounded text-slate-400 hover:text-white transition"
                      title={showResetPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showResetPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetPasswordMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
                >
                  Attribuer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Voir Détails Collaborateur */}
      {viewModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setViewModalMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-lg">
                {viewModalMember.profile?.full_name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {viewModalMember.profile?.full_name}
                </h3>
                <p className="text-xs text-slate-400">{viewModalMember.profile?.email}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Poste & Rôle Actif :</span>
                <span className="font-semibold text-white">
                  {viewModalMember.roles?.[0]?.name || 'Non défini'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Statut du Compte :</span>
                <span
                  className={
                    viewModalMember.is_active
                      ? 'text-emerald-400 font-semibold'
                      : 'text-rose-400 font-semibold'
                  }
                >
                  {viewModalMember.is_active ? 'Actif' : 'Désactivé'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Sécurité du Mot de Passe :</span>
                <span className={viewModalMember.profile?.must_change_password ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                  {viewModalMember.profile?.must_change_password ? '1ère connexion requise' : 'Mot de passe personnel défini'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Téléphone :</span>
                <span className="text-white">
                  {viewModalMember.profile?.phone || 'Non renseigné'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Date d’intégration :</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {new Date(viewModalMember.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setViewModalMember(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Modifier le Rôle */}
      {editRoleMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setEditRoleMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Changer le rôle de {editRoleMember.profile?.full_name}
                </h3>
                <p className="text-xs text-slate-400">Sélectionnez le nouveau profil de droits</p>
              </div>
            </div>

            <div className="space-y-2 py-2">
              {roles.map((r) => {
                const isSelected = selectedNewRoleId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedNewRoleId(r.id)}
                    className={`w-full p-3 rounded-xl border text-left text-xs transition ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{r.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{r.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditRoleMember(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
              >
                Confirmer le nouveau rôle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal pour Activer / Désactiver */}
      <ConfirmModal
        isOpen={!!toggleConfirmMember}
        variant={toggleConfirmMember?.is_active ? 'danger' : 'info'}
        title={
          toggleConfirmMember?.is_active
            ? `Désactiver l'accès de ${toggleConfirmMember?.profile?.full_name} ?`
            : `Réactiver l'accès de ${toggleConfirmMember?.profile?.full_name} ?`
        }
        message={
          toggleConfirmMember?.is_active
            ? 'L’utilisateur ne pourra plus se connecter ni effectuer d’opérations dans cet établissement. Les données historiques restent préservées.'
            : 'L’utilisateur retrouvera immédiatement ses accès aux commandes et modules de l’établissement selon son rôle.'
        }
        confirmLabel={toggleConfirmMember?.is_active ? 'Désactiver' : 'Réactiver'}
        cancelLabel="Annuler"
        onConfirm={handleToggleStatus}
        onCancel={() => setToggleConfirmMember(null)}
      />

      {/* Modal de Transmission WhatsApp */}
      {whatsappShareModalData && (
        <WhatsappShareModal
          data={whatsappShareModalData}
          onClose={() => setWhatsappShareModalData(null)}
        />
      )}
    </div>
  );
};
