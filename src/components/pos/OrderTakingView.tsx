// RESTBAR PRO — POS Order Taking (Prise de Commande Serveuse / Salle)
import React, { useEffect, useState } from 'react';
import {
  Utensils,
  Wine,
  Plus,
  Minus,
  Trash2,
  Send,
  Search,
  Store,
  Clock,
  Sparkles,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore } from '../../services/posService';
import { Category, DiningTable, MenuItem } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

interface OrderTakingViewProps {
  initialTable?: DiningTable | null;
  onOrderCompleted: () => void;
  onBackToTables: () => void;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export const OrderTakingView: React.FC<OrderTakingViewProps> = ({
  initialTable,
  onOrderCompleted,
  onBackToTables,
}) => {
  const { session } = useAuth();
  const { success, error, info } = useNotification();

  const estId = session?.activeEstablishment?.id;

  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(initialTable || null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingNotesItemId, setEditingNotesItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!estId) return;
    const t = posStore.getTables(estId);
    const c = posStore.getCategories(estId);
    const m = posStore.getMenuItems(estId);
    setTables(t);
    setCategories(c);
    setMenuItems(m);

    if (!selectedTable && t.length > 0) {
      setSelectedTable(t[0]);
    }
  }, [estId]);

  const addToCart = (item: MenuItem) => {
    if (!item.is_available) {
      error('Rupture de stock', `L'article "${item.name}" est indisponible pour le moment.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prev) =>
      prev.map((c) => (c.menuItem.id === itemId ? { ...c, notes } : c))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== itemId));
  };

  const filteredItems = menuItems.filter((item) => {
    const matchCat = selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
    const matchQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  const cartTotal = cart.reduce((acc, c) => acc + c.menuItem.price * c.quantity, 0);
  const barItemsCount = cart.filter((c) => c.menuItem.destination === 'bar').reduce((a, b) => a + b.quantity, 0);
  const kitchenItemsCount = cart.filter((c) => c.menuItem.destination === 'cuisine').reduce((a, b) => a + b.quantity, 0);

  const handleTransmitOrder = () => {
    if (!selectedTable) {
      error('Sélection requise', 'Veuillez sélectionner une table pour la commande.');
      return;
    }
    if (cart.length === 0) {
      error('Panier vide', 'Veuillez ajouter au moins un article.');
      return;
    }
    if (!estId || !session) return;

    try {
      const order = posStore.createOrder(
        estId,
        selectedTable.id,
        session.user.id,
        session.user.full_name,
        cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          notes: c.notes,
        })),
        orderNotes
      );

      success(
        'Commande Transmise !',
        `Ticket ${order.order_number} envoyé. Routage : ${barItemsCount} au Bar, ${kitchenItemsCount} en Cuisine.`
      );

      setCart([]);
      setOrderNotes('');
      onOrderCompleted();
    } catch (err: any) {
      error('Erreur transmission', err.message);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6">
      {/* Left Column: Catalog & Item Selection */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 overflow-hidden">
        {/* Top Controls: Back, Table Picker & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToTables}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Retour au plan de salle"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Store className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Table :</span>
              <select
                value={selectedTable?.id || ''}
                onChange={(e) => {
                  const t = tables.find((x) => x.id === e.target.value);
                  if (t) setSelectedTable(t);
                }}
                className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-white">
                    {t.table_number} ({t.zone?.name || 'Salle'}) - {t.status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un plat, boisson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none text-xs border-b border-slate-800/80">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
              selectedCategoryId === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Tous les articles
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategoryId(c.id)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedCategoryId === c.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {c.destination === 'bar' ? (
                <Wine className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <Utensils className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              disabled={!item.is_available}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between group active:scale-95 ${
                item.is_available
                  ? 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 hover:border-amber-500/40'
                  : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                      item.destination === 'bar'
                        ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {item.destination === 'bar' ? 'Bar' : 'Cuisine'}
                  </span>
                  {!item.is_available && (
                    <span className="text-[9px] text-rose-400 font-bold">Épuisé</span>
                  )}
                </div>
                <h4 className="font-semibold text-white text-xs tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors">
                  {item.name}
                </h4>
                {item.description && (
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {item.price.toLocaleString()} FCFA
                </span>
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column: Live Order Cart & Dispatch Summary */}
      <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-2xl">
        <div>
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-black text-white text-sm tracking-tight">Bon de Commande</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Table {selectedTable?.table_number} • {cart.reduce((a, b) => a + b.quantity, 0)} articles
              </p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-slate-500 hover:text-rose-400 transition"
              >
                Vider
              </button>
            )}
          </div>

          {/* Automatic Routing Summary Badge */}
          <div className="my-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-purple-300">
              <Wine className="w-3.5 h-3.5" />
              <span>Routage Bar : <strong>{barItemsCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300">
              <Utensils className="w-3.5 h-3.5" />
              <span>Routage Cuisine : <strong>{kitchenItemsCount}</strong></span>
            </div>
          </div>

          {/* Cart Item List */}
          <div className="overflow-y-auto max-h-[360px] space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <Utensils className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">Votre panier est vide.</p>
                <p className="text-[11px] text-slate-600">Touchez des articles à gauche pour les ajouter.</p>
              </div>
            ) : (
              cart.map(({ menuItem, quantity, notes }) => (
                <div
                  key={menuItem.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            menuItem.destination === 'bar' ? 'bg-purple-400' : 'bg-emerald-400'
                          }`}
                        />
                        <p className="font-semibold text-white truncate">{menuItem.name}</p>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {(menuItem.price * quantity).toLocaleString()} FCFA
                      </span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-800">
                      <button
                        onClick={() => updateQuantity(menuItem.id, -1)}
                        className="p-1 hover:text-rose-400 text-slate-400 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-white px-1">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(menuItem.id, 1)}
                        className="p-1 hover:text-emerald-400 text-slate-400 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Notes / Special Requests Input */}
                  <div className="pt-1 border-t border-slate-900">
                    <input
                      type="text"
                      placeholder="Remarque : cuisson, sans piment, glaçons..."
                      value={notes || ''}
                      onChange={(e) => updateItemNotes(menuItem.id, e.target.value)}
                      className="w-full bg-transparent text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:text-white"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cart Bottom: Order Notes & Transmit Button */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <input
            type="text"
            placeholder="Notes générales pour la commande..."
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold uppercase tracking-wider">Total TTC</span>
            <span className="text-xl font-black text-amber-400 font-mono">
              {cartTotal.toLocaleString()} FCFA
            </span>
          </div>

          <button
            onClick={handleTransmitOrder}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition disabled:opacity-50 shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Transmettre en Production (Bar & Cuisine)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
