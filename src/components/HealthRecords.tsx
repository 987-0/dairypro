import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy,
  serverTimestamp,
  where,
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
  Stethoscope, 
  Calendar, 
  User as UserIcon,
  Activity,
  History,
  X,
  PlusCircle,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface HealthRecord {
  id: string;
  cowId: string;
  cowTag?: string; // Optional join
  eventDate: string;
  eventType: string;
  description: string;
  veterinarian: string;
  cost: number;
  medicationGiven: string;
  nextDueDate: string;
  status: string;
  ownerId: string;
}

interface Cattle {
  id: string;
  tagId: string;
  cowName: string;
}

export const HealthRecords: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile, loading: profileLoading } = useProfile();
  const { showSuccess, showError } = useToast();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [herd, setHerd] = useState<Cattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    cowId: '',
    eventDate: format(new Date(), 'yyyy-MM-dd'),
    eventType: 'Vaccination',
    description: '',
    veterinarian: '',
    cost: 0,
    medicationGiven: '',
    nextDueDate: '',
    status: 'Scheduled'
  });

  useEffect(() => {
    if (!auth.currentUser || !farmOwnerId) return;
    
    // Fetch records
    const qRec = query(
      collection(db, 'health'), 
      where('ownerId', '==', farmOwnerId)
    );
    const unsubRec = onSnapshot(qRec, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthRecord));
      docs.sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''));
      setRecords(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'health'));

    // Fetch herd for dropdown
    const qHerd = query(
      collection(db, 'cattle'),
      where('ownerId', '==', farmOwnerId)
    );
    const unsubHerd = onSnapshot(qHerd, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cattle));
      setHerd(docs);
    });

    return () => {
      unsubRec();
      unsubHerd();
    };
  }, [farmOwnerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !farmOwnerId) return;
    try {
      await addDoc(collection(db, 'health'), {
        ...newRecord,
        cost: Number(newRecord.cost),
        ownerId: farmOwnerId,
        createdAt: serverTimestamp()
      });
      showSuccess(`Health record registered successfully!`);
      setShowAddModal(false);
      setNewRecord({
        cowId: '',
        eventDate: format(new Date(), 'yyyy-MM-dd'),
        eventType: 'Vaccination',
        description: '',
        veterinarian: '',
        cost: 0,
        medicationGiven: '',
        nextDueDate: '',
        status: 'Scheduled'
      });
    } catch (err) {
      showError('Failed to register health record');
      handleFirestoreError(err, OperationType.CREATE, 'health');
    }
  };

  const handleDelete = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (!record) return;
    if (!confirm('Are you sure you want to delete this health record?')) return;
    try {
      await deleteDoc(doc(db, 'health', id));
      showSuccess(`Health record deleted successfully`, {
        undoAction: async () => {
          const { id: _, ...recordData } = record;
          await setDoc(doc(db, 'health', id), recordData);
        }
      });
    } catch (err) {
      showError('Failed to delete health record');
      handleFirestoreError(err, OperationType.DELETE, `health/${id}`);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-mud-900/5 pb-12">
        <div>
           <div className="flex items-center space-x-3 text-terracotta-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">
              <Stethoscope className="w-4 h-4" />
              <span>Cattle Health Logs</span>
           </div>
          <h1 className="text-5xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none">Health Records</h1>
          <p className="text-[11px] font-bold text-mud-900/40 uppercase tracking-[0.2em] mt-3 italic">Keep track of veterinary treatments, vaccinations, and deworming</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="group flex items-center space-x-6 px-12 py-6 bg-mud-900 text-cream-100 text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_rgba(38,28,26,0.1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1"
        >
          <div className="w-8 h-8 bg-terracotta-500 flex items-center justify-center transition-transform group-hover:rotate-12">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <span>Add Health Record</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-24 flex flex-col items-center">
            <Activity className="w-12 h-12 text-terracotta-500 animate-pulse opacity-20" />
            <p className="mt-4 font-bold text-[10px] uppercase tracking-[0.4em] opacity-40">Loading health records...</p>
          </div>
        ) : records.map((record) => {
          const cow = herd.find(c => c.id === record.cowId);
          return (
            <motion.div 
              layout
              key={record.id}
              className="bg-white border-2 border-mud-900/5 p-8 relative overflow-hidden group hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start mb-8 border-b-2 border-mud-900/5 pb-6">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-terracotta-500 bg-terracotta-50 px-3 py-1 border border-terracotta-500/20">{record.eventType}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-mud-900/40">{format(new Date(record.eventDate), 'dd MMM yyyy')}</span>
                  </div>
                  <h3 className="text-2xl font-black font-serif italic text-mud-900 uppercase tracking-tight">
                    {cow ? `${cow.cowName} (${cow.tagId})` : 'Unknown Cattle'}
                  </h3>
                </div>
                <button 
                  onClick={() => handleDelete(record.id)} 
                  className="text-terracotta-500 hover:text-white hover:bg-terracotta-500 p-2 rounded transition-colors inline-flex items-center justify-center border-2 border-terracotta-500/20"
                  title="Delete Health Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <UserIcon className="w-4 h-4 text-mud-900/20 mt-1" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-mud-900/40">Veterinarian</p>
                      <p className="text-xs font-bold text-mud-900 uppercase">{record.veterinarian || 'Internal Staff'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <PlusCircle className="w-4 h-4 text-mud-900/20 mt-1" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-mud-900/40">Medicine Given</p>
                      <p className="text-xs font-bold text-mud-900 uppercase">{record.medicationGiven || 'None Administered'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <DollarSign className="w-4 h-4 text-mud-900/20 mt-1" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-mud-900/40">Treatment Cost</p>
                      <p className="text-sm font-black text-mud-900 uppercase">KSh {record.cost.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Clock className="w-4 h-4 text-mud-900/20 mt-1" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-mud-900/40">Next Treatment Due</p>
                      <p className="text-xs font-bold text-terracotta-500 uppercase">{record.nextDueDate ? format(new Date(record.nextDueDate), 'dd MMM yyyy') : 'No Follow-up'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-cream-100/50 p-6 border border-mud-900/5">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-3 h-3 text-mud-900/40" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-mud-900/40">Vet Notes & Symptoms</span>
                </div>
                <p className="text-[11px] font-bold text-mud-900 leading-relaxed font-serif italic">{record.description}</p>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                   <div className={`w-2 h-2 rounded-full ${record.status === 'Completed' ? 'bg-leaf-500' : 'bg-ochre-500'}`} />
                   <span className="text-[9px] font-black uppercase tracking-widest text-mud-900/60 font-sans">{record.status}</span>
                </div>
                <button className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-terracotta-500 hover:text-mud-900 transition-colors">
                  <span>View Details</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-mud-900/90 backdrop-blur-md"
            />
            <motion.form 
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              onSubmit={handleAdd}
              className="relative w-full max-w-2xl bg-white border-4 sm:border-8 border-mud-900 p-6 sm:p-12 md:p-16 shadow-[12px_12px_0px_#A64B2A] sm:shadow-[24px_24px_0px_#A64B2A] bg-pattern overflow-y-auto max-h-[90vh] custom-scrollbar rounded-lg focus-within:outline-none"
            >
               <button type="button" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 sm:top-8 sm:right-8 text-mud-900/30 hover:text-mud-900 transition-colors">
                  <X className="w-6 h-6 sm:w-8 sm:h-8" />
               </button>
              <h3 className="text-2xl sm:text-4xl font-black font-serif italic uppercase text-mud-900 tracking-tighter mb-6 sm:mb-12 border-b-4 border-mud-900 pb-6">
                Add Health Record
              </h3>
              
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Cow Name / Tag ID</label>
                    <select 
                      required
                      value={newRecord.cowId}
                      onChange={(e) => setNewRecord({...newRecord, cowId: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest appearance-none"
                    >
                      <option value="">SELECT CATTLE</option>
                      {herd.map(cow => (
                        <option key={cow.id} value={cow.id}>{cow.cowName} - {cow.tagId}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Event Date</label>
                    <input 
                      required type="date"
                      value={newRecord.eventDate}
                      onChange={(e) => setNewRecord({...newRecord, eventDate: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase sm:tracking-widest"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Record Type</label>
                    <select 
                      value={newRecord.eventType}
                      onChange={(e) => setNewRecord({...newRecord, eventType: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest"
                    >
                      <option value="Vaccination">Vaccination</option>
                      <option value="De-worming">De-worming</option>
                      <option value="Infection">Infection</option>
                      <option value="Injury">Injury</option>
                      <option value="Pregnancy Check">Pregnancy Check</option>
                      <option value="Calving">Calving</option>
                      <option value="General Exam">General Exam</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Treatment Cost (KES)</label>
                    <input 
                      required type="number"
                      value={newRecord.cost}
                      onChange={(e) => setNewRecord({...newRecord, cost: Number(e.target.value)})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Veterinarian</label>
                    <input 
                      type="text" placeholder="DR. STEVENS"
                      value={newRecord.veterinarian}
                      onChange={(e) => setNewRecord({...newRecord, veterinarian: e.target.value.toUpperCase()})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Medicine Given</label>
                    <input 
                      type="text" placeholder="ALBENDAZOLE 10%"
                      value={newRecord.medicationGiven}
                      onChange={(e) => setNewRecord({...newRecord, medicationGiven: e.target.value.toUpperCase()})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Next Follow-up Date</label>
                    <input 
                      type="date"
                      value={newRecord.nextDueDate}
                      onChange={(e) => setNewRecord({...newRecord, nextDueDate: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Status</label>
                    <select 
                      value={newRecord.status}
                      onChange={(e) => setNewRecord({...newRecord, status: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Ongoing">Ongoing</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Symptoms & Treatment Notes</label>
                  <textarea 
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({...newRecord, description: e.target.value})}
                    rows={4}
                    className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-6 text-xs font-bold text-mud-900 outline-none resize-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    placeholder="Enter vaccination details, symptoms noticed, dosages given, etc..."
                  />
                </div>
              </div>

              <div className="flex gap-10 mt-16">
                <button type="submit" className="flex-1 py-6 bg-mud-900 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_#A64B2A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Save Health Record</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
