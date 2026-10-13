// RESTBAR PRO — Stocks, Ingrédients, Mouvements & Rôle Magasinier
import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Plus,
  Minus,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  X,
  CheckCircle2,
  PackageCheck,
  Scale,
  Eye,
  Edit2,
  Trash2,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { posStore, realtimeBus } from '../../services/posService';
import { StockItem, StockMovement } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';
import { ConfirmModal } from '../common/ConfirmModal';

export const StockManagementView: React.FC = () => {
  const { session } = useAuth();
  const { success, error, info } = useNotification();

  const estId = session?.activeEstablishment?.id;

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [activeTab, setActiveTab] = useState<'articles' | 'movements'>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [movementSearchQuery, setMovementSearchQuery] = useState('');
  const [movementFilterType, setMovementFilterType] = useState<string>('all');

  // Modal Entrée / Sortie / Inventaire
  const [movementModalItem, setMovementModalItem] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<'entree' | 'sortie_perte' | 'inventaire'>('entree');
  const [movementQty, setMovementQty] = useState<number>(1);
  const [movementReason, setMovementReason] = useState<string>('');

  // Modal Modification Mouvement
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editMovementQty, setEditMovementQty] = useState<number>(0);
  const [editMovementReason, setEditMovementReason] = useState<string>('');

  // Modal Suppression Mouvement
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);

  // Modal Voir Détail & Historique Mouvements
  const [viewModalItem, setViewModalItem] = useState<StockItem | null>(null);
  const [itemMovements, setItemMovements] = useState<StockMovement[]>([]);

  // Modal Créer / Modifier Article
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Boissons',
    current_quantity: 0,
    unit: 'bouteilles',
    min_alert_threshold: 5,
    cost_per_unit: 1000,
  });

  // Modal Suppression
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<StockItem | null>(null);

  const loadData = () => {
    if (!estId) return;
    const items = posStore.getStockItems(estId);
    setStockItems(items);
  };

  useEffect(() => {
    loadData();
    const unsub = realtimeBus.subscribe('STOCK_UPDATED', () => loadData());
    return () => unsub();
  }, [estId]);

  const handleOpenMovement = (item: StockItem, type: 'entree' | 'sortie_perte' | 'inventaire') => {
    setMovementModalItem(item);
    setMovementType(type);
    setMovementQty(type === 'inventaire' ? item.current_quantity : 1);
    setMovementReason('');
  };

  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModalItem || !estId || !session) return;
    try {
      posStore.recordStockMovement(
        estId,
        movementModalItem.id,
        session.user.id,
        movementType,
        Number(movementQty),
        movementReason || (movementType === 'entree' ? 'Réception fournisseur' : movementType === 'sortie_perte' ? 'Sortie perte/casse' : 'Ajustement inventaire')
      );
      success('Mouvement enregistré', `Stock de ${movementModalItem.name} mis à jour.`);
      setMovementModalItem(null);
      setMovementQty(1);
      setMovementReason('');
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const handleOpenView = (item: StockItem) => {
    setViewModalItem(item);
    if (estId) {
      const movs = posStore.getStockMovements(estId, item.id);
      setItemMovements(movs);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Boissons',
      current_quantity: 10,
      unit: 'bouteilles',
      min_alert_threshold: 5,
      cost_per_unit: 1000,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      current_quantity: item.current_quantity,
      unit: item.unit,
      min_alert_threshold: item.min_alert_threshold,
      cost_per_unit: item.cost_per_unit,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estId) return;

    try {
      if (editingItem) {
        posStore.updateStockItem(estId, editingItem.id, {
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          min_alert_threshold: Number(formData.min_alert_threshold),
          cost_per_unit: Number(formData.cost_per_unit),
        });
        success('Article modifié', `${formData.name} a été mis à jour avec succès.`);
      } else {
        posStore.createStockItem(estId, {
          name: formData.name,
          category: formData.category,
          current_quantity: Number(formData.current_quantity),
          unit: formData.unit,
          min_alert_threshold: Number(formData.min_alert_threshold),
          cost_per_unit: Number(formData.cost_per_unit),
        });
        success('Nouvel article créé', `${formData.name} a été ajouté au stock.`);
      }
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmItem || !estId) return;
    try {
      posStore.deleteStockItem(estId, deleteConfirmItem.id);
      success('Article supprimé', `${deleteConfirmItem.name} a été retiré de l'inventaire.`);
      setDeleteConfirmItem(null);
      loadData();
    } catch (err: any) {
      error('Erreur', err.message);
    }
  };

  const categories = Array.from(new Set(stockItems.map((i) => i.category)));

  const filteredItems = stockItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const lowStockCount = stockItems.filter((s) => s.current_quantity <= s.min_alert_threshold).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Boxes className="w-6 h-6 text-amber-400" />
              Gestion des Stocks & Magasin
            </h1>
            <Badge variant="amber">{stockItems.length} Ingrédients & Articles</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Espace magasinier : Entrées, sorties, inventaires avec consultation, modification et suppression des articles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold">{lowStockCount} alerte(s) seuil</span>
            </div>
          )}

          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-950/30"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel Article</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, catégorie..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            Toutes ({stockItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Désignation</th>
                <th className="py-3.5 px-4">Catégorie</th>
                <th className="py-3.5 px-4">Stock Actuel</th>
                <th className="py-3.5 px-4">Seuil d'Alerte</th>
                <th className="py-3.5 px-4">Coût Unitaire</th>
                <th className="py-3.5 px-4 text-center">Mouvements Rapides</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Aucun article trouvé dans l'inventaire.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.current_quantity <= item.min_alert_threshold;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                          <span>{item.name}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-400">{item.category}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isLow ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {item.current_quantity} {item.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400">
                        {item.min_alert_threshold} {item.unit}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        {item.cost_per_unit.toLocaleString()} FCFA
                      </td>

                      {/* Mouvements Rapides Entrée / Perte / Inventaire */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenMovement(item, 'entree')}
                            title="Entrée en stock (Livraison)"
                            className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Entrée
                          </button>

                          <button
                            onClick={() => handleOpenMovement(item, 'sortie_perte')}
                            title="Sortie (Casse / Perte)"
                            className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition flex items-center gap-1"
                          >
                            <Minus className="w-3 h-3" />
                            Sortie
                          </button>

                          <button
                            onClick={() => handleOpenMovement(item, 'inventaire')}
                            title="Ajustement inventaire physique"
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                          >
                            Inventaire
                          </button>
                        </div>
                      </td>

                      {/* 3 Icônes Demandées : Voir, Modifier, Supprimer */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. Icône Voir */}
                          <button
                            onClick={() => handleOpenView(item)}
                            title="Voir la fiche et l'historique des mouvements"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Eye className="w-4 h-4 text-cyan-400" />
                          </button>

                          {/* 2. Icône Modifier */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Modifier les informations de l'article"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Edit2 className="w-4 h-4 text-amber-400" />
                          </button>

                          {/* 3. Icône Supprimer */}
                          <button
                            onClick={() => setDeleteConfirmItem(item)}
                            title="Supprimer définitivement cet article"
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Mouvement de Stock (Entrée / Sortie / Inventaire) */}
      {movementModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setMovementModalItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Mouvement : {movementModalItem.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Stock actuel : {movementModalItem.current_quantity} {movementModalItem.unit}
                </p>
              </div>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Type d'Opération
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('entree')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition ${
                      movementType === 'entree'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    + Entrée
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('sortie_perte')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition ${
                      movementType === 'sortie_perte'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    - Sortie / Perte
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('inventaire')}
                    className={`py-2 px-2 rounded-xl border text-xs font-bold text-center transition ${
                      movementType === 'inventaire'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    = Inventaire
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Quantité ({movementModalItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min={0.1}
                  value={movementQty}
                  onChange={(e) => setMovementQty(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Motif / Numéro de bon de livraison
                </label>
                <input
                  type="text"
                  placeholder="Ex: Facture Fournisseur N°8491 ou Bouteille cassée"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMovementModalItem(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
                >
                  Valider le Mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1 : Voir la Fiche et l'Historique (Icon Voir) */}
      {viewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setViewModalItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Fiche Article : {viewModalItem.name}
                </h3>
                <p className="text-xs text-slate-400">Catégorie : {viewModalItem.category}</p>
              </div>
            </div>

            <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Stock Actuel</span>
                <p className="text-base font-bold text-emerald-400 font-mono mt-1">
                  {viewModalItem.current_quantity} {viewModalItem.unit}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Seuil d'alerte</span>
                <p className="text-base font-bold text-rose-400 font-mono mt-1">
                  {viewModalItem.min_alert_threshold} {viewModalItem.unit}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Coût unitaire</span>
                <p className="text-base font-bold text-amber-400 font-mono mt-1">
                  {viewModalItem.cost_per_unit.toLocaleString()} F
                </p>
              </div>
            </div>

            {/* Historique des mouvements de cet article */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-amber-400" />
                Historique des Mouvements ({itemMovements.length})
              </h4>

              {itemMovements.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Aucun mouvement enregistré pour cet article.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {itemMovements.map((mov) => {
                    const isEntree = mov.movement_type === 'entree';
                    const isSortie = mov.movement_type === 'sortie_perte';

                    return (
                      <div
                        key={mov.id}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {isEntree ? (
                            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                          ) : isSortie ? (
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Scale className="w-4 h-4 text-amber-400" />
                          )}
                          <div>
                            <p className="font-semibold text-white">
                              {isEntree ? 'Entrée' : isSortie ? 'Sortie/Perte' : 'Inventaire'} : {mov.quantity} {viewModalItem.unit}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {mov.reason || 'Aucun motif renseigné'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-[11px] text-slate-300">
                            {mov.previous_quantity} ➔ {mov.new_quantity}
                          </span>
                          <p className="text-[9px] text-slate-500">
                            {new Date(mov.created_at).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2 : Créer / Modifier Article (Icon Modifier) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Edit2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {editingItem ? `Modifier : ${editingItem.name}` : 'Nouvel Article en Stock'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingItem ? 'Mise à jour des paramètres de gestion' : 'Ajout d’un produit ou ingrédient au catalogue'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nom de l'article *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Sirop de Grenadine ou Bouteille Coca"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Catégorie
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Boissons">Boissons</option>
                    <option value="Boucherie & Viandes">Boucherie & Viandes</option>
                    <option value="Poissonnerie">Poissonnerie</option>
                    <option value="Épicerie & Condiments">Épicerie & Condiments</option>
                    <option value="Fruits & Légumes">Fruits & Légumes</option>
                    <option value="Consommables">Consommables</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Unité de mesure
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="bouteilles">Bouteilles</option>
                    <option value="canettes">Canettes</option>
                    <option value="kg">Kilogrammes (kg)</option>
                    <option value="litres">Litres</option>
                    <option value="portions">Portions</option>
                    <option value="cartons">Cartons</option>
                  </select>
                </div>
              </div>

              {!editingItem && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Stock Initial ({formData.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={formData.current_quantity}
                    onChange={(e) => setFormData({ ...formData, current_quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Seuil d'Alerte ({formData.unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={formData.min_alert_threshold}
                    onChange={(e) => setFormData({ ...formData, min_alert_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Coût unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-lg shadow-amber-950/40"
                >
                  {editingItem ? 'Enregistrer Modifications' : 'Créer l’Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3 : Confirmation Suppression (Icon Supprimer) */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirmItem)}
        title="Supprimer cet article du stock ?"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${deleteConfirmItem?.name}" de l'inventaire ? Cette action supprimera la référence du magasin.`}
        confirmLabel="Supprimer l'article"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmItem(null)}
      />
    </div>
  );
};
