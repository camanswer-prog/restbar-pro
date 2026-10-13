// RESTBAR PRO — Permissions & Role Checking Helper
import { CurrentUserSession, Permission, RoleCode } from '../types/database';

export const SYSTEM_PERMISSIONS: Permission[] = [
  // Commandes & Salle
  { id: 'p_ord_view', code: 'orders.view', name: 'Consulter les commandes', category: 'orders', description: 'Visualiser les tickets de caisse et commandes en cours', created_at: '' },
  { id: 'p_ord_create', code: 'orders.create', name: 'Créer des commandes', category: 'orders', description: 'Prendre des commandes en salle ou au comptoir', created_at: '' },
  { id: 'p_ord_mod', code: 'orders.modify', name: 'Modifier les commandes', category: 'orders', description: 'Ajouter/retirer des articles sur une commande existante', created_at: '' },
  { id: 'p_ord_cancel', code: 'orders.cancel', name: 'Annuler des commandes', category: 'orders', description: 'Annuler une commande avec motif obligatoire', created_at: '' },

  // Tables & Zones
  { id: 'p_tbl_view', code: 'tables.view', name: 'Plan de salle & Tables', category: 'tables', description: 'Accès visuel à la disposition et statut des tables', created_at: '' },
  { id: 'p_tbl_man', code: 'tables.manage', name: 'Gérer les tables & zones', category: 'tables', description: 'Créer, modifier, attribuer ou libérer des tables', created_at: '' },

  // Additions
  { id: 'p_bil_req', code: 'bills.request', name: "Demander l'addition", category: 'billing', description: 'Signaler une demande d’addition vers la caisse', created_at: '' },

  // Cuisine (KDS)
  { id: 'p_kit_man', code: 'kitchen.orders.manage', name: 'Gérer la production cuisine', category: 'kitchen', description: 'Contrôler le flux des commandes plats et entrées', created_at: '' },
  { id: 'p_kit_view', code: 'kitchen.kds_view', name: 'Écran Cuisine (KDS)', category: 'kitchen', description: 'Visualiser les bons envoyés en production cuisine', created_at: '' },
  { id: 'p_kit_act', code: 'kitchen.kds_action', name: 'Valider plats prêts', category: 'kitchen', description: 'Marquer les commandes comme prêtes ou servies', created_at: '' },

  // Bar (KDS)
  { id: 'p_bar_man', code: 'bar.orders.manage', name: 'Gérer les commandes bar', category: 'bar', description: 'Contrôler la file des boissons et cocktails', created_at: '' },
  { id: 'p_bar_view', code: 'bar.kds_view', name: 'Écran Bar (KDS)', category: 'bar', description: 'Visualiser les bons boissons et cocktails', created_at: '' },
  { id: 'p_bar_act', code: 'bar.kds_action', name: 'Valider boissons prêtes', category: 'bar', description: 'Marquer les boissons préparées', created_at: '' },

  // Caisse, Paiements & Facturation
  { id: 'p_pay_view', code: 'payments.view', name: 'Consulter les encaissements', category: 'billing', description: 'Visualiser les transactions et paiements enregistrés', created_at: '' },
  { id: 'p_pay_create', code: 'payments.create', name: 'Encaisser les paiements', category: 'billing', description: 'Enregistrer règlements Espèces, Wave, Orange Money', created_at: '' },
  { id: 'p_pay_ref', code: 'payments.refund', name: 'Rembourser / Annuler paiement', category: 'billing', description: 'Gérer les remboursements et annulations d’encaissement', created_at: '' },
  { id: 'p_rec_print', code: 'receipts.print', name: 'Imprimer les reçus & tickets', category: 'billing', description: 'Génération et impression des tickets thermiques', created_at: '' },
  { id: 'p_bil_close', code: 'billing.close_till', name: 'Clôture de caisse (Z)', category: 'billing', description: 'Édition du rapport Z de fin de service', created_at: '' },
  { id: 'p_bil_pay', code: 'billing.payment', name: 'Encaisser les clients (Legacy)', category: 'billing', description: 'Accepter paiements CB, espèces, tickets resto', created_at: '' },
  { id: 'p_bil_disc', code: 'billing.discounts', name: 'Appliquer des remises', category: 'billing', description: 'Accorder des rabais ou offerts sur un ticket', created_at: '' },
  { id: 'p_bil_ref_legacy', code: 'billing.refund', name: 'Rembourser / Annuler (Legacy)', category: 'billing', description: 'Gérer les annulations de transaction', created_at: '' },

  // Stocks & Ingrédients (Module Magasinier)
  { id: 'p_stk_view', code: 'stock.view', name: 'Consulter les stocks', category: 'stock', description: 'Visualiser l’état des stocks et alertes de seuil', created_at: '' },
  { id: 'p_stk_man', code: 'stock.manage', name: 'Gérer les stocks & inventaire', category: 'stock', description: 'Entrées, sorties, mouvements et seuils d’alerte', created_at: '' },
  { id: 'p_stk_mov_view', code: 'stock.movements.view', name: 'Consulter l’historique des mouvements', category: 'stock', description: 'Consulter les entrées, sorties et ajustements de stock', created_at: '' },
  { id: 'p_stk_mov_create', code: 'stock.movements.create', name: 'Enregistrer des mouvements (Entrées/Sorties)', category: 'stock', description: 'Créer des mouvements de réception ou de sortie', created_at: '' },
  { id: 'p_stk_mov_mod', code: 'stock.movements.update', name: 'Modifier des mouvements de stock', category: 'stock', description: 'Rectifier la quantité ou le motif d’un mouvement existant', created_at: '' },
  { id: 'p_stk_mov_del', code: 'stock.movements.delete', name: 'Supprimer des mouvements de stock', category: 'stock', description: 'Supprimer un mouvement erroné et réajuster le stock', created_at: '' },

  // Utilisateurs & Équipe
  { id: 'p_usr_view', code: 'users.view', name: 'Voir les utilisateurs', category: 'staff', description: 'Consulter la liste des comptes et employés', created_at: '' },
  { id: 'p_usr_create', code: 'users.create', name: 'Créer des utilisateurs', category: 'staff', description: 'Créer de nouveaux comptes collaborateurs', created_at: '' },
  { id: 'p_usr_update', code: 'users.update', name: 'Modifier les utilisateurs', category: 'staff', description: 'Mettre à jour les informations des membres', created_at: '' },
  { id: 'p_usr_disable', code: 'users.disable', name: 'Désactiver des comptes', category: 'staff', description: 'Suspendre ou réactiver l’accès d’un utilisateur', created_at: '' },
  { id: 'p_stf_view', code: 'staff.view', name: 'Voir le personnel (Legacy)', category: 'staff', description: 'Consulter la liste des employés de l’établissement', created_at: '' },
  { id: 'p_stf_man', code: 'staff.manage', name: 'Gérer les membres (Legacy)', category: 'staff', description: 'Créer, inviter, activer ou désactiver les membres', created_at: '' },
  { id: 'p_rol_man', code: 'roles.manage', name: 'Gérer les rôles & permissions', category: 'staff', description: 'Modifier la matrice des droits et rôles', created_at: '' },
  { id: 'p_stf_rol', code: 'staff.roles', name: 'Gérer rôles & permissions (Legacy)', category: 'staff', description: 'Modifier la matrice des droits de l’établissement', created_at: '' },

  // Rapports & Chiffre d'Affaires
  { id: 'p_rep_view', code: 'reports.view', name: 'Consulter les rapports de ventes', category: 'reports', description: 'Accès aux synthèses et statistiques de vente', created_at: '' },
  { id: 'p_rep_day', code: 'reports.view_daily', name: 'Rapport du jour (Z)', category: 'reports', description: 'Consulter le CA journalier et les ventes', created_at: '' },
  { id: 'p_rep_adv', code: 'reports.view_advanced', name: 'Analyses financières avancées', category: 'reports', description: 'Marges, analytics horaires, export comptable', created_at: '' },

  // Paramètres
  { id: 'p_set_view', code: 'settings.view', name: 'Voir les paramètres', category: 'settings', description: 'Consulter la configuration de l’établissement', created_at: '' },
  { id: 'p_set_man', code: 'settings.manage', name: 'Modifier les paramètres', category: 'settings', description: 'Taux de TVA, horaires, imprimantes, coordonnées', created_at: '' },

  // Licences
  { id: 'p_lic_man', code: 'licenses.manage', name: 'Gestion des licences PRO', category: 'licenses', description: 'Activer et renouveler la licence établissement', created_at: '' },
];

export const ROLE_LABELS: Record<string, { label: string; badgeColor: string; description: string }> = {
  gerant: {
    label: 'Gérant',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Administration complète du bar/restaurant et de l’équipe',
  },
  serveur: {
    label: 'Serveur / Salle',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    description: 'Prise de commandes, suivi des tables et encaissement',
  },
  barman: {
    label: 'Barman',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    description: 'Écran bar, préparation des boissons et cocktails',
  },
  cuisine: {
    label: 'Chef / Cuisine',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Écran KDS cuisine et gestion des sorties de plats',
  },
  caissier: {
    label: 'Caissier',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    description: 'Gestion du tiroir-caisse, encaissements et clôture Z',
  },
  magasinier: {
    label: 'Magasinier',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    description: 'Accès exclusif au module des stocks : entrées, sorties, consultation, modification et suppression des mouvements',
  },
};

/**
 * Alias et correspondances hiérarchiques de permissions
 */
const PERMISSION_ALIASES: Record<string, string[]> = {
  'users.view': ['staff.view'],
  'staff.view': ['users.view'],
  'users.create': ['staff.manage'],
  'users.update': ['staff.manage'],
  'users.disable': ['staff.manage'],
  'staff.manage': ['users.create', 'users.update', 'users.disable'],
  'roles.manage': ['staff.roles'],
  'staff.roles': ['roles.manage'],
  'payments.create': ['billing.payment'],
  'billing.payment': ['payments.create'],
  'payments.view': ['billing.payment', 'billing.close_till'],
  'payments.refund': ['billing.refund'],
  'billing.refund': ['payments.refund'],
  'receipts.print': ['billing.payment', 'billing.close_till', 'orders.view'],
  'bills.request': ['orders.view', 'tables.view'],
  'bar.orders.manage': ['bar.kds_view', 'bar.kds_action'],
  'kitchen.orders.manage': ['kitchen.kds_view', 'kitchen.kds_action'],
  'reports.view': ['reports.view_daily', 'reports.view_advanced'],
  'stock.manage': ['stock.view', 'stock.movements.view', 'stock.movements.create', 'stock.movements.update', 'stock.movements.delete'],
  'stock.view': ['stock.manage', 'stock.movements.view'],
};

/**
 * Vérifie si la session courante détient une permission donnée
 */
export function hasPermission(session: CurrentUserSession | null, permissionCode: string): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  if (hasRole(session, 'gerant')) {
    // Le gérant possède tous les droits de gestion de son établissement sauf gestion globale des licences
    if (permissionCode === 'licenses.manage_global') return false;
    return true;
  }
  if (session.permissions.includes(permissionCode)) return true;

  // Vérification des alias
  const aliases = PERMISSION_ALIASES[permissionCode];
  if (aliases && aliases.some((alias) => session.permissions.includes(alias))) {
    return true;
  }

  return false;
}

/**
 * Vérifie si la session détient un rôle particulier
 */
export function hasRole(session: CurrentUserSession | null, roleCode: RoleCode | string): boolean {
  if (!session) return false;
  if (session.isSuperAdmin && roleCode === 'super_admin') return true;
  return session.roles.some((r) => r.code === roleCode);
}

/**
 * Vérifie si l'utilisateur connecté peut gérer les membres (Gérant ou Super Admin)
 */
export function canManageStaff(session: CurrentUserSession | null): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return hasPermission(session, 'staff.manage') || hasRole(session, 'gerant');
}

/**
 * Vérifie si l'utilisateur peut accéder au module de gestion des stocks
 */
export function canAccessStock(session: CurrentUserSession | null): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return (
    hasRole(session, 'magasinier') ||
    hasRole(session, 'gerant') ||
    hasPermission(session, 'stock.manage') ||
    hasPermission(session, 'stock.view')
  );
}

/**
 * Vérifie si l'utilisateur peut gérer (créer, modifier, supprimer) les mouvements de stock
 */
export function canManageStockMovements(session: CurrentUserSession | null): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return (
    hasRole(session, 'magasinier') ||
    hasRole(session, 'gerant') ||
    hasPermission(session, 'stock.manage') ||
    hasPermission(session, 'stock.movements.create')
  );
}
