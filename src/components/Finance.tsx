import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { Plus, Wallet, TrendingUp, TrendingDown, DollarSign, ChevronRight, Milk, Trash2, PieChart, Activity, X, CreditCard, FileText, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useProfile } from '../lib/useProfile';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: 'milk_sales' | 'feed' | 'medical' | 'labor' | 'machinery' | 'other';
  date: any;
  paymentMethod: string;
  referenceNumber: string;
  ownerId: string;
}

export const Finance: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile, loading: profileLoading } = useProfile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newTx, setNewTx] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '' as string | number,
    category: 'feed' as string,
    description: '',
    paymentMethod: 'Cash',
    referenceNumber: ''
  });

  useEffect(() => {
    if (!farmOwnerId || profile?.role !== 'owner') return;

    // Helper to extract timestamp millisecond value safely across nested structures
    const getMs = (dateVal: any): number => {
      if (!dateVal) return 0;
      if (typeof dateVal.toDate === 'function') {
        try {
          return dateVal.toDate().getTime();
        } catch (e) {}
      }
      if (typeof dateVal.seconds === 'number') {
        return dateVal.seconds * 1000;
      }
      const parsed = new Date(dateVal).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };

    const q = query(
      collection(db, 'transactions'), 
      where('ownerId', '==', farmOwnerId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      docs.sort((a, b) => {
        const timeA = getMs(a.date);
        const timeB = getMs(b.date);
        return timeB - timeA;
      });
      setTransactions(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore loading error:", err);
      // Suppress temporary query/network delays gracefully for smooth UI
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    });

    return () => unsub();
  }, [farmOwnerId, profile?.role]);

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-12 h-12 border-4 border-terracotta-500/10 border-t-terracotta-500 rounded-full animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-mud-900/30 mt-4">Checking permissions...</span>
      </div>
    );
  }

  if (profile?.role !== 'owner') {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-12 bg-white border-4 border-mud-900 shadow-[12px_12px_0px_#A64B2A] rounded-lg">
        <div className="w-16 h-16 bg-terracotta-500/10 text-terracotta-500 flex items-center justify-center mx-auto mb-8 rounded-full">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black font-serif italic text-mud-900 uppercase tracking-tight mb-4">Access Denied</h2>
        <p className="text-xs font-bold text-mud-900/60 uppercase tracking-widest leading-relaxed mb-6">
          Finances are only accessible by the Farm Owner.
        </p>
        <div className="text-[9px] font-black text-terracotta-500 uppercase tracking-[0.2em] border-t-2 border-mud-900/5 pt-4">
          OWNER ACCESS ONLY
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmOwnerId) return;
    try {
      await addDoc(collection(db, 'transactions'), {
        ...newTx,
        amount: Number(newTx.amount) || 0,
        date: serverTimestamp(),
        ownerId: farmOwnerId
      });
      setShowAddModal(false);
      setNewTx({ 
        type: 'expense', 
        amount: '', 
        category: 'feed', 
        description: '',
        paymentMethod: 'Cash',
        referenceNumber: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'transactions');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const totals = transactions.reduce((acc, tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') acc.income += amt;
    else acc.expense += amt;
    return acc;
  }, { income: 0, expense: 0 });

  const formatCategory = (cat: string) => {
    const mapping: Record<string, string> = {
      milk_sales: 'Milk Sales',
      cattle_sales: 'Cattle Sales',
      manure_sales: 'Manure/Fertilizer Sales',
      other_income: 'Other Income',
      feed: 'Animal Feed',
      medical: 'Vet & Medicine',
      labor: 'Salaries & Labour',
      machinery: 'Repairs & Maintenance',
      other: 'Other Expenses'
    };
    return mapping[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-mud-900/5 pb-12">
        <div>
           <div className="flex items-center space-x-3 text-terracotta-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">
              <PieChart className="w-4 h-4" />
              <span>Farm Finance Ledger</span>
           </div>
          <h1 className="text-5xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none">Farm Finances</h1>
          <p className="text-[11px] font-bold text-mud-900/40 uppercase tracking-[0.2em] mt-3 italic">Keep track of farm income, expenses, and net profit</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="group flex items-center space-x-6 px-12 py-6 bg-mud-900 text-cream-100 text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_rgba(38,28,26,0.1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1"
        >
          <div className="w-8 h-8 bg-leaf-500 flex items-center justify-center transition-transform group-hover:rotate-12">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span>Add Transaction</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white border-2 border-mud-900/5 p-6 sm:p-10 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <TrendingUp className="w-24 h-24 text-leaf-500" />
           </div>
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-leaf-500 mb-4 font-sans">Total Income (Inflow)</p>
           <h3 className="text-4xl font-black font-serif italic text-mud-900">KSh {totals.income.toLocaleString()}</h3>
        </div>
        <div className="bg-white border-2 border-mud-900/5 p-6 sm:p-10 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <TrendingDown className="w-24 h-24 text-terracotta-500" />
           </div>
           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-terracotta-500 mb-4 font-sans">Total Expenses (Outflow)</p>
           <h3 className="text-4xl font-black font-serif italic text-mud-900">KSh {totals.expense.toLocaleString()}</h3>
        </div>
        <div className="bg-mud-900 text-cream-100 p-6 sm:p-10 shadow-[12px_12px_0px_rgba(166,75,42,0.15)] relative overflow-hidden group border-r-8 border-terracotta-500">
           <div className="absolute top-0 right-0 p-6 opacity-[0.1] group-hover:rotate-12 transition-transform">
              <Wallet className="w-24 h-24 text-terracotta-500" />
           </div>
           <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-4 font-sans">Net Balance</p>
           <h3 className="text-4xl font-black font-serif italic tracking-tighter">KSh {(totals.income - totals.expense).toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-white border-2 border-mud-900/5 shadow-sm overflow-hidden">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
           <thead>
             <tr className="bg-mud-900 text-cream-100 text-[9px] font-black uppercase tracking-[0.3em]">
               <th className="p-8">Transaction Details</th>
               <th className="p-8 text-center">Category / Method</th>
               <th className="p-8 text-right">Amount</th>
               <th className="p-8">Date</th>
               <th className="p-8 text-right">Delete</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-mud-900/5">
             {loading ? (
               <tr><td colSpan={5} className="p-24 text-center font-bold text-[10px] uppercase tracking-[0.4em] opacity-40 italic">Loading transaction ledger...</td></tr>
             ) : transactions.length === 0 ? (
               <tr><td colSpan={5} className="p-24 text-center font-bold text-[10px] uppercase tracking-[0.4em] opacity-40 italic">No transactions recorded in the ledger yet.</td></tr>
             ) : transactions.map((tx) => (
               <tr key={tx.id} className="hover:bg-cream-100/50 group transition-colors">
                 <td className="p-8">
                    <div className="font-serif italic font-black text-lg text-mud-900 leading-none mb-1">{tx.description}</div>
                    <div className="text-[9px] font-bold text-mud-900/30 uppercase tracking-widest font-sans flex items-center space-x-3">
                        <span>Ref: {tx.referenceNumber || 'N/A'}</span>
                     </div>
                 </td>
                 <td className="p-8 text-center">
                    <div className="flex flex-col items-center space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-mud-900/40 bg-mud-900/5 px-3 py-1.5 border border-mud-900/5">{formatCategory(tx.category)}</span>
                        <span className="text-[8px] font-bold text-mud-900/30 uppercase">{tx.paymentMethod}</span>
                     </div>
                 </td>
                 <td className={`p-8 text-right font-black text-xl tracking-tighter ${tx.type === 'income' ? 'text-leaf-500' : 'text-terracotta-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}KSh {tx.amount.toLocaleString()}
                 </td>
                 <td className="p-8 text-[11px] font-black uppercase tracking-[0.2em] text-mud-900/30 font-sans italic">
                    {(() => {
                      if (!tx.date) return '...';
                      if (typeof tx.date.toDate === 'function') {
                        try {
                          return format(tx.date.toDate(), 'dd MMM yyyy');
                        } catch (e) {
                          return '...';
                        }
                      }
                      if (typeof tx.date.seconds === 'number') {
                        try {
                          return format(new Date(tx.date.seconds * 1000), 'dd MMM yyyy');
                        } catch (e) {
                          return '...';
                        }
                      }
                      try {
                        return format(new Date(tx.date), 'dd MMM yyyy');
                      } catch (e) {
                        return '...';
                      }
                    })()}
                 </td>
                 <td className="p-8 text-right">
                    {deletingId === tx.id ? (
                      <div className="flex items-center justify-end space-x-2 animate-in fade-in zoom-in duration-200">
                        <button
                          onClick={() => {
                            handleDelete(tx.id);
                            setDeletingId(null);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded border border-red-600 cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[9px] font-black uppercase tracking-wider rounded border border-gray-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeletingId(tx.id)} 
                        className="text-terracotta-500 opacity-60 md:opacity-20 group-hover:opacity-100 transition-opacity p-2 hover:bg-terracotta-50 rounded-lg cursor-pointer"
                      >
                         <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                 </td>
               </tr>
             ))}
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
              onSubmit={handleSubmit}
              className="relative w-full max-w-2xl bg-white border-4 sm:border-8 border-mud-900 p-6 sm:p-12 md:p-16 shadow-[12px_12px_0px_#A64B2A] sm:shadow-[24px_24px_0px_#A64B2A] bg-pattern overflow-y-auto max-h-[90vh] custom-scrollbar rounded-lg focus-within:outline-none"
             >
                <button type="button" onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 sm:top-8 sm:right-8 text-mud-900/30 hover:text-mud-900 transition-colors">
                  <X className="w-6 h-6 sm:w-8 sm:h-8" />
                </button>
                <h4 className="text-2xl sm:text-4xl font-black font-serif italic uppercase text-mud-900 tracking-tighter mb-6 sm:mb-12 border-b-4 border-mud-900 pb-4 sm:pb-6">Add New Transaction</h4>
                <div className="space-y-6 sm:space-y-10">
                   <div className="flex border-4 border-mud-900 font-black text-[10px] shadow-sm transform -rotate-1">
                      <button 
                        type="button" 
                        onClick={() => setNewTx({...newTx, type: 'income', category: 'milk_sales'})}
                        className={`flex-1 py-4 sm:py-5 uppercase tracking-[0.3em] transition-all text-xs ${newTx.type === 'income' ? 'bg-leaf-500 text-white' : 'bg-white text-mud-900/40 hover:text-mud-900'}`}
                      >Income / Sale</button>
                      <button 
                        type="button"
                        onClick={() => setNewTx({...newTx, type: 'expense', category: 'feed'})}
                        className={`flex-1 py-4 sm:py-5 uppercase tracking-[0.3em] transition-all text-xs ${newTx.type === 'expense' ? 'bg-terracotta-500 text-white' : 'bg-white text-mud-900/40 hover:text-mud-900'}`}
                      >Expense / Purchase</button>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Amount (KES)</label>
                        <input required type="number" step="any" placeholder="0.00" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-6 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white" />
                      </div>
                      <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Category</label>
                       <select className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-6 text-sm font-black text-mud-900 outline-none appearance-none cursor-pointer focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest cursor-pointer" value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})}>
                          {newTx.type === 'income' ? (
                            <>
                              <option value="milk_sales">Milk Sales</option>
                              <option value="cattle_sales">Cattle Sales</option>
                              <option value="manure_sales">Manure/Fertilizer Sales</option>
                              <option value="other_income">Other Income</option>
                            </>
                          ) : (
                            <>
                              <option value="feed">Animal Feed</option>
                              <option value="medical">Vet & Medicine</option>
                              <option value="labor">Salaries & Labour</option>
                              <option value="machinery">Repairs & Maintenance</option>
                              <option value="other">Other Expenses</option>
                            </>
                          )}
                       </select>
                     </div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Payment Method</label>
                        <select className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-6 text-sm font-black text-mud-900 outline-none appearance-none cursor-pointer focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest cursor-pointer" value={newTx.paymentMethod} onChange={e => setNewTx({...newTx, paymentMethod: e.target.value})}>
                            <option value="Cash">Cash</option>
                            <option value="Mobile Money">M-Pesa / Mobile Money</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card Payment</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Reference Number</label>
                        <input type="text" placeholder="REF-402-XS" value={newTx.referenceNumber} onChange={e => setNewTx({...newTx, referenceNumber: e.target.value.toUpperCase()})} className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-6 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Description</label>
                      <textarea required placeholder="Enter transaction details (e.g., Feed delivery, milk sales wholesale)..." rows={3} value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-6 text-xs font-bold text-mud-900 outline-none resize-none focus:border-terracotta-500 transition-colors focus:bg-white" />
                    </div>
                    <div className="flex gap-10 pt-4 sm:pt-8">
                       <button type="submit" className="flex-1 py-4 sm:py-6 bg-mud-900 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_#A64B2A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Save Transaction</button>
                    </div>
                </div>
             </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

