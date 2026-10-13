// RESTBAR PRO — Phase 2 POS, Production KDS, Billing, Stocks & Reports Service
import {
  Category,
  Destination,
  DiningTable,
  Expense,
  MenuItem,
  Order,
  OrderItem,
  OrderItemStatus,
  OrderStatus,
  Payment,
  PaymentMethod,
  PaymentStatus,
  RecipeIngredient,
  StockItem,
  StockMovement,
  TableStatus,
  Zone,
} from '../types/database';
import { db } from './databaseService';

// ============================================================================
// REALTIME EVENT BUS (Simule et orchestre Supabase Realtime Channels)
// ============================================================================

type PosEventType =
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_CANCELLED'
  | 'ITEM_STATUS_CHANGED'
  | 'BILL_REQUESTED'
  | 'PAYMENT_RECEIVED'
  | 'TABLE_UPDATED'
  | 'STOCK_UPDATED';

type EventListener = (payload: any) => void;

class RealtimeEventBus {
  private listeners: Map<PosEventType, Set<EventListener>> = new Map();

  public subscribe(event: PosEventType, callback: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  public emit(event: PosEventType, payload: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          console.error('Error in realtime event handler:', e);
        }
      });
    }
  }
}

export const realtimeBus = new RealtimeEventBus();

// ============================================================================
// DONNÉES INITIALES RÉALISTES PHASE 2 (Devise FCFA & Menus Professionnels)
// ============================================================================

const INITIAL_ZONES: Zone[] = [
  { id: 'zone_salle', establishment_id: 'est_bistrot_01', name: 'Salle Principale (Climatisée)', display_order: 1, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'zone_terrasse', establishment_id: 'est_bistrot_01', name: 'Terrasse Extérieure', display_order: 2, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'zone_vip', establishment_id: 'est_bistrot_01', name: 'Salon VIP / Mezzanine', display_order: 3, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'zone_bar', establishment_id: 'est_bistrot_01', name: 'Comptoir Bar', display_order: 4, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
];

const INITIAL_TABLES: DiningTable[] = [
  { id: 'tbl_01', establishment_id: 'est_bistrot_01', zone_id: 'zone_salle', table_number: 'T1', capacity: 4, status: 'libre', created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'tbl_02', establishment_id: 'est_bistrot_01', zone_id: 'zone_salle', table_number: 'T2', capacity: 2, status: 'occupee', current_order_id: 'ord_demo_01', created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'tbl_03', establishment_id: 'est_bistrot_01', zone_id: 'zone_salle', table_number: 'T3', capacity: 6, status: 'addition_demandee', current_order_id: 'ord_demo_02', created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'tbl_04', establishment_id: 'est_bistrot_01', zone_id: 'zone_terrasse', table_number: 'T4', capacity: 4, status: 'libre', created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'tbl_05', establishment_id: 'est_bistrot_01', zone_id: 'zone_terrasse', table_number: 'T5', capacity: 4, status: 'a_nettoyer', created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'tbl_06', establishment_id: 'est_bistrot_01', zone_id: 'zone_vip', table_number: 'VIP 1', capacity: 8, status: 'libre', created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'tbl_07', establishment_id: 'est_bistrot_01', zone_id: 'zone_bar', table_number: 'BAR 1', capacity: 1, status: 'libre', created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
];

const INITIAL_CATEGORIES: Category[] = [
  // BAR
  { id: 'cat_cocktails', establishment_id: 'est_bistrot_01', name: 'Cocktails Signature', destination: 'bar', icon: 'martini', display_order: 1, is_active: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'cat_bieres', establishment_id: 'est_bistrot_01', name: 'Bières & Cidres', destination: 'bar', icon: 'beer', display_order: 2, is_active: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'cat_softs', establishment_id: 'est_bistrot_01', name: 'Softs & Jus Frais', destination: 'bar', icon: 'glass', display_order: 3, is_active: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  // CUISINE
  { id: 'cat_entrees', establishment_id: 'est_bistrot_01', name: 'Entrées & Tapas', destination: 'cuisine', icon: 'utensils', display_order: 4, is_active: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'cat_grillades', establishment_id: 'est_bistrot_01', name: 'Grillades & Plats', destination: 'cuisine', icon: 'flame', display_order: 5, is_active: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'cat_desserts', establishment_id: 'est_bistrot_01', name: 'Desserts & Glaces', destination: 'cuisine', icon: 'cake', display_order: 6, is_active: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  // BAR
  { id: 'itm_mojito', establishment_id: 'est_bistrot_01', category_id: 'cat_cocktails', name: 'Mojito Passion', description: 'Rhum ambré, purée de fruit de la passion, menthe fraîche, citron vert', price: 4500, cost_price: 1200, destination: 'bar', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_pina', establishment_id: 'est_bistrot_01', category_id: 'cat_cocktails', name: 'Piña Colada Frappée', description: 'Rhum blanc, crème de coco, jus d’ananas frais', price: 5000, cost_price: 1400, destination: 'bar', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_gazelle', establishment_id: 'est_bistrot_01', category_id: 'cat_bieres', name: 'Bière Gazelle 65cl', description: 'Bière blonde locale très fraîche', price: 1500, cost_price: 750, destination: 'bar', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_heineken', establishment_id: 'est_bistrot_01', category_id: 'cat_bieres', name: 'Heineken 33cl', description: 'Bière blonde internationale', price: 2000, cost_price: 900, destination: 'bar', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_bissap', establishment_id: 'est_bistrot_01', category_id: 'cat_softs', name: 'Jus de Bissap Maison', description: 'Infusion d’hibiscus, menthe douce et vanille', price: 1200, cost_price: 300, destination: 'bar', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_coca', establishment_id: 'est_bistrot_01', category_id: 'cat_softs', name: 'Coca-Cola 33cl', description: 'Canette fraîche servie avec tranche de citron', price: 1000, cost_price: 450, destination: 'bar', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  // CUISINE
  { id: 'itm_brochettes', establishment_id: 'est_bistrot_01', category_id: 'cat_entrees', name: 'Brochettes de Filet de Bœuf (3 pcs)', description: 'Marinade aux épices suya et oignons rouges braisés', price: 4500, cost_price: 1800, destination: 'cuisine', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_pastels', establishment_id: 'est_bistrot_01', category_id: 'cat_entrees', name: 'Pastels au Poisson (6 pcs)', description: 'Beignets croustillants farcis au poisson et sauce tomate pimentée', price: 2500, cost_price: 700, destination: 'cuisine', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_dibiterie', establishment_id: 'est_bistrot_01', category_id: 'cat_grillades', name: 'Dibi d’Agneau Braisé au Feu de Bois', description: 'Agneau rôti minute servi avec oignons caramélisés et moutarde piquante', price: 6500, cost_price: 2800, destination: 'cuisine', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_yassa', establishment_id: 'est_bistrot_01', category_id: 'cat_grillades', name: 'Poulet Yassa Grillé', description: 'Cuisse de poulet fermier marinée au citron vert et oignons doux, riz blanc', price: 5500, cost_price: 2100, destination: 'cuisine', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_capitaine', establishment_id: 'est_bistrot_01', category_id: 'cat_grillades', name: 'Filet de Capitaine Braisé', description: 'Poisson frais du fleuve, aloco (bananes plantains) et sauce tartare', price: 7000, cost_price: 3200, destination: 'cuisine', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
  { id: 'itm_thiakry', establishment_id: 'est_bistrot_01', category_id: 'cat_desserts', name: 'Thiakry Gourmand à la Vanille', description: 'Couscous de mil fermenté, yaourt doux onctueux, muscade', price: 2000, cost_price: 600, destination: 'cuisine', is_available: true, created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z' },
];

const INITIAL_STOCK_ITEMS: StockItem[] = [
  { id: 'stk_rhum', establishment_id: 'est_bistrot_01', name: 'Rhum Blanc 1L', category: 'Alcools', unit: 'bouteille', current_quantity: 14, min_alert_threshold: 4, cost_per_unit: 9500, updated_at: '2025-01-10T09:00:00Z' },
  { id: 'stk_gazelle', establishment_id: 'est_bistrot_01', name: 'Casier Gazelle 65cl (12 bouteilles)', category: 'Bières', unit: 'casier', current_quantity: 8, min_alert_threshold: 3, cost_per_unit: 8000, updated_at: '2025-01-10T09:00:00Z' },
  { id: 'stk_agneau', establishment_id: 'est_bistrot_01', name: 'Épaule d’Agneau Fraîche', category: 'Viandes', unit: 'kg', current_quantity: 18.5, min_alert_threshold: 5, cost_per_unit: 4500, updated_at: '2025-01-10T09:00:00Z' },
  { id: 'stk_poulet', establishment_id: 'est_bistrot_01', name: 'Poulet Fermier Découpé', category: 'Viandes', unit: 'kg', current_quantity: 25, min_alert_threshold: 8, cost_per_unit: 3000, updated_at: '2025-01-10T09:00:00Z' },
  { id: 'stk_plantain', establishment_id: 'est_bistrot_01', name: 'Bananes Plantains Mûres (Aloco)', category: 'Légumes', unit: 'kg', current_quantity: 32, min_alert_threshold: 10, cost_per_unit: 800, updated_at: '2025-01-10T09:00:00Z' },
  { id: 'stk_hibiscus', establishment_id: 'est_bistrot_01', name: 'Fleurs de Bissap Séchées', category: 'Épicerie', unit: 'kg', current_quantity: 12, min_alert_threshold: 3, cost_per_unit: 1500, updated_at: '2025-01-10T09:00:00Z' },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_demo_01',
    establishment_id: 'est_bistrot_01',
    table_id: 'tbl_02',
    table_number: 'T2',
    server_id: 'usr_serveur_01',
    server_name: 'Claire Fontaine',
    order_number: 'CMD-1042',
    status: 'en_cours',
    subtotal: 11000,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 11000,
    total_paid: 0,
    balance_due: 11000,
    notes: 'Clients pressés',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord_demo_02',
    establishment_id: 'est_bistrot_01',
    table_id: 'tbl_03',
    table_number: 'T3',
    server_id: 'usr_serveur_01',
    server_name: 'Claire Fontaine',
    order_number: 'CMD-1043',
    status: 'addition_demandee',
    subtotal: 24500,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 24500,
    total_paid: 0,
    balance_due: 24500,
    bill_requested_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

const INITIAL_ORDER_ITEMS: OrderItem[] = [
  // Commande 1 (T2)
  {
    id: 'item_01',
    order_id: 'ord_demo_01',
    establishment_id: 'est_bistrot_01',
    menu_item_id: 'itm_mojito',
    item_name: 'Mojito Passion',
    quantity: 1,
    unit_price: 4500,
    total_price: 4500,
    destination: 'bar',
    status: 'pret',
    notes: 'Bien frais',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'item_02',
    order_id: 'ord_demo_01',
    establishment_id: 'est_bistrot_01',
    menu_item_id: 'itm_dibiterie',
    item_name: 'Dibi d’Agneau Braisé au Feu de Bois',
    quantity: 1,
    unit_price: 6500,
    total_price: 6500,
    destination: 'cuisine',
    status: 'en_preparation',
    notes: 'Moutarde à part',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  // Commande 2 (T3)
  {
    id: 'item_03',
    order_id: 'ord_demo_02',
    establishment_id: 'est_bistrot_01',
    menu_item_id: 'itm_gazelle',
    item_name: 'Bière Gazelle 65cl',
    quantity: 3,
    unit_price: 1500,
    total_price: 4500,
    destination: 'bar',
    status: 'servi',
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
  {
    id: 'item_04',
    order_id: 'ord_demo_02',
    establishment_id: 'est_bistrot_01',
    menu_item_id: 'itm_capitaine',
    item_name: 'Filet de Capitaine Braisé',
    quantity: 2,
    unit_price: 7000,
    total_price: 14000,
    destination: 'cuisine',
    status: 'servi',
    notes: 'Avec aloco bien doré',
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'item_05',
    order_id: 'ord_demo_02',
    establishment_id: 'est_bistrot_01',
    menu_item_id: 'itm_brochettes',
    item_name: 'Brochettes de Filet de Bœuf (3 pcs)',
    quantity: 1,
    unit_price: 4500,
    total_price: 4500,
    destination: 'cuisine',
    status: 'servi',
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: 'item_06',
    order_id: 'ord_demo_02',
    establishment_id: 'est_bistrot_01',
    menu_item_id: 'itm_bissap',
    item_name: 'Jus de Bissap Maison',
    quantity: 1,
    unit_price: 1500,
    total_price: 1500,
    destination: 'bar',
    status: 'servi',
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay_demo_01',
    establishment_id: 'est_bistrot_01',
    order_id: 'ord_archive_01',
    payment_method: 'wave',
    amount: 15000,
    currency: 'FCFA',
    reference_code: 'WAVE-TX-984421',
    status: 'verifie',
    cashier_id: 'usr_caissier_01',
    notes: 'Paiement Wave vérifié par SMS passerelle',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'pay_demo_02',
    establishment_id: 'est_bistrot_01',
    order_id: 'ord_archive_02',
    payment_method: 'orange_money',
    amount: 8500,
    currency: 'FCFA',
    reference_code: 'OM-SN-772109',
    status: 'verifie',
    cashier_id: 'usr_caissier_01',
    notes: 'Transaction Orange Money confirmée',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
];

const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp_01',
    establishment_id: 'est_bistrot_01',
    title: 'Achat de 4 sacs de glace en écailles',
    category: 'glace',
    amount: 4000,
    payment_method: 'especes',
    cashier_id: 'usr_caissier_01',
    receipt_reference: 'RECU-GLACE-104',
    notes: 'Pour le bar et le service du midi',
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

// ============================================================================
// MAGASIN DE DONNÉES PHASE 2 (PERSISTANCE LOCALE CONFORME SUPABASE)
// ============================================================================

class PosStore {
  private zones: Zone[] = [...INITIAL_ZONES];
  private tables: DiningTable[] = [...INITIAL_TABLES];
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private menuItems: MenuItem[] = [...INITIAL_MENU_ITEMS];
  private stockItems: StockItem[] = [...INITIAL_STOCK_ITEMS];
  private stockMovements: StockMovement[] = [];
  private orders: Order[] = [...INITIAL_ORDERS];
  private orderItems: OrderItem[] = [...INITIAL_ORDER_ITEMS];
  private payments: Payment[] = [...INITIAL_PAYMENTS];
  private expenses: Expense[] = [...INITIAL_EXPENSES];

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem('restbar_pos_store_v1');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.zones) this.zones = parsed.zones;
        if (parsed.tables) this.tables = parsed.tables;
        if (parsed.categories) this.categories = parsed.categories;
        if (parsed.menuItems) this.menuItems = parsed.menuItems;
        if (parsed.stockItems) this.stockItems = parsed.stockItems;
        if (parsed.stockMovements) this.stockMovements = parsed.stockMovements;
        if (parsed.orders) this.orders = parsed.orders;
        if (parsed.orderItems) this.orderItems = parsed.orderItems;
        if (parsed.payments) this.payments = parsed.payments;
        if (parsed.expenses) this.expenses = parsed.expenses;
      }
    } catch (e) {
      console.warn('Failed to load POS store:', e);
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('restbar_pos_store_v1', JSON.stringify({
        zones: this.zones,
        tables: this.tables,
        categories: this.categories,
        menuItems: this.menuItems,
        stockItems: this.stockItems,
        stockMovements: this.stockMovements,
        orders: this.orders,
        orderItems: this.orderItems,
        payments: this.payments,
        expenses: this.expenses,
      }));
    } catch (e) {
      console.warn('Failed to persist POS store:', e);
    }
  }

  // --- ZONES & TABLES ---
  public checkOperationalGuard(estId: string): void {
    const check = db.checkEstablishmentOperational(estId);
    if (!check.operational) {
      throw new Error(
        `[Contrôle de Licence] Opération refusée : ${check.reason || 'La licence de cet établissement n’est pas active.'}`
      );
    }
  }

  public getZones(estId: string): Zone[] {
    return this.zones.filter((z) => z.establishment_id === estId);
  }

  public getTables(estId: string, zoneId?: string): DiningTable[] {
    return this.tables
      .filter((t) => t.establishment_id === estId && (!zoneId || t.zone_id === zoneId))
      .map((t) => {
        const zone = this.zones.find((z) => z.id === t.zone_id);
        const current_order = t.current_order_id ? this.orders.find((o) => o.id === t.current_order_id) : undefined;
        return { ...t, zone, current_order };
      });
  }

  public createTable(estId: string, data: { table_number: string; capacity: number; zone_id?: string }): DiningTable {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const existing = this.tables.find((t) => t.establishment_id === estId && t.table_number.toLowerCase() === data.table_number.toLowerCase());
    if (existing) throw new Error(`Une table portant le numéro "${data.table_number}" existe déjà.`);

    const newTable: DiningTable = {
      id: `tbl_${Date.now()}`,
      establishment_id: estId,
      table_number: data.table_number,
      capacity: data.capacity || 4,
      zone_id: data.zone_id,
      status: 'libre',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.tables.push(newTable);
    this.persist();
    realtimeBus.emit('TABLE_UPDATED', newTable);
    return newTable;
  }

  public updateTableStatus(tableId: string, status: TableStatus): DiningTable {
    const table = this.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Table introuvable');
    table.status = status;
    table.updated_at = new Date().toISOString();
    this.persist();
    realtimeBus.emit('TABLE_UPDATED', table);
    return table;
  }

  public releaseTable(tableId: string, actorId: string): { success: boolean; message: string } {
    const table = this.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Table introuvable');

    if (table.current_order_id) {
      const order = this.orders.find((o) => o.id === table.current_order_id);
      if (order && order.status !== 'payee' && order.status !== 'annulee') {
        throw new Error(
          `Impossible de libérer la table ${table.table_number} : Le ticket ${order.order_number} n'est pas soldé (Reste à payer : ${order.balance_due.toLocaleString()} FCFA).`
        );
      }
    }

    table.status = 'libre';
    table.current_order_id = undefined;
    table.updated_at = new Date().toISOString();
    this.persist();
    realtimeBus.emit('TABLE_UPDATED', table);

    return { success: true, message: `Table ${table.table_number} libérée avec succès pour le prochain service.` };
  }

  // --- CARTE & ARTICLES ---
  public getCategories(estId: string): Category[] {
    return this.categories
      .filter((c) => c.establishment_id === estId)
      .sort((a, b) => a.display_order - b.display_order);
  }

  public getMenuItems(estId: string, categoryId?: string, destination?: Destination): MenuItem[] {
    return this.menuItems
      .filter(
        (m) =>
          m.establishment_id === estId &&
          (!categoryId || m.category_id === categoryId) &&
          (!destination || m.destination === destination)
      )
      .map((m) => {
        const category = this.categories.find((c) => c.id === m.category_id);
        return { ...m, category };
      });
  }

  public createMenuItem(estId: string, data: Omit<MenuItem, 'id' | 'created_at' | 'updated_at' | 'establishment_id'>): MenuItem {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const newItem: MenuItem = {
      ...data,
      id: `itm_${Date.now()}`,
      establishment_id: estId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.menuItems.push(newItem);
    this.persist();
    return newItem;
  }

  public toggleItemAvailability(itemId: string): MenuItem {
    const item = this.menuItems.find((m) => m.id === itemId);
    if (!item) throw new Error('Article introuvable');
    this.checkOperationalGuard(item.establishment_id);
    db.touchActivity(item.establishment_id);

    item.is_available = !item.is_available;
    item.updated_at = new Date().toISOString();
    this.persist();
    return item;
  }

  // --- COMMANDES & PRISE DE COMMANDE ---
  public getOrders(estId: string, status?: OrderStatus): Order[] {
    return this.orders
      .filter((o) => o.establishment_id === estId && (!status || o.status === status))
      .map((o) => {
        const items = this.orderItems.filter((i) => i.order_id === o.id);
        const payments = this.payments.filter((p) => p.order_id === o.id);
        const table = this.tables.find((t) => t.id === o.table_id);
        return { ...o, items, payments, table };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getOrderById(orderId: string): Order | undefined {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return undefined;
    const items = this.orderItems.filter((i) => i.order_id === order.id);
    const payments = this.payments.filter((p) => p.order_id === order.id);
    const table = this.tables.find((t) => t.id === order.table_id);
    return { ...order, items, payments, table };
  }

  public createOrder(
    estId: string,
    tableId: string,
    serverId: string,
    serverName: string,
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>,
    orderNotes?: string
  ): Order {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const table = this.tables.find((t) => t.id === tableId && t.establishment_id === estId);
    if (!table) throw new Error('Table introuvable');

    const orderNumber = `CMD-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord_${Date.now()}`;

    let subtotal = 0;
    const createdItems: OrderItem[] = [];

    items.forEach((itemInput) => {
      const menuItem = this.menuItems.find((m) => m.id === itemInput.menuItemId);
      if (!menuItem) return;

      const lineTotal = menuItem.price * itemInput.quantity;
      subtotal += lineTotal;

      const orderItem: OrderItem = {
        id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: orderId,
        establishment_id: estId,
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        quantity: itemInput.quantity,
        unit_price: menuItem.price,
        total_price: lineTotal,
        destination: menuItem.destination,
        status: 'envoye',
        notes: itemInput.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      createdItems.push(orderItem);
      this.orderItems.push(orderItem);
    });

    const newOrder: Order = {
      id: orderId,
      establishment_id: estId,
      table_id: table.id,
      table_number: table.table_number,
      server_id: serverId,
      server_name: serverName,
      order_number: orderNumber,
      status: 'en_cours',
      subtotal,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: subtotal,
      total_paid: 0,
      balance_due: subtotal,
      notes: orderNotes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: createdItems,
      table,
    };

    this.orders.unshift(newOrder);

    // Mettre à jour la table
    table.status = 'occupee';
    table.current_order_id = orderId;
    table.updated_at = new Date().toISOString();

    this.persist();

    // Émettre en temps réel pour Bar et Cuisine KDS
    realtimeBus.emit('ORDER_CREATED', newOrder);
    realtimeBus.emit('TABLE_UPDATED', table);

    return newOrder;
  }

  // --- KDS PRODUCTION (BAR & CUISINE) ---
  public getKdsItems(estId: string, destination: Destination): OrderItem[] {
    return this.orderItems
      .filter((i) => i.establishment_id === estId && i.destination === destination && i.status !== 'servi' && i.status !== 'annule')
      .map((i) => {
        const order = this.orders.find((o) => o.id === i.order_id);
        return {
          ...i,
          order_number: order?.order_number,
          table_number: order?.table_number,
          server_name: order?.server_name,
        } as any;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // --- HISTOIRE JOURNALIÈRE DES COMMANDES (BAR & CUISINE & DASHBOARD) ---
  public getDailyHistoryItems(estId: string, destination?: Destination): any[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.orderItems
      .filter((i) => {
        if (i.establishment_id !== estId) return false;
        if (destination && i.destination !== destination) return false;
        const itemDate = (i.created_at || '').slice(0, 10);
        return itemDate === today || (Date.now() - new Date(i.created_at).getTime()) < 24 * 3600 * 1000;
      })
      .map((i) => {
        const order = this.orders.find((o) => o.id === i.order_id);
        return {
          ...i,
          order_number: order?.order_number,
          table_number: order?.table_number,
          server_name: order?.server_name,
          order_created_at: order?.created_at,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getDailyOrderHistory(estId: string, filterDestination?: Destination): any[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.orders
      .filter((o) => {
        if (o.establishment_id !== estId) return false;
        const oDate = (o.created_at || '').slice(0, 10);
        return oDate === today || (Date.now() - new Date(o.created_at).getTime()) < 24 * 3600 * 1000;
      })
      .map((o) => {
        const allItems = this.orderItems.filter((i) => i.order_id === o.id);
        const barItems = allItems.filter((i) => i.destination === 'bar');
        const kitchenItems = allItems.filter((i) => i.destination === 'cuisine');
        const relevantItems = filterDestination
          ? allItems.filter((i) => i.destination === filterDestination)
          : allItems;
        return {
          ...o,
          items: relevantItems,
          allItems,
          barItemsCount: barItems.length,
          kitchenItemsCount: kitchenItems.length,
          barItemsReady: barItems.filter((i) => i.status === 'pret' || i.status === 'servi').length,
          kitchenItemsReady: kitchenItems.filter((i) => i.status === 'pret' || i.status === 'servi').length,
        };
      })
      .filter((o) => !filterDestination || o.items.length > 0)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getDailyKdsStats(estId: string, destination: Destination): {
    totalItems: number;
    servedItems: number;
    inProgressItems: number;
    cancelledItems: number;
    avgPrepMinutes: number;
  } {
    const items = this.getDailyHistoryItems(estId, destination);
    const served = items.filter((i) => i.status === 'servi');
    const inProgress = items.filter((i) => i.status === 'en_preparation' || i.status === 'pret' || i.status === 'envoye');
    const cancelled = items.filter((i) => i.status === 'annule');

    let totalDurationMs = 0;
    let timedCount = 0;
    served.forEach((i) => {
      if (i.served_at && i.created_at) {
        const diff = new Date(i.served_at).getTime() - new Date(i.created_at).getTime();
        if (diff > 0 && diff < 4 * 3600 * 1000) {
          totalDurationMs += diff;
          timedCount++;
        }
      }
    });

    const avgPrepMinutes = timedCount > 0 ? Math.max(1, Math.round(totalDurationMs / (timedCount * 60000))) : 0;

    return {
      totalItems: items.length,
      servedItems: served.length,
      inProgressItems: inProgress.length,
      cancelledItems: cancelled.length,
      avgPrepMinutes,
    };
  }

  public updateOrderItemStatus(itemId: string, newStatus: OrderItemStatus): OrderItem {
    const item = this.orderItems.find((i) => i.id === itemId);
    if (!item) throw new Error('Ligne de commande introuvable');

    this.checkOperationalGuard(item.establishment_id);
    db.touchActivity(item.establishment_id);

    item.status = newStatus;
    item.updated_at = new Date().toISOString();

    if (newStatus === 'en_preparation') item.preparation_started_at = new Date().toISOString();
    if (newStatus === 'pret') item.ready_at = new Date().toISOString();
    if (newStatus === 'servi') item.served_at = new Date().toISOString();

    this.persist();
    realtimeBus.emit('ITEM_STATUS_CHANGED', item);
    return item;
  }

  public cancelOrderItem(itemId: string, cancelReason: string, actorId: string): OrderItem {
    const item = this.orderItems.find((i) => i.id === itemId);
    if (!item) throw new Error('Ligne introuvable');

    this.checkOperationalGuard(item.establishment_id);
    db.touchActivity(item.establishment_id);

    item.status = 'annule';
    item.cancel_reason = cancelReason;
    item.cancelled_by = actorId;
    item.cancelled_at = new Date().toISOString();
    item.updated_at = new Date().toISOString();

    // Recalculer le total de la commande
    const order = this.orders.find((o) => o.id === item.order_id);
    if (order) {
      const activeLines = this.orderItems.filter((i) => i.order_id === order.id && i.status !== 'annule');
      const newSubtotal = activeLines.reduce((acc, curr) => acc + curr.total_price, 0);
      order.subtotal = newSubtotal;
      order.total_amount = Math.max(0, newSubtotal - order.discount_amount);
      order.balance_due = Math.max(0, order.total_amount - order.total_paid);
      order.updated_at = new Date().toISOString();
    }

    this.persist();
    realtimeBus.emit('ITEM_STATUS_CHANGED', item);
    return item;
  }

  public cancelOrder(estId: string, orderId: string, actorId: string, cancelReason: string): Order {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const order = this.orders.find((o) => o.id === orderId && o.establishment_id === estId);
    if (!order) throw new Error('Commande introuvable');

    if (order.status === 'payee') {
      throw new Error('Une commande déjà encaissée ne peut pas être annulée directement (utiliser remboursement).');
    }

    order.status = 'annulee';
    order.notes = order.notes ? `${order.notes} | Annulée: ${cancelReason}` : `Annulée: ${cancelReason}`;
    order.updated_at = new Date().toISOString();

    // Annuler tous les articles non servis
    const items = this.orderItems.filter((i) => i.order_id === order.id);
    items.forEach((item) => {
      item.status = 'annule';
      item.cancel_reason = cancelReason;
      item.cancelled_by = actorId;
      item.cancelled_at = new Date().toISOString();
      item.updated_at = new Date().toISOString();
    });

    // Libérer la table si associée
    if (order.table_id) {
      const table = this.tables.find((t) => t.id === order.table_id);
      if (table && table.current_order_id === order.id) {
        table.status = 'libre';
        table.current_order_id = undefined;
        table.updated_at = new Date().toISOString();
        realtimeBus.emit('TABLE_UPDATED', table);
      }
    }

    this.persist();
    realtimeBus.emit('ORDER_CANCELLED', { order, cancelReason });
    realtimeBus.emit('ORDER_UPDATED', order);
    return order;
  }

  // --- DEMANDES D'ADDITION ---
  public requestBill(estId: string, tableId: string, orderId: string, serverId: string): Order {
    const order = this.orders.find((o) => o.id === orderId && o.establishment_id === estId);
    if (!order) throw new Error('Commande introuvable');

    order.status = 'addition_demandee';
    order.bill_requested_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();

    const table = this.tables.find((t) => t.id === tableId);
    if (table) {
      table.status = 'addition_demandee';
      table.updated_at = new Date().toISOString();
      realtimeBus.emit('TABLE_UPDATED', table);
    }

    this.persist();
    realtimeBus.emit('BILL_REQUESTED', { order, table });
    return order;
  }

  // --- CAISSE & PAIEMENTS (TRANSACTION ATOMIQUE & CONCURRENCE) ---
  public processPayment(
    estId: string,
    orderId: string,
    cashierId: string,
    paymentMethod: PaymentMethod,
    amount: number,
    referenceCode?: string,
    notes?: string
  ): { payment: Payment; order: Order; isFullyPaid: boolean } {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const order = this.orders.find((o) => o.id === orderId && o.establishment_id === estId);
    if (!order) throw new Error('Commande introuvable');

    if (order.status === 'payee') {
      throw new Error(`Contrôle d'intégrité : Le ticket ${order.order_number} a déjà été intégralement réglé.`);
    }

    if (amount <= 0) {
      throw new Error('Le montant du règlement doit être supérieur à zéro.');
    }

    // Détermination statut paiement (Wave / Orange Money nécessitent validation référence)
    let paymentStatus: PaymentStatus = 'verifie';
    if ((paymentMethod === 'wave' || paymentMethod === 'orange_money') && (!referenceCode || referenceCode.trim().length < 4)) {
      paymentStatus = 'declare'; // Reste déclaré tant que la référence n'a pas été fournie
    }

    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      establishment_id: estId,
      order_id: order.id,
      payment_method: paymentMethod,
      amount,
      currency: 'FCFA',
      reference_code: referenceCode,
      status: paymentStatus,
      cashier_id: cashierId,
      notes,
      created_at: new Date().toISOString(),
    };

    this.payments.push(payment);

    // Mise à jour atomique du solde
    order.total_paid += amount;
    order.balance_due = Math.max(0, order.total_amount - order.total_paid);

    const isFullyPaid = order.balance_due <= 0;
    if (isFullyPaid) {
      order.status = 'payee';
      order.paid_at = new Date().toISOString();

      // Libérer ou marquer la table à nettoyer
      if (order.table_id) {
        const table = this.tables.find((t) => t.id === order.table_id);
        if (table) {
          table.status = 'a_nettoyer';
          table.current_order_id = undefined;
          table.updated_at = new Date().toISOString();
          realtimeBus.emit('TABLE_UPDATED', table);
        }
      }
    }

    order.updated_at = new Date().toISOString();

    this.persist();
    realtimeBus.emit('PAYMENT_RECEIVED', { payment, order, isFullyPaid });

    return { payment, order, isFullyPaid };
  }

  public getPayments(estId: string): Payment[] {
    return this.payments
      .filter((p) => p.establishment_id === estId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- DÉPENSES ---
  public getExpenses(estId: string, callingUserId?: string): Expense[] {
    if (callingUserId) {
      const profile = db.getProfileById(callingUserId);
      db.verifyFinancialAccess(callingUserId, !!profile?.is_super_admin, estId, 'expenses');
    }
    return this.expenses
      .filter((e) => e.establishment_id === estId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createExpense(estId: string, cashierId: string, data: Omit<Expense, 'id' | 'created_at' | 'establishment_id' | 'cashier_id'>): Expense {
    const profile = db.getProfileById(cashierId);
    db.verifyFinancialAccess(cashierId, !!profile?.is_super_admin, estId, 'expenses');
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const expense: Expense = {
      ...data,
      id: `exp_${Date.now()}`,
      establishment_id: estId,
      cashier_id: cashierId,
      created_at: new Date().toISOString(),
    };
    this.expenses.unshift(expense);
    this.persist();
    return expense;
  }

  // --- EXPORT & RESTAURATION SAUVEGARDE COMPLÈTE ---
  public getEstablishmentDump(estId: string) {
    return {
      zones: this.zones.filter(z => z.establishment_id === estId),
      tables: this.tables.filter(t => t.establishment_id === estId),
      categories: this.categories.filter(c => c.establishment_id === estId),
      menuItems: this.menuItems.filter(m => m.establishment_id === estId),
      stockItems: this.stockItems.filter(s => s.establishment_id === estId),
      orders: this.orders.filter(o => o.establishment_id === estId),
      orderItems: this.orderItems.filter(i => i.establishment_id === estId),
      payments: this.payments.filter(p => p.establishment_id === estId),
      expenses: this.expenses.filter(e => e.establishment_id === estId),
    };
  }

  public restoreEstablishmentDump(estId: string, dump: any) {
    if (!dump) return;
    if (dump.zones) this.zones = this.zones.filter(z => z.establishment_id !== estId).concat(dump.zones);
    if (dump.tables) this.tables = this.tables.filter(t => t.establishment_id !== estId).concat(dump.tables);
    if (dump.categories) this.categories = this.categories.filter(c => c.establishment_id !== estId).concat(dump.categories);
    if (dump.menuItems) this.menuItems = this.menuItems.filter(m => m.establishment_id !== estId).concat(dump.menuItems);
    if (dump.stockItems) this.stockItems = this.stockItems.filter(s => s.establishment_id !== estId).concat(dump.stockItems);
    if (dump.orders) this.orders = this.orders.filter(o => o.establishment_id !== estId).concat(dump.orders);
    if (dump.orderItems) this.orderItems = this.orderItems.filter(i => i.establishment_id !== estId).concat(dump.orderItems);
    if (dump.payments) this.payments = this.payments.filter(p => p.establishment_id !== estId).concat(dump.payments);
    if (dump.expenses) this.expenses = this.expenses.filter(e => e.establishment_id !== estId).concat(dump.expenses);
    this.persist();
  }

  // --- STOCKS & INVENTAIRE ---
  public getStockItems(estId: string): StockItem[] {
    return this.stockItems.filter((s) => s.establishment_id === estId);
  }

  public getStockMovements(estId: string, stockItemId?: string): StockMovement[] {
    return this.stockMovements
      .filter((m) => m.establishment_id === estId && (!stockItemId || m.stock_item_id === stockItemId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createStockItem(
    estId: string,
    data: {
      name: string;
      category: string;
      current_quantity: number;
      unit: string;
      min_alert_threshold: number;
      cost_per_unit: number;
    }
  ): StockItem {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const newItem: StockItem = {
      id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      establishment_id: estId,
      name: data.name,
      category: data.category,
      current_quantity: data.current_quantity,
      unit: data.unit,
      min_alert_threshold: data.min_alert_threshold,
      cost_per_unit: data.cost_per_unit,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.stockItems.unshift(newItem);
    this.persist();
    realtimeBus.emit('STOCK_UPDATED', newItem);
    return newItem;
  }

  public updateStockItem(
    estId: string,
    stockItemId: string,
    updates: Partial<Pick<StockItem, 'name' | 'category' | 'unit' | 'min_alert_threshold' | 'cost_per_unit'>>
  ): StockItem {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const item = this.stockItems.find((s) => s.id === stockItemId && s.establishment_id === estId);
    if (!item) throw new Error('Article de stock introuvable');

    Object.assign(item, updates, { updated_at: new Date().toISOString() });
    this.persist();
    realtimeBus.emit('STOCK_UPDATED', item);
    return item;
  }

  public deleteStockItem(estId: string, stockItemId: string): void {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const index = this.stockItems.findIndex((s) => s.id === stockItemId && s.establishment_id === estId);
    if (index === -1) throw new Error('Article de stock introuvable');

    this.stockItems.splice(index, 1);
    this.persist();
    realtimeBus.emit('STOCK_UPDATED', { id: stockItemId, deleted: true });
  }

  public recordStockMovement(
    estId: string,
    stockItemId: string,
    actorId: string,
    type: 'entree' | 'sortie_perte' | 'inventaire',
    quantity: number,
    reason: string
  ): StockMovement {
    const stockItem = this.stockItems.find((s) => s.id === stockItemId && s.establishment_id === estId);
    if (!stockItem) throw new Error('Article de stock introuvable');

    const prevQty = stockItem.current_quantity;
    let newQty = prevQty;

    if (type === 'entree') newQty = prevQty + quantity;
    if (type === 'sortie_perte') newQty = Math.max(0, prevQty - quantity);
    if (type === 'inventaire') newQty = quantity;

    stockItem.current_quantity = newQty;
    stockItem.updated_at = new Date().toISOString();

    const movement: StockMovement = {
      id: `mv_${Date.now()}`,
      establishment_id: estId,
      stock_item_id: stockItemId,
      movement_type: type,
      quantity,
      previous_quantity: prevQty,
      new_quantity: newQty,
      unit_cost: stockItem.cost_per_unit,
      reason,
      actor_id: actorId,
      created_at: new Date().toISOString(),
      stock_item: stockItem,
    };

    this.stockMovements.unshift(movement);
    this.persist();
    realtimeBus.emit('STOCK_UPDATED', stockItem);
    return movement;
  }

  public updateStockMovement(
    estId: string,
    movementId: string,
    updates: { quantity?: number; reason?: string }
  ): StockMovement {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const movement = this.stockMovements.find((m) => m.id === movementId && m.establishment_id === estId);
    if (!movement) throw new Error('Mouvement de stock introuvable');

    const stockItem = this.stockItems.find((s) => s.id === movement.stock_item_id && s.establishment_id === estId);
    if (!stockItem) throw new Error('Article associé introuvable');

    if (updates.quantity !== undefined && !isNaN(Number(updates.quantity))) {
      const oldQty = movement.quantity;
      const newQty = Math.max(0, Number(updates.quantity));
      const diff = newQty - oldQty;

      if (movement.movement_type === 'entree') {
        stockItem.current_quantity = Math.max(0, stockItem.current_quantity + diff);
      } else if (movement.movement_type === 'sortie_perte') {
        stockItem.current_quantity = Math.max(0, stockItem.current_quantity - diff);
      } else if (movement.movement_type === 'inventaire') {
        stockItem.current_quantity = newQty;
      }
      movement.quantity = newQty;
      movement.new_quantity = stockItem.current_quantity;
      stockItem.updated_at = new Date().toISOString();
    }

    if (updates.reason !== undefined) {
      movement.reason = updates.reason.trim();
    }

    this.persist();
    realtimeBus.emit('STOCK_UPDATED', stockItem);
    return movement;
  }

  public deleteStockMovement(estId: string, movementId: string): void {
    this.checkOperationalGuard(estId);
    db.touchActivity(estId);

    const index = this.stockMovements.findIndex((m) => m.id === movementId && m.establishment_id === estId);
    if (index === -1) throw new Error('Mouvement de stock introuvable');

    const movement = this.stockMovements[index];
    const stockItem = this.stockItems.find((s) => s.id === movement.stock_item_id && s.establishment_id === estId);

    if (stockItem) {
      // Annule l'impact du mouvement sur le stock actuel
      if (movement.movement_type === 'entree') {
        stockItem.current_quantity = Math.max(0, stockItem.current_quantity - movement.quantity);
      } else if (movement.movement_type === 'sortie_perte') {
        stockItem.current_quantity = stockItem.current_quantity + movement.quantity;
      } else if (movement.movement_type === 'inventaire') {
        stockItem.current_quantity = movement.previous_quantity;
      }
      stockItem.updated_at = new Date().toISOString();
    }

    this.stockMovements.splice(index, 1);
    this.persist();
    if (stockItem) {
      realtimeBus.emit('STOCK_UPDATED', stockItem);
    }
  }

  // --- RAPPORTS DE VENTES ---
  public getSalesReport(estId: string, callingUserId?: string) {
    if (callingUserId) {
      const profile = db.getProfileById(callingUserId);
      db.verifyFinancialAccess(callingUserId, !!profile?.is_super_admin, estId, 'reports');
    }

    const orders = this.orders.filter((o) => o.establishment_id === estId && o.status === 'payee');
    const payments = this.payments.filter((p) => p.establishment_id === estId && p.status === 'verifie');

    const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

    const revenueByMethod = {
      especes: payments.filter((p) => p.payment_method === 'especes').reduce((acc, p) => acc + p.amount, 0),
      wave: payments.filter((p) => p.payment_method === 'wave').reduce((acc, p) => acc + p.amount, 0),
      orange_money: payments.filter((p) => p.payment_method === 'orange_money').reduce((acc, p) => acc + p.amount, 0),
      carte_bancaire: payments.filter((p) => p.payment_method === 'carte_bancaire').reduce((acc, p) => acc + p.amount, 0),
    };

    // Répartition Bar vs Cuisine
    let barRevenue = 0;
    let kitchenRevenue = 0;
    const paidOrderIds = orders.map((o) => o.id);

    this.orderItems.forEach((i) => {
      if (paidOrderIds.includes(i.order_id) && i.status !== 'annule') {
        if (i.destination === 'bar') barRevenue += i.total_price;
        if (i.destination === 'cuisine') kitchenRevenue += i.total_price;
      }
    });

    const expensesTotal = this.expenses
      .filter((e) => e.establishment_id === estId)
      .reduce((acc, e) => acc + e.amount, 0);

    return {
      totalRevenue,
      netCashInTill: revenueByMethod.especes - expensesTotal,
      ordersCount: orders.length,
      revenueByMethod,
      barRevenue,
      kitchenRevenue,
      expensesTotal,
    };
  }
}

export const posStore = new PosStore();
