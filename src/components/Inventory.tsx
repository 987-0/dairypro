import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { useProfile } from '../lib/useProfile';
import { Plus, Trash2, Package, AlertTriangle, Droplets, FlaskConical, Boxes, Settings, Activity, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryItem {
  id: string;
  name: string;
  category: 'feed' | 'medicine' | 'sanitation' | 'machinery' | 'packaging';
  quantity: number;
  unit: string;
  minThreshold: number;
  updatedAt: any;
  acquisitionCost?: number;
}

interface CatalogPreset {
  name: string;
  category: 'feed' | 'medicine' | 'sanitation' | 'machinery' | 'packaging';
  unit: string;
  typicalCost: number;
  minThreshold: number;
}

const categoryIcons: any = {
  feed: Boxes,
  medicine: FlaskConical,
  sanitation: Droplets,
  machinery: Settings,
  packaging: Package,
};

const CATALOG_PRESETS: CatalogPreset[] = [
  { name: 'Sulphur Salt Lick Block', category: 'feed', unit: 'BLOCKS', typicalCost: 450, minThreshold: 10 },
  { name: 'Synthetic Pesticide Fluid', category: 'sanitation', unit: 'LITERS', typicalCost: 1800, minThreshold: 5 },
  { name: 'Mineral Powder Pre-Mix', category: 'feed', unit: 'BAGS', typicalCost: 3200, minThreshold: 15 },
  { name: 'Broad-Spectrum Dewormer', category: 'medicine', unit: 'BOTTLES', typicalCost: 2500, minThreshold: 8 },
  { name: 'Mastitis Detection Gel Tubes', category: 'medicine', unit: 'TUBES', typicalCost: 850, minThreshold: 10 },
  { name: 'Teat Dip Disinfectant', category: 'sanitation', unit: 'LITERS', typicalCost: 1100, minThreshold: 10 },
  { name: 'Biodegradable Milk Cartons 1L', category: 'packaging', unit: 'UNITS', typicalCost: 15, minThreshold: 500 },
  { name: 'Milking Replacement Liners', category: 'machinery', unit: 'PIECES', typicalCost: 3400, minThreshold: 4 },
];

export const Inventory: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile, loading: profileLoading } = useProfile();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<{
    name: string;
    category: 'feed' | 'medicine' | 'sanitation' | 'machinery' | 'packaging';
    quantity: number;
    unit: string;
    minThreshold: number;
    acquisitionCost: number;
  }>({
    name: '',
    category: 'feed',
    quantity: 10,
    unit: 'KG',
    minThreshold: 10,
    acquisitionCost: 0
  });

  useEffect(() => {
    if (!auth.currentUser || !farmOwnerId) return;
    const q = query(
      collection(db, 'inventory'), 
      where('ownerId', '==', farmOwnerId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setItems(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

    return () => unsub();
  }, [farmOwnerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !farmOwnerId) return;
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        quantity: Number(newItem.quantity),
        minThreshold: Number(newItem.minThreshold),
        acquisitionCost: Number(newItem.acquisitionCost),
        ownerId: farmOwnerId,
        updatedAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewItem({ name: '', category: 'feed', quantity: 10, unit: 'KG', minThreshold: 10, acquisitionCost: 0 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      await updateDoc(doc(db, 'inventory', id), {
        quantity: Math.max(0, item.quantity + delta),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${id}`);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-12 h-12 border-4 border-terracotta-500/10 border-t-terracotta-500 rounded-full animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-mud-900/30 mt-4">Resolving Authority Tier...</span>
      </div>
    );
  }


  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-mud-900/5 pb-12">
        <div>
           <div className="flex items-center space-x-3 text-terracotta-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">
              <Package className="w-4 h-4" />
              <span>Inventory / Stock</span>
           </div>
          <h1 className="text-5xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none">Resource Ledger</h1>
          <p className="text-[11px] font-bold text-mud-900/40 uppercase tracking-[0.2em] mt-3 italic">Monitor and manage feed, health, cleaning items, and packaging stock</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="group flex items-center space-x-6 px-12 py-6 bg-mud-900 text-cream-100 text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_rgba(38,28,26,0.1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1"
        >
          <div className="w-8 h-8 bg-ochre-500 flex items-center justify-center transition-transform group-hover:rotate-12">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span>Add Inventory Stock</span>
        </button>
      </div>

      <div className="bg-white border-2 border-mud-900/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-mud-900 text-cream-100 text-[9px] font-black uppercase tracking-[0.3em]">
              <th className="p-8">Inventory Item</th>
              <th className="p-8">Category</th>
              <th className="p-8 text-right">Current Stock</th>
              <th className="p-8 text-right">Acquisition Cost</th>
              <th className="p-8 text-center">Stock Level</th>
              <th className="p-8">Adjust Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mud-900/5">
            {loading ? (
              <tr><td colSpan={6} className="p-24 text-center font-bold text-[10px] uppercase tracking-[0.4em] opacity-40">Loading stock records...</td></tr>
            ) : items.map((item) => {
              const Icon = categoryIcons[item.category] || Package;
              const isLow = item.quantity <= item.minThreshold;
              return (
                <tr key={item.id} className="hover:bg-cream-100/50 transition-colors group">
                  <td className="p-8">
                    <div className="flex items-center space-x-6">
                      <div className={`p-4 border-2 transition-transform group-hover:scale-110 ${isLow ? 'border-terracotta-500 text-terracotta-500 bg-terracotta-50 shadow-[4px_4px_0px_rgba(166,75,42,0.1)]' : 'border-mud-900/10 text-mud-900 bg-cream-100'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="block font-black font-serif italic text-lg text-mud-900 leading-none mb-1">{item.name}</span>
                        <span className="text-[9px] font-bold text-mud-900/30 uppercase tracking-[0.2em] font-sans">TX_ID: {item.id.slice(0,8)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className="text-[9px] font-black uppercase tracking-widest text-mud-900/40 bg-mud-900/5 px-3 py-1.5 border border-mud-900/5">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-8 text-right">
                    <div className="font-black text-2xl text-mud-900">{item.quantity} <span className="text-xs opacity-30 italic">{item.unit}</span></div>
                    <div className="text-[9px] font-bold text-mud-900/20 uppercase tracking-widest mt-1 italic">Min Level: {item.minThreshold}</div>
                  </td>
                  <td className="p-8 text-right">
                    <span className="font-black font-serif text-md text-mud-900">
                      KSh {item.acquisitionCost ? item.acquisitionCost.toLocaleString() : '0'}
                    </span>
                  </td>
                  <td className="p-8 text-center">
                    {isLow ? (
                      <span className="inline-flex items-center px-4 py-2 bg-terracotta-50 text-terracotta-500 text-[10px] font-black uppercase tracking-widest border border-terracotta-500">
                        <AlertTriangle className="w-4 h-4 mr-2 text-terracotta-500" /> LOW STOCK
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-4 py-2 bg-leaf-500/10 text-leaf-500 text-[10px] font-black uppercase tracking-widest border border-leaf-500/30">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="p-8">
                    <div className="flex items-center space-x-3">
                       <button 
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-10 h-10 border-2 border-mud-900/5 flex items-center justify-center font-black text-mud-900 hover:bg-mud-900 hover:text-white transition-all shadow-sm group-hover:border-mud-900">
                          -
                        </button>
                       <button 
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-10 h-10 border-2 border-mud-900/5 flex items-center justify-center font-black text-mud-900 hover:bg-mud-900 hover:text-white transition-all shadow-sm group-hover:border-mud-900">
                          +
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-mud-900/80 backdrop-blur-md">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setShowAddModal(false)} className="absolute inset-0" />
            <motion.form 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              onSubmit={handleAdd}
              className="relative w-full max-w-2xl bg-white border-4 sm:border-8 border-mud-900 p-6 sm:p-12 shadow-[12px_12px_0px_#A64B2A] sm:shadow-[24px_24px_0px_#A64B2A] bg-pattern overflow-y-auto max-h-[90vh] custom-scrollbar rounded-lg focus-within:outline-none"
            >
              <button type="button" onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 sm:top-8 sm:right-8 text-mud-900/30 hover:text-mud-900 transition-colors">
                  <X className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
              <h3 className="text-2xl sm:text-4xl font-black font-serif italic uppercase text-mud-900 tracking-tighter mb-6 sm:mb-8 border-b-4 border-mud-900 pb-3 sm:pb-4">
                Add Inventory Item
              </h3>

              <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-cream-100/50 border-2 border-mud-900/5">
                <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/50 mb-3">Quick-Fill Presets</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {CATALOG_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewItem({
                        name: preset.name,
                        category: preset.category,
                        quantity: 50,
                        unit: preset.unit,
                        minThreshold: preset.minThreshold,
                        acquisitionCost: preset.typicalCost
                      })}
                      className="p-3 bg-white/80 border border-mud-900/10 text-[9px] font-black uppercase tracking-widest text-mud-900 hover:bg-mud-900 hover:text-cream-100 transition-all text-left truncate rounded-sm leading-tight hover:scale-105"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Item Name</label>
                  <input 
                    required type="text" placeholder="High-Density Feed"
                    className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Category Pool</label>
                  <select 
                    className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-sm font-black text-mud-900 outline-none appearance-none cursor-pointer focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest"
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value as any})}
                  >
                    <option value="feed">Feed / Nutrition / Licks</option>
                    <option value="medicine">Health / Medical</option>
                    <option value="sanitation">Sanitation / Cleaning / Pesticides</option>
                    <option value="machinery">Machinery Spares</option>
                    <option value="packaging">Milk Packaging</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Initial Quantity</label>
                    <input 
                      required type="number" placeholder="50"
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                      value={newItem.quantity}
                      onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Unit (e.g., KG, Liters, Bags)</label>
                    <input 
                      required type="text" placeholder="BLOCKS / LITERS / UNITS"
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase italic"
                      value={newItem.unit}
                      onChange={e => setNewItem({...newItem, unit: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Minimum Alert Level</label>
                    <input 
                      required type="number" placeholder="10"
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                      value={newItem.minThreshold}
                      onChange={e => setNewItem({...newItem, minThreshold: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Total Cost (KES)</label>
                    <input 
                      required type="number" placeholder="0"
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                      value={newItem.acquisitionCost}
                      onChange={e => setNewItem({...newItem, acquisitionCost: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-10 mt-8 sm:mt-10">
                 <button type="submit" className="flex-1 py-4 sm:py-5 bg-mud-900 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_#A64B2A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Save Inventory Item</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
