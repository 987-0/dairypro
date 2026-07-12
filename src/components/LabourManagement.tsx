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
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { useToast } from '../lib/ToastContext';
import { 
  Plus, 
  Users, 
  Calendar, 
  User as UserIcon,
  X,
  CreditCard,
  Briefcase,
  Phone,
  Hash,
  Clock,
  Trash2,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useProfile } from '../lib/useProfile';

interface LabourMember {
  id: string;
  workerName: string;
  workerRole: string;
  hireDate: string;
  salaryWage: number;
  contactNumber: string;
  idNumber: string;
  workSchedule: string;
  status: 'Active' | 'Inactive';
  ownerId: string;
}

const statusThemes: any = {
  Active: 'text-leaf-500 bg-leaf-500/10 border-leaf-500',
  Inactive: 'text-mud-900/40 bg-mud-900/5 border-mud-900/10',
};

export const LabourManagement: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile, loading: profileLoading } = useProfile();
  const { showSuccess, showError } = useToast();
  const [labour, setLabour] = useState<LabourMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    workerName: '',
    workerRole: 'Farm Worker',
    hireDate: format(new Date(), 'yyyy-MM-dd'),
    salaryWage: 0,
    contactNumber: '',
    idNumber: '',
    workSchedule: 'Full-time',
    status: 'Active' as const
  });

  useEffect(() => {
    if (!auth.currentUser || !farmOwnerId) return;
    
    const q = query(
      collection(db, 'labour'), 
      where('ownerId', '==', farmOwnerId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LabourMember));
      docs.sort((a, b) => (a.workerName || '').localeCompare(b.workerName || ''));
      setLabour(docs);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'labour'));

    return () => unsub();
  }, [farmOwnerId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !farmOwnerId) return;
    try {
      await addDoc(collection(db, 'labour'), {
        ...newMember,
        salaryWage: Number(newMember.salaryWage),
        ownerId: farmOwnerId,
        createdAt: serverTimestamp()
      });
      showSuccess(`Staff member "${newMember.workerName}" registered successfully!`);
      setShowAddModal(false);
      setNewMember({
        workerName: '',
        workerRole: 'Farm Worker',
        hireDate: format(new Date(), 'yyyy-MM-dd'),
        salaryWage: 0,
        contactNumber: '',
        idNumber: '',
        workSchedule: 'Full-time',
        status: 'Active'
      });
    } catch (err) {
      showError('Failed to register staff member');
      handleFirestoreError(err, OperationType.CREATE, 'labour');
    }
  };

  const handleDelete = async (id: string) => {
    const worker = labour.find(w => w.id === id);
    if (!worker) return;
    if (!confirm("Are you sure you want to delete this worker's record?")) return;
    try {
      await deleteDoc(doc(db, 'labour', id));
      showSuccess(`Staff record for "${worker.workerName}" deleted successfully`, {
        undoAction: async () => {
          const { id: _, ...workerData } = worker;
          await setDoc(doc(db, 'labour', id), workerData);
        }
      });
    } catch (err) {
      showError('Failed to delete staff record');
      handleFirestoreError(err, OperationType.DELETE, `labour/${id}`);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    try {
      const nextStatus = current === 'Active' ? 'Inactive' : 'Active';
      await updateDoc(doc(db, 'labour', id), {
        status: nextStatus
      });
      showSuccess(`Staff status changed to ${nextStatus}`);
    } catch (err) {
      showError('Failed to update staff status');
      handleFirestoreError(err, OperationType.UPDATE, `labour/${id}`);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-12 h-12 border-4 border-terracotta-500/10 border-t-terracotta-500 rounded-full animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-mud-900/30 mt-4">Loading employee details...</span>
      </div>
    );
  }

  const isOwner = profile?.role === 'owner';

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-mud-900/5 pb-12">
        <div>
           <div className="flex items-center space-x-3 text-terracotta-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">
              <Users className="w-4 h-4" />
              <span>Farm Workers</span>
           </div>
          <h1 className="text-5xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none">Staff Management</h1>
          <p className="text-[11px] font-bold text-mud-900/40 uppercase tracking-[0.2em] mt-3 italic">
            {isOwner ? 'Track and manage your farm employees, roles, schedules, and wages' : 'View your farm work colleagues, schedules, and active staff'}
          </p>
        </div>
        {isOwner && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="group flex items-center space-x-6 px-12 py-6 bg-mud-900 text-cream-100 text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_rgba(38,28,26,0.1)] hover:shadow-none transition-all active:translate-x-1 active:translate-y-1"
          >
            <div className="w-8 h-8 bg-terracotta-500 flex items-center justify-center transition-transform group-hover:rotate-12">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span>Add New Worker</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {loading ? (
          <div className="col-span-full py-24 flex flex-col items-center">
            <Activity className="w-12 h-12 text-terracotta-500 animate-pulse opacity-20" />
            <p className="mt-4 font-bold text-[10px] uppercase tracking-[0.4em] opacity-40">Loading staff records...</p>
          </div>
        ) : labour.map((member) => (
          <motion.div 
            layout
            key={member.id}
            className="bg-white border-2 border-mud-900/5 p-6 sm:p-10 relative overflow-hidden group hover:shadow-xl transition-all"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity pointer-events-none">
              <ShieldCheck className="w-32 h-32" />
            </div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h3 className="text-3xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none mb-2">{member.workerName}</h3>
                <div className="flex items-center space-x-2 text-[10px] font-black text-terracotta-500 uppercase tracking-widest">
                   <span>{member.workerRole}</span>
                </div>
              </div>
              <div 
                onClick={() => {
                  if (isOwner) {
                    toggleStatus(member.id, member.status);
                  }
                }}
                className={`px-4 py-2 border-2 text-[9px] font-black uppercase tracking-widest transition-all ${isOwner ? 'cursor-pointer hover:scale-105' : 'cursor-default'} ${statusThemes[member.status]}`}
              >
                {member.status}
              </div>

            </div>

            <div className="space-y-6 mb-10 relative z-10">
               <div className="flex items-center justify-between p-4 bg-cream-100/50 border border-mud-900/5">
                  <div className="flex items-center space-x-4">
                     <CreditCard className="w-4 h-4 text-mud-900/20" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-mud-900/40">Fiscal Remuneration</span>
                  </div>
                  <span className="text-lg font-black font-serif italic text-mud-900">
                    {isOwner ? `KSh ${member.salaryWage.toLocaleString()}` : '••••••'}
                  </span>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cream-100/30 border border-mud-900/5">
                     <div className="flex items-center space-x-3 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-ochre-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-mud-900/40">Hired</span>
                     </div>
                     <span className="text-[10px] font-black text-mud-900 uppercase">{format(new Date(member.hireDate), 'MMM yyyy')}</span>
                  </div>
                  <div className="p-4 bg-cream-100/30 border border-mud-900/5">
                     <div className="flex items-center space-x-3 mb-2">
                        <Clock className="w-3.5 h-3.5 text-terracotta-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-mud-900/40">Schedule</span>
                     </div>
                     <span className="text-[10px] font-black text-mud-900 uppercase">{member.workSchedule}</span>
                  </div>
               </div>

               <div className="space-y-4 pt-4">
                  <div className="flex items-center space-x-4">
                     <Phone className="w-3.5 h-3.5 text-mud-900/20" />
                     <span className="text-[10px] font-bold text-mud-900 font-mono italic">{member.contactNumber || 'NO_CONTACT_LNK'}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                     <Hash className="w-3.5 h-3.5 text-mud-900/20" />
                     <span className="text-[10px] font-bold text-mud-900 font-mono italic">ID: {isOwner ? (member.idNumber || 'NO_IDENT_LOG') : '••••••'}</span>
                  </div>
               </div>
            </div>

            <div className="flex justify-between items-center pt-8 border-t border-mud-900/5">
               <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-mud-900 flex items-center justify-center text-[10px] font-black text-white">{member.workerName[0]}</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-terracotta-500 flex items-center justify-center text-[10px] font-black text-white hover:z-10 transition-all cursor-pointer"><Activity className="w-3 h-3" /></div>
               </div>
                 <button 
                   onClick={() => handleDelete(member.id)} 
                   className="text-terracotta-500 hover:text-white hover:bg-terracotta-500 p-2 rounded transition-colors inline-flex items-center justify-center border-2 border-terracotta-500/20"
                   title="Delete Worker Record"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
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
                Add New Worker
              </h3>
              
              <div className="space-y-6 sm:space-y-8">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Full Name</label>
                  <input 
                    required type="text" placeholder="SAMUEL M. OTIENO"
                    value={newMember.workerName}
                    onChange={(e) => setNewMember({...newMember, workerName: e.target.value.toUpperCase()})}
                    className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white sm:tracking-widest"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Job Role / Title</label>
                    <select 
                      value={newMember.workerRole}
                      onChange={(e) => setNewMember({...newMember, workerRole: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest cursor-pointer"
                    >
                      <option value="Farm Worker">Farm Worker</option>
                      <option value="Dairy Specialist">Dairy Specialist</option>
                      <option value="Health Supervisor">Health Supervisor</option>
                      <option value="Manager">Farm Manager</option>
                      <option value="Security">Site Security</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Monthly Wage (KES)</label>
                    <input 
                      required type="number"
                      value={newMember.salaryWage}
                      onChange={(e) => setNewMember({...newMember, salaryWage: Number(e.target.value)})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Hire Date</label>
                    <input 
                      required type="date"
                      value={newMember.hireDate}
                      onChange={(e) => setNewMember({...newMember, hireDate: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase sm:tracking-widest"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Work Schedule Type</label>
                    <select 
                      value={newMember.workSchedule}
                      onChange={(e) => setNewMember({...newMember, workSchedule: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest cursor-pointer"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Shift-based">Shift / Rotation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Phone Number</label>
                    <input 
                      type="text" placeholder="+254 700 000 000"
                      value={newMember.contactNumber}
                      onChange={(e) => setNewMember({...newMember, contactNumber: e.target.value})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">ID Number (National ID)</label>
                    <input 
                      type="text" placeholder="ID-429-TX-SV"
                      value={newMember.idNumber}
                      onChange={(e) => setNewMember({...newMember, idNumber: e.target.value.toUpperCase()})}
                      className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 sm:p-5 text-sm font-black text-mud-900 outline-none focus:border-terracotta-500 transition-colors focus:bg-white uppercase tracking-widest"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-10 mt-8 sm:mt-12">
                <button type="submit" className="flex-1 py-4 sm:py-6 bg-mud-900 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-[12px_12px_0px_#A64B2A] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Save Worker Record</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
