import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { useProfile } from '../lib/useProfile';
import { 
  Plus, 
  Stethoscope, 
  Trash2,
  ChevronRight,
  Beef as Cow,
  Calendar,
  Weight,
  Activity,
  History,
  X,
  Dna,
  ShieldAlert,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface Cattle {
  id: string;
  tagId: string;
  cowName: string;
  breed: string;
  birthDate: string;
  gender: 'Female' | 'Male';
  status: 'milking' | 'dry' | 'heifer' | 'calf' | 'sick';
  healthStatus: string;
  weight: number;
  purchaseDate: string;
  purchasePrice: number;
  sireInfo: string;
  damInfo: string;
  ownerId: string;
}

const statusThemes: any = {
  milking: 'text-leaf-500 bg-leaf-500/10 border-leaf-500',
  dry: 'text-mud-900 bg-mud-900/10 border-mud-900',
  heifer: 'text-ochre-500 bg-ochre-500/10 border-ochre-500',
  calf: 'text-terracotta-500 bg-terracotta-500/10 border-terracotta-500',
  sick: 'text-red-600 bg-red-600/10 border-red-600',
};

const DAIRY_BREED_OPTIONS = [
  'Holstein-Friesian',
  'Jersey',
  'Ayrshire',
  'Guernsey',
  'Brown Swiss',
  'Sahiwal',
  'Fleckvieh',
  'Friesian',
  'Crossbreed',
  'Other'
];

export const HerdManagement: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile, loading: profileLoading } = useProfile();
  const [herd, setHerd] = useState<Cattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCattle, setNewCattle] = useState({
    tagId: '',
    cowName: '',
    breed: 'Holstein-Friesian',
    birthDate: format(new Date(), 'yyyy-MM-dd'),
    gender: 'Female' as const,
    status: 'milking' as const,
    healthStatus: 'Optimal',
    weight: 450,
    purchaseDate: format(new Date(), 'yyyy-MM-dd'),
    purchasePrice: 0,
    sireInfo: '',
    damInfo: ''
  });

  useEffect(() => {
    if (!auth.currentUser || !farmOwnerId) return;
    const q = query(
      collection(db, 'cattle'), 
      where('ownerId', '==', farmOwnerId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cattle));
      docs.sort((a, b) => (a.tagId || '').localeCompare(b.tagId || ''));
      setHerd(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cattle'));

    return () => unsub();
  }, [farmOwnerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !farmOwnerId) return;
    try {
      await addDoc(collection(db, 'cattle'), {
        ...newCattle,
        weight: Number(newCattle.weight),
        purchasePrice: Number(newCattle.purchasePrice),
        ownerId: farmOwnerId,
        updatedAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewCattle({ 
        tagId: '', 
        cowName: '',
        breed: 'Holstein-Friesian', 
        birthDate: format(new Date(), 'yyyy-MM-dd'), 
        gender: 'Female',
        status: 'milking', 
        healthStatus: 'Optimal', 
        weight: 450,
        purchaseDate: format(new Date(), 'yyyy-MM-dd'),
        purchasePrice: 0,
        sireInfo: '',
        damInfo: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'cattle');
    }
  };

  const handleUpdateStatus = async (id: string, status: Cattle['status']) => {
    try {
      await updateDoc(doc(db, 'cattle', id), { status, updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `cattle/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (profile?.role !== 'owner') return;
    if (!confirm('Are you sure you want to delete this cattle record?')) return;
    try {
      await deleteDoc(doc(db, 'cattle', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cattle/${id}`);
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

  const isOwner = profile?.role === 'owner';


  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-mud-900/5 pb-8 sm:pb-12">
        <div>
           <div className="flex items-center space-x-3 text-terracotta-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">
              <Activity className="w-4 h-4" />
              <span>Cattle Herd Management</span>
           </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none">Cattle List</h1>
          <p className="text-[11px] font-bold text-mud-900/40 uppercase tracking-[0.2em] mt-3 italic">Keep a registry of your dairy cows, heifers, calves, and breeds</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="group flex items-center space-x-4 sm:space-x-6 px-6 sm:px-12 py-4 sm:py-6 bg-mud-900 text-cream-100 text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_rgba(38,28,26,0.1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1 w-full md:w-auto justify-center"
        >
          <div className="w-8 h-8 bg-terracotta-500 flex items-center justify-center transition-transform group-hover:rotate-12">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span>Register New Cattle</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
        {loading ? (
          <div className="col-span-full py-24 flex flex-col items-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="mb-6">
              <Activity className="w-12 h-12 text-terracotta-500 opacity-20" />
            </motion.div>
            <p className="font-bold text-[10px] uppercase tracking-[0.4em] opacity-40">Syncing Gene Database...</p>
          </div>
        ) : herd.map((animal) => (
          <motion.div 
            layout
            key={animal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border-2 border-mud-900/5 p-6 sm:p-10 relative overflow-hidden group hover:shadow-xl transition-all"
          >
            <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
              <Cow className="w-32 h-32" />
            </div>
            
            <div className="flex justify-between items-start mb-6 sm:mb-10 relative z-10">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black font-serif italic text-mud-900 tracking-tighter leading-none mb-1 uppercase">{animal.cowName}</h3>
                <div className="flex items-center space-x-2 text-[10px] font-bold text-mud-900/30 uppercase tracking-widest mb-2">
                   <div className="w-3 h-0.5 bg-terracotta-500" />
                   <span>ID: {animal.tagId}</span>
                </div>
                <div className="text-[9px] font-black uppercase text-terracotta-500 tracking-widest">{animal.breed} Heritage | {animal.gender}</div>
              </div>
              <div className={`px-4 py-2 border-2 text-[9px] font-black uppercase tracking-widest ${statusThemes[animal.status]}`}>
                {animal.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 relative z-10">
               <div className="bg-cream-100/30 p-3 sm:p-4 border border-mud-900/5">
                  <div className="flex items-center space-x-2 text-[8px] font-black text-mud-900/30 uppercase tracking-widest mb-1">
                     <Dna className="w-3 h-3" />
                     <span>Genetics</span>
                  </div>
                  <p className="text-[10px] font-bold text-mud-900 uppercase truncate">S: {animal.sireInfo || 'N/A'}</p>
                  <p className="text-[10px] font-bold text-mud-900 uppercase truncate">D: {animal.damInfo || 'N/A'}</p>
               </div>
               <div className="bg-cream-100/30 p-3 sm:p-4 border border-mud-900/5">
                  <div className="flex items-center space-x-2 text-[8px] font-black text-mud-900/30 uppercase tracking-widest mb-1">
                     <ShieldAlert className="w-3 h-3" />
                     <span>Health</span>
                  </div>
                  <p className="text-[10px] font-black text-terracotta-500 uppercase truncate">{animal.healthStatus || 'NOMINAL'}</p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10 relative z-10">
              <div className="p-4 sm:p-6 bg-cream-100/50 border border-mud-900/5 group-hover:bg-white transition-colors">
                <div className="flex items-center space-x-2 sm:space-x-3 text-[9px] font-bold text-mud-900/40 uppercase tracking-widest mb-2">
                   <Weight className="w-3.5 h-3.5 text-ochre-500" />
                   <span>Mass</span>
                </div>
                <span className="text-xl sm:text-2xl font-black text-mud-900">{animal.weight} <span className="text-xs sm:text-sm opacity-30 tracking-widest">KG</span></span>
              </div>
              <div className="p-4 sm:p-6 bg-cream-100/50 border border-mud-900/5 group-hover:bg-white transition-colors">
                <div className="flex items-center space-x-2 sm:space-x-3 text-[9px] font-bold text-mud-900/40 uppercase tracking-widest mb-2">
                   <Calendar className="w-3.5 h-3.5 text-terracotta-500" />
                   <span>Origin</span>
                </div>
                <p className="text-xs font-black uppercase tracking-tighter text-mud-900 truncate">{format(new Date(animal.birthDate), 'MMM yyyy')}</p>
              </div>
            </div>

            {animal.healthStatus && (
              <div className="mb-6 sm:mb-10 p-4 sm:p-6 bg-terracotta-50 border-l-8 border-terracotta-500 shadow-sm">
                <div className="flex items-center text-terracotta-500 text-[10px] font-black uppercase tracking-widest mb-3">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Health Alert Registry
                </div>
                <p className="text-[11px] font-bold text-mud-900 font-serif italic leading-relaxed opacity-80">{animal.healthStatus}</p>
              </div>
            )}

            <div className="flex flex-col gap-6 pt-8 border-t border-mud-900/5">
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[3px] text-mud-900/20">
                 <div className="flex items-center space-x-2">
                    <History className="w-3.5 h-3.5" />
                    <span>State Transitions</span>
                 </div>
                 {isOwner && (
                   <button onClick={() => handleDelete(animal.id)} className="text-terracotta-500 opacity-30 hover:opacity-100 transition-opacity p-2">
                      <Trash2 className="w-4 h-4" />
                   </button>
                 )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['milking', 'dry', 'sick'].map((s) => (
                  <button 
                    key={s}
                    onClick={() => handleUpdateStatus(animal.id, s as any)}
                    className={`
                      py-3 text-[9px] font-black uppercase tracking-widest transition-all border-2
                      ${animal.status === s 
                        ? 'bg-mud-900 text-white border-mud-900 shadow-[4px_4px_0px_#A64B2A]' 
                        : 'bg-white border-mud-900/10 text-mud-900/30 hover:border-mud-900 hover:text-mud-900'}
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-mud-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0"
            />
            <motion.form 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              onSubmit={handleAdd}
              className="relative w-full max-w-2xl bg-white border-4 sm:border-8 border-mud-900 p-6 sm:p-12 md:p-16 shadow-[12px_12px_0px_#A64B2A] sm:shadow-[24px_24px_0px_#A64B2A] bg-pattern overflow-y-auto max-h-[90vh] custom-scrollbar focus-within:outline-none rounded-lg"
            >
               <button type="button" onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 sm:top-8 sm:right-8 text-mud-900/30 hover:text-mud-900 transition-colors">
                  <X className="w-6 h-6 sm:w-8 sm:h-8" />
               </button>
              <h3 className="text-2xl sm:text-4xl font-black font-serif italic uppercase text-mud-900 tracking-tighter mb-6 sm:mb-12 border-b-4 border-mud-900 pb-4 sm:pb-6">
                Register New Cow
              </h3>
              
              <div className="space-y-6 sm:space-y-10">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Cow Name / Code</label>
                  <input 
                    required type="text" placeholder="BERTHA 02"
                    value={newCattle.cowName}
                    onChange={(e) => setNewCattle({...newCattle, cowName: e.target.value.toUpperCase()})}
                    className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white sm:tracking-widest"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Ear Tag ID</label>
                    <input 
                      required type="text" placeholder="EXP-042-SAV"
                      value={newCattle.tagId}
                      onChange={(e) => setNewCattle({...newCattle, tagId: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Dairy Breed Options</label>
                    <select 
                      required
                      value={newCattle.breed}
                      onChange={(e) => setNewCattle({...newCattle, breed: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest cursor-pointer"
                    >
                      {DAIRY_BREED_OPTIONS.map((breedOption) => (
                        <option key={breedOption} value={breedOption}>
                          {breedOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Gender</label>
                    <select 
                      value={newCattle.gender}
                      onChange={(e) => setNewCattle({...newCattle, gender: e.target.value as any})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest cursor-pointer"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Milking / Growth Stage</label>
                    <select 
                      value={newCattle.status}
                      onChange={(e) => setNewCattle({...newCattle, status: e.target.value as any})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest cursor-pointer"
                    >
                      <option value="milking">Milking</option>
                      <option value="dry">Dry</option>
                      <option value="heifer">Heifer</option>
                      <option value="calf">Calf</option>
                      <option value="sick">Medical Attention</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Purchase Date</label>
                    <input 
                      required type="date"
                      value={newCattle.purchaseDate}
                      onChange={(e) => setNewCattle({...newCattle, purchaseDate: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase sm:tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Purchase Cost (KES)</label>
                    <input 
                      required type="number"
                      value={newCattle.purchasePrice}
                      onChange={(e) => setNewCattle({...newCattle, purchasePrice: Number(e.target.value)})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-10">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Date of Birth</label>
                    <input 
                      required type="date"
                      value={newCattle.birthDate}
                      onChange={(e) => setNewCattle({...newCattle, birthDate: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase sm:tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Weight (KG)</label>
                    <input 
                      required type="number"
                      value={newCattle.weight}
                      onChange={(e) => setNewCattle({...newCattle, weight: Number(e.target.value)})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-10 mt-8 sm:mt-12">
                <button type="submit" className="flex-1 py-4 sm:py-6 bg-mud-900 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_#A64B2A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Save Cattle Record</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
