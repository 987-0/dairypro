import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { useProfile } from '../lib/useProfile';
import { useToast } from '../lib/ToastContext';
import { 
  Plus, 
  Droplets, 
  Clock, 
  User as UserIcon,
  Filter,
  BarChart2,
  TrendingUp,
  Thermometer,
  Zap,
  Sunrise,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface MilkEntry {
  id: string;
  cowId: string;
  cowTag?: string; // Optional join
  morningYield: number;
  eveningYield: number;
  totalYield: number;
  notes: string;
  timestamp: any;
  recordedBy: string;
  ownerId: string;
}

interface Cattle {
  id: string;
  tagId: string;
  cowName: string;
}

const toDateObject = (val: any): Date | null => {
  if (!val) return null;
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val instanceof Date) {
    return val;
  }
  if (typeof val === 'number') {
    return new Date(val);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (val.seconds !== undefined) {
    return new Date(val.seconds * 1000);
  }
  return null;
};

export const MilkProduction: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile, loading: profileLoading } = useProfile();
  const { showSuccess, showError } = useToast();
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [herd, setHerd] = useState<Cattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({
    cowId: '',
    morningYield: 0,
    eveningYield: 0,
    notes: ''
  });

  useEffect(() => {
    if (!auth.currentUser || !farmOwnerId) return;
    
    const qEntries = query(
      collection(db, 'production'), 
      where('ownerId', '==', farmOwnerId)
    );
    const unsubEntries = onSnapshot(qEntries, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MilkEntry));
      docs.sort((a, b) => {
        const timeA = a.timestamp && typeof a.timestamp.toDate === 'function' ? a.timestamp.toDate().getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.timestamp && typeof b.timestamp.toDate === 'function' ? b.timestamp.toDate().getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeA - timeB;
      });
      setEntries(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'production'));

    const qHerd = query(
      collection(db, 'cattle'),
      where('ownerId', '==', farmOwnerId)
    );
    const unsubHerd = onSnapshot(qHerd, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cattle));
      setHerd(docs);
    });

    return () => {
      unsubEntries();
      unsubHerd();
    };
  }, [farmOwnerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !farmOwnerId) return;

    try {
      const total = Number(newEntry.morningYield) + Number(newEntry.eveningYield);
      await addDoc(collection(db, 'production'), {
        ...newEntry,
        morningYield: Number(newEntry.morningYield),
        eveningYield: Number(newEntry.eveningYield),
        totalYield: total,
        timestamp: serverTimestamp(),
        recordedBy: auth.currentUser.uid,
        ownerId: farmOwnerId
      });
      showSuccess(`Milk production entry recorded successfully!`);
      setShowAddForm(false);
      setNewEntry({ cowId: '', morningYield: 0, eveningYield: 0, notes: '' });
    } catch (err) {
      showError('Failed to record milk production');
      handleFirestoreError(err, OperationType.CREATE, 'production');
    }
  };

  const isOwner = profile?.role === 'owner';

  const handleDelete = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    try {
      await deleteDoc(doc(db, 'production', id));
      showSuccess(`Milk production entry deleted`, {
        undoAction: async () => {
          const { id: _, ...entryData } = entry;
          await setDoc(doc(db, 'production', id), entryData);
        }
      });
    } catch (err) {
      showError('Failed to delete milk production entry');
      handleFirestoreError(err, OperationType.DELETE, `production/${id}`);
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


  const chartData = entries.map(e => {
    const d = toDateObject(e.timestamp);
    return {
      date: d ? format(d, 'MMM dd') : '...',
      quantity: e.totalYield ?? 0,
      fullDate: d ? format(d, 'yyyy-MM-dd HH:mm') : ''
    };
  }).slice(-14); // Last 14 entries

  const totalToday = entries
    .filter(e => {
      const d = toDateObject(e.timestamp);
      return d ? d.toDateString() === new Date().toDateString() : false;
    })
    .reduce((acc, curr) => acc + (curr.totalYield ?? 0), 0);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-mud-900/10 pb-10">
        <div>
          <div className="flex items-center space-x-2 text-terracotta-500 mb-2">
            <Droplets className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-[3px] font-sans">Milk Collections</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase font-serif text-mud-900 italic">Milk Production</h1>
          <p className="text-xs font-medium text-mud-900/40 uppercase tracking-widest mt-2">Track morning and evening milk yields for your cattle</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="group relative flex items-center space-x-4 px-10 py-6 bg-mud-900 text-cream-100 text-[11px] font-bold uppercase tracking-[0.4em] overflow-hidden transition-all hover:bg-terracotta-600 shadow-[12px_12px_0px_#A64B2A33]"
        >
          <Plus className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" />
          <span>Add Milking Record</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-8">
          <motion.div 
            whileHover={{ y: -5 }}
            className="bg-terracotta-500 text-cream-100 p-6 sm:p-10 shadow-[10px_10px_0px_#261C1A]"
          >
            <Zap className="w-6 h-6 mb-6 opacity-60" />
            <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-70 mb-2">Total Yield Today</p>
            <h3 className="text-6xl font-black tracking-tighter serif italic">{(totalToday ?? 0).toFixed(1)}<span className="text-2xl ml-1 font-sans not-italic">L</span></h3>
            <div className="mt-8 pt-6 border-t border-cream-100/10 flex items-center space-x-3">
              <div className="w-2 h-2 bg-cream-100 rounded-full animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">System Synchronized</span>
            </div>
          </motion.div>

          <div className="bg-white p-8 border-2 border-mud-900/5 shadow-sm space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-mud-900/60 pb-4 border-b-2 border-mud-900/5">Production Insights</h4>
            <div className="grid grid-cols-1 gap-6">
              <div className="flex justify-between items-center group cursor-default">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-mud-900/30 uppercase tracking-widest mb-1">Morning Milking Status</span>
                  <span className="text-2xl font-serif font-black text-mud-900 group-hover:text-terracotta-500 transition-colors uppercase italic">Optimal</span>
                </div>
                <div className="p-3 bg-terracotta-50 text-terracotta-500 rounded-full">
                  <Sunrise className="w-5 h-5" />
                </div>
              </div>
              <div className="flex justify-between items-center group cursor-default">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-mud-900/30 uppercase tracking-widest mb-1">Stable Milk Production</span>
                  <span className="text-2xl font-serif font-black text-mud-900 group-hover:text-ochre-500 transition-colors uppercase italic">Stable</span>
                </div>
                <div className="p-3 bg-ochre-100 text-ochre-500 rounded-full">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-10">
          <AnimatePresence>
            {showAddForm && (
              <motion.form 
                initial={{ height: 0, opacity: 0, scaleY: 0 }}
                animate={{ height: 'auto', opacity: 1, scaleY: 1 }}
                exit={{ height: 0, opacity: 0, scaleY: 0 }}
                onSubmit={handleSubmit}
                className="bg-white border-4 border-mud-900 p-6 sm:p-10 mb-10 shadow-[15px_15px_0px_#D99125] origin-top"
              >
                <div className="flex items-center space-x-3 mb-10 border-b-4 border-mud-900 pb-4">
                  <h3 className="text-2xl font-black uppercase font-serif italic">New Milking Entry</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-mud-900/40">Select Cow</label>
                    <select 
                      required
                      className="w-full bg-cream-100/30 border-b-2 border-mud-900 p-3 text-sm font-black uppercase outline-none focus:bg-terracotta-50 transition-colors"
                      value={newEntry.cowId}
                      onChange={e => setNewEntry({...newEntry, cowId: e.target.value})}
                    >
                      <option value="">Choose Animal</option>
                      {herd.map(cow => (
                        <option key={cow.id} value={cow.id}>{cow.cowName} ({cow.tagId})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-mud-900/40">Morning (L)</label>
                    <input 
                      required type="number" step="0.1"
                      className="w-full bg-cream-100/30 border-b-2 border-mud-900 p-3 text-lg font-black outline-none focus:bg-terracotta-50 transition-colors"
                      value={newEntry.morningYield}
                      onChange={e => setNewEntry({...newEntry, morningYield: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-mud-900/40">Evening (L)</label>
                    <input 
                      required type="number" step="0.1"
                      className="w-full bg-cream-100/30 border-b-2 border-mud-900 p-3 text-lg font-black outline-none focus:bg-terracotta-50 transition-colors"
                      value={newEntry.eveningYield}
                      onChange={e => setNewEntry({...newEntry, eveningYield: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="mb-10">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-mud-900/40">Milking Notes / Comments</label>
                   <textarea 
                    className="w-full bg-cream-100/30 border-b-2 border-mud-900 p-3 text-sm font-bold outline-none mt-2"
                    rows={2}
                    value={newEntry.notes}
                    onChange={e => setNewEntry({...newEntry, notes: e.target.value})}
                    placeholder="Explain any anomalies (e.g., cow was restless, dry-off period)..."
                   />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-5 border-2 border-mud-900 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-mud-900/5 transition-colors">Cancel</button>
                  <button type="submit" className="flex-2 py-5 bg-terracotta-500 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-[8px_8px_0px_#261C1A]">Save Milking Record</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 gap-10">
            <div className="bg-white border-2 border-mud-900/10 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex space-x-6">
                  <span className="text-[10px] font-black uppercase tracking-widest pb-2 border-b-4 border-terracotta-500 text-mud-900">
                    Milk Production Volume Trend
                  </span>
                </div>
                <BarChart2 className="w-5 h-5 text-mud-900/20" />
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A64B2A" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#A64B2A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#261C1A11" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#261C1A', border: 'none', color: '#fff' }}
                      itemStyle={{ color: '#fff', fontSize: '10px', textTransform: 'uppercase' }}
                    />
                    <Area type="monotone" dataKey="quantity" stroke="#A64B2A" strokeWidth={3} fillOpacity={1} fill="url(#colorQty)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border-2 border-mud-900/10 overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-mud-900 text-cream-100 text-[10px] font-bold uppercase tracking-[0.2em] font-serif italic">
                    <th className="p-6">Date</th>
                    <th className="p-6">Cow Name</th>
                    <th className="p-6 text-right">Morning (L)</th>
                    <th className="p-6 text-right">Evening (L)</th>
                    <th className="p-6 text-right font-black">Total Yield</th>
                    <th className="p-6 text-center">Status</th>
                    <th className="p-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-mud-900/5">
                  {[...entries].reverse().slice(0, 10).map((entry) => {
                    const cow = herd.find(c => c.id === entry.cowId);
                    const entryDate = toDateObject(entry.timestamp);
                    return (
                      <tr key={entry.id} className="hover:bg-terracotta-50 transition-colors group">
                        <td className="p-6">
                          <div className="text-[11px] font-black text-mud-900 uppercase tracking-tight">
                            {entryDate ? format(entryDate, 'dd MMM yyyy') : '...'}
                          </div>
                        </td>
                        <td className="p-6">
                           <div className="text-[11px] font-black text-mud-900 uppercase">{cow ? cow.cowName : 'UNKNOWN'}</div>
                           <div className="text-[9px] font-bold text-mud-900/40">{cow ? cow.tagId : 'N/A'}</div>
                        </td>
                        <td className="p-6 text-right text-sm font-bold">{(entry.morningYield ?? 0).toFixed(1)}</td>
                        <td className="p-6 text-right text-sm font-bold">{(entry.eveningYield ?? 0).toFixed(1)}</td>
                        <td className="p-6 text-right text-lg font-black font-serif italic text-terracotta-500">{(entry.totalYield ?? 0).toFixed(1)} L</td>
                        <td className="p-6">
                           <div className="flex justify-center items-center">
                              <div className="px-3 py-1 bg-leaf-500/10 text-leaf-500 text-[9px] font-black uppercase border border-leaf-500/20">Synced</div>
                           </div>
                        </td>
                        <td className="p-6 text-center">
                          {deletingId === entry.id ? (
                            <div className="flex items-center justify-center space-x-2 animate-in fade-in zoom-in duration-200">
                              <button
                                onClick={() => {
                                  handleDelete(entry.id);
                                  setDeletingId(null);
                                }}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-cream-100 text-[9px] font-black uppercase tracking-wider rounded border border-red-600 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="px-2.5 py-1 bg-cream-100 hover:bg-cream-200 text-mud-900 text-[9px] font-black uppercase tracking-wider rounded border border-mud-900/10 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeletingId(entry.id)}
                              className="text-terracotta-500 hover:text-white hover:bg-terracotta-500 p-2 rounded transition-colors inline-flex items-center justify-center border-2 border-terracotta-500/20"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
