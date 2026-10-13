// RESTBAR PRO — Menu & Catalog Management (Plats, Boissons & Routage)
import React, { useEffect, useState } from 'react';
import {
  Utensils,
  Wine,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore } from '../../services/posService';
import { Category, Destination, MenuItem } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

export const MenuCatalogView: React.FC = () => {
  const { session } = useAuth();
  const { success, error } = useNotification();

  const estId = session?.activeEstablishment?.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [destFilter, setDestFilter] = useState<'all' | 'bar' | 'cuisine'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState(3000);
  const [newCostPrice, setNewCostPrice] = useState(1000);
  const [newDest, setNewDest] = useState<Destination>('bar');
  const [newCatId, setNewCatId] = useState('');

  const loadData = () => {
    if (!estId) return;
    const c = posStore.getCategories(estId);
    const m = posStore.getMenuItems(estId);
    setCategories(c);
    setItems(m);
    if (c.length > 0 && !newCatId) setNewCatId(c[0].id);
  };

  useEffect(() => {
    loadData();
  }, [estId]);

  const handleToggleAvailability = (item: MenuItem) => {
    try {
      const updated = posStore.toggleItemAvailability(item.id);
      success(
        'Disponibilité modifiée',
        `${updated.name} est maintenant ${updated.is_available ? 'disponible' : 'marqué épuisé'}.`
      );
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estId || !newName || !newCatId) return;

    try {
      posStore.createMenuItem(estId, {
        name: newName,
        description: newDesc,
        price: Number(newPrice) || 0,
        cost_price: Number(newCostPrice) || 0,
        destination: newDest,
        category_id: newCatId,
        is_available: true,
      });

      success('Article créé', `${newName} a été ajouté à la carte.`);
      setIsAddOpen(false);
      setNewName('');
      setNewDesc('');
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchDest = destFilter === 'all' || item.destination === destFilter;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchDest && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Utensils className="w-6 h-6 text-amber-400" />
              Carte & Tarification (Bar & Cuisine)
            </h1>
            <Badge variant="amber">{items.length} Références</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Gestion des prix en FCFA, fiches techniques et routage automatique vers le Bar ou la Cuisine.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
        >
          <Plus className="w-4 h-4" />
          Ajouter un article
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDestFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition ${
              destFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            Tous ({items.length})
          </button>
          <button
            onClick={() => setDestFilter('bar')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              destFilter === 'bar'
                ? 'bg-purple-600 text-white font-bold shadow-md'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Wine className="w-3.5 h-3.5" />
            Routage Bar ({items.filter((i) => i.destination === 'bar').length})
          </button>
          <button
            onClick={() => setDestFilter('cuisine')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              destFilter === 'cuisine'
                ? 'bg-emerald-600 text-white font-bold shadow-md'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Routage Cuisine ({items.filter((i) => i.destination === 'cuisine').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition space-y-3"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    item.destination === 'bar'
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                      : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {item.destination === 'bar' ? 'Bar & Cocktails' : 'Cuisine & Plats'}
                </span>

                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded transition ${
                    item.is_available
                      ? 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50'
                      : 'text-rose-400 bg-rose-950/40 hover:bg-rose-900/50'
                  }`}
                >
                  {item.is_available ? '● En vente' : '✕ Épuisé'}
                </button>
              </div>

              <h3 className="font-bold text-white text-sm">{item.name}</h3>
              {item.description && (
                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Prix de vente</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {item.price.toLocaleString()} FCFA
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">Marge brute</span>
                <span className="text-xs font-mono text-emerald-400">
                  +{(item.price - item.cost_price).toLocaleString()} F
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Ajouter un Article */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Nouvel Article</h3>
                <p className="text-xs text-slate-400">Ajout à la carte et affectation du service cible</p>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nom du Plat ou Boisson *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Brochettes d'escargot ou Caïpirinha"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Description & Ingrédients
                </label>
                <textarea
                  rows={2}
                  placeholder="Composition, accompagnement, cuisson..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Prix de vente (FCFA) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Coût de revient (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Service Cible (Routage KDS) *
                  </label>
                  <select
                    value={newDest}
                    onChange={(e) => setNewDest(e.target.value as Destination)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="bar">BAR (Boissons, Cocktails)</option>
                    <option value="cuisine">CUISINE (Plats, Entrées, Desserts)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Catégorie
                  </label>
                  <select
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.destination.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
                >
                  Enregistrer l'Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
