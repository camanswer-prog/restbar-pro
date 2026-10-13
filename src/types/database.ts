// RESTBAR PRO — Database & Application Type Definitions

export type EstablishmentStatus = 'active' | 'suspended' | 'trial' | 'closed';
export type LicensePlanType = 'starter' | 'pro' | 'enterprise' | 'trial';
export type LicenseStatus = 'active' | 'en_attente' | 'suspendue' | 'expiree' | 'expired' | 'revoked' | 'pending';

export type RoleCode = 'gerant' | 'serveur' | 'barman' | 'cuisine' | 'caissier' | 'magasinier';

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  legal_name?: string;
  vat_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  currency: string;
  timezone: string;
  status: EstablishmentStatus;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  is_super_admin: boolean;
  is_active: boolean;
  must_change_password?: boolean;
  temp_password?: string;
  created_at: string;
  updated_at: string;
}

export interface EstablishmentMember {
  id: string;
  establishment_id: string;
  profile_id: string;
  is_active: boolean;
  invited_by?: string;
  created_at: string;
  updated_at: string;
  // Joins
  profile?: Profile;
  roles?: Role[];
}

export interface Role {
  id: string;
  establishment_id?: string | null;
  name: string;
  code: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  category: 'orders' | 'tables' | 'kitchen' | 'bar' | 'billing' | 'staff' | 'reports' | 'settings' | 'licenses' | 'stock';
  description?: string;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  establishment_member_id: string;
  role_id: string;
  assigned_by?: string;
  created_at: string;
}

export interface LicenseFeatures {
  kds: boolean;
  multi_tills: boolean;
  advanced_reports: boolean;
  inventory: boolean;
  reservations?: boolean;
}

export interface License {
  id: string;
  establishment_id: string;
  license_key: string;
  plan_type: LicensePlanType;
  status: LicenseStatus;
  max_users: number;
  max_registers: number;
  starts_at: string;
  expires_at: string;
  features: LicenseFeatures;
  signature: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  establishment?: {
    name: string;
    slug?: string;
  };
}

export interface OpeningHoursDay {
  open: string;
  close: string;
  closed?: boolean;
}

export interface OpeningHours {
  monday: OpeningHoursDay;
  tuesday: OpeningHoursDay;
  wednesday: OpeningHoursDay;
  thursday: OpeningHoursDay;
  friday: OpeningHoursDay;
  saturday: OpeningHoursDay;
  sunday: OpeningHoursDay;
}

export interface EstablishmentSettings {
  establishment_id: string;
  vat_rate: number;
  service_charge_rate: number;
  currency_symbol: string;
  opening_hours: OpeningHours;
  order_ticket_footer: string;
  sound_notifications: boolean;
  realtime_kds: boolean;
  auto_close_orders: boolean;
  kitchen_display_columns: number;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  establishment_id?: string | null;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
  actor?: Profile;
  establishment?: Establishment;
}

export interface CurrentUserSession {
  user: Profile;
  activeEstablishment?: Establishment;
  memberships: EstablishmentMember[];
  activeMembership?: EstablishmentMember;
  roles: Role[];
  permissions: string[];
  activeLicense?: License;
  isSuperAdmin: boolean;
  mustChangePassword?: boolean;
}

// ============================================================================
// TYPES MÉTIER PHASE 2 : TABLES, CARTE, COMMANDES, PRODUCTION, CAISSE & STOCKS
// ============================================================================

export type TableStatus = 'libre' | 'occupee' | 'addition_demandee' | 'a_nettoyer';
export type Destination = 'bar' | 'cuisine';
export type OrderStatus = 'en_cours' | 'addition_demandee' | 'payee' | 'annulee';
export type OrderItemStatus = 'envoye' | 'en_preparation' | 'pret' | 'servi' | 'annule';
export type PaymentMethod = 'especes' | 'wave' | 'orange_money' | 'carte_bancaire';
export type PaymentStatus = 'declare' | 'verifie' | 'rejete';
export type StockMovementType = 'entree' | 'sortie_perte' | 'vente_automatique' | 'inventaire';

export interface Zone {
  id: string;
  establishment_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DiningTable {
  id: string;
  establishment_id: string;
  zone_id?: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  current_order_id?: string;
  pos_x?: number;
  pos_y?: number;
  created_at: string;
  updated_at: string;
  // Joins
  zone?: Zone;
  current_order?: Order;
}

export interface Category {
  id: string;
  establishment_id: string;
  name: string;
  destination: Destination;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  establishment_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number; // en FCFA ou devise locale
  cost_price: number;
  destination: Destination;
  is_available: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
  // Joins
  category?: Category;
  recipe?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: string;
  menu_item_id: string;
  stock_item_id: string;
  quantity_required: number;
  created_at: string;
  // Joins
  stock_item?: StockItem;
}

export interface OrderItem {
  id: string;
  order_id: string;
  establishment_id: string;
  menu_item_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  destination: Destination;
  status: OrderItemStatus;
  notes?: string;
  preparation_started_at?: string;
  ready_at?: string;
  served_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  cancelled_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  establishment_id: string;
  table_id?: string;
  table_number: string;
  server_id: string;
  server_name: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  discount_note?: string;
  tax_amount: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  notes?: string;
  bill_requested_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  // Joins
  items?: OrderItem[];
  payments?: Payment[];
  table?: DiningTable;
}

export interface BillRequest {
  id: string;
  establishment_id: string;
  table_id: string;
  order_id: string;
  server_id: string;
  requested_at: string;
  status: 'en_attente' | 'traitee' | 'annulee';
  // Joins
  table?: DiningTable;
  order?: Order;
  server?: Profile;
}

export interface Payment {
  id: string;
  establishment_id: string;
  order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  currency: string;
  reference_code?: string;
  status: PaymentStatus;
  cashier_id: string;
  notes?: string;
  created_at: string;
  // Joins
  cashier?: Profile;
}

export interface StockItem {
  id: string;
  establishment_id: string;
  name: string;
  category: string;
  unit: string;
  current_quantity: number;
  min_alert_threshold: number;
  cost_per_unit: number;
  created_at?: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  establishment_id: string;
  stock_item_id: string;
  movement_type: StockMovementType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  unit_cost: number;
  reason?: string;
  actor_id?: string;
  created_at: string;
  // Joins
  stock_item?: StockItem;
  actor?: Profile;
}

export interface Expense {
  id: string;
  establishment_id: string;
  title: string;
  category: string;
  amount: number;
  payment_method: string;
  cashier_id: string;
  receipt_reference?: string;
  notes?: string;
  created_at: string;
  // Joins
  cashier?: Profile;
}
