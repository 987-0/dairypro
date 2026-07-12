import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  MapPin, 
  FileText, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  Search, 
  X, 
  CalendarDays,
  ShieldCheck,
  User,
  SlidersHorizontal,
  Layers,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { useProfile } from '../lib/useProfile';

// UI Event interface matching flat structured storage with nested start/end mapped presentation
interface UIEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
  };
  end: {
    dateTime?: string;
  };
  ownerId?: string;
}

export const Calendar: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile } = useProfile();
  
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for creating/editing events
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  // Deletion confirmation check - safe UX constraints
  const [eventToDelete, setEventToDelete] = useState<UIEvent | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Active database real-time onSnapshot synchronization
  useEffect(() => {
    setLoading(true);
    const schedulesRef = collection(db, 'schedules');

    // Fetch all schedules to allow cross-profile access between default operator and logged-in user levels
    const unsubscribe = onSnapshot(schedulesRef, (snapshot) => {
      const items: UIEvent[] = snapshot.docs.map((d) => {
        const val = d.data();
        return {
          id: d.id,
          summary: val.summary || '',
          description: val.description || '',
          location: val.location || '',
          start: {
            dateTime: val.startDateTime || ''
          },
          end: {
            dateTime: val.endDateTime || ''
          },
          ownerId: val.ownerId || ''
        };
      });

      // Flexible cross-owner client-side match:
      // Includes the specific farmOwnerId, the logged-in Firebase user UID, the default fallback ID, and any legacy/unowned schedules
      const filtered = items.filter(item => {
        const oId = item.ownerId;
        return !oId || oId === farmOwnerId || oId === 'savanna_default_operator' || oId === auth.currentUser?.uid;
      });

      // Sort by start date ascending
      filtered.sort((a, b) => {
        const dateA = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
        const dateB = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
        return dateA - dateB;
      });

      setEvents(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Firestore onSnapshot subscription failed:", error);
      setErrorMsg("Failed to synchronize ecosystem database registry files.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [farmOwnerId]);

  // Dynamic automatic categorization
  const getCategory = (summaryText: string) => {
    const sum = summaryText.toUpperCase();
    if (sum.includes('VACCINATION') || sum.includes('VET') || sum.includes('HEALTH') || sum.includes('🩺') || sum.includes('ANTHRAX') || sum.includes('BRUCELLOSIS')) {
      return { label: 'VETERINARY', bg: 'bg-red-500/10 text-red-600 border border-red-500/20' };
    }
    if (sum.includes('PASTURE') || sum.includes('ROTATION') || sum.includes('FIELDS') || sum.includes('🌾')) {
      return { label: 'PASTURE ROTATION', bg: 'bg-green-500/10 text-green-600 border border-green-500/20' };
    }
    if (sum.includes('LOGISTICS') || sum.includes('VEHICLE') || sum.includes('COLLECTION') || sum.includes('🥛') || sum.includes('DISPATCH')) {
      return { label: 'LOGISTICS', bg: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' };
    }
    if (sum.includes('MILKING') || sum.includes('ROSTER') || sum.includes('🧴') || sum.includes('PARLOUR') || sum.includes('SHIFT')) {
      return { label: 'MILKING OPERATIONS', bg: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
    }
    return { label: 'FARM OPERATION', bg: 'bg-stone-500/10 text-stone-600 border border-stone-500/20' };
  };



  const openAddModal = () => {
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60000); // 1 hour later
    
    const fmtDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const fmtTime = (d: Date) => {
      const hr = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${hr}:${min}`;
    };

    setSummary('');
    setDescription('');
    setLocation('Main Barn');
    setStartDate(fmtDate(now));
    setStartTime(fmtTime(now));
    setEndDate(fmtDate(future));
    setEndTime(fmtTime(future));
    
    setIsEditing(false);
    setSelectedEventId('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (event: UIEvent) => {
    setErrorMsg('');
    setIsEditing(true);
    setSelectedEventId(event.id);
    setSummary(event.summary || '');
    setDescription(event.description || '');
    setLocation(event.location || '');

    const startObj = event.start.dateTime || '';
    const endObj = event.end.dateTime || '';

    if (startObj) {
      const d = new Date(startObj);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
      setStartTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }

    if (endObj) {
      const d = new Date(endObj);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setEndDate(`${year}-${month}-${day}`);
      setEndTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }

    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!summary.trim()) {
      setErrorMsg('Event title/summary is mandatory.');
      return;
    }

    setLoading(true);

    try {
      const startDateTimeStr = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDateTimeStr = new Date(`${endDate}T${endTime}:00`).toISOString();

      if (isEditing) {
        const docRef = doc(db, 'schedules', selectedEventId);
        await updateDoc(docRef, {
          summary: summary.toUpperCase(),
          description,
          location,
          startDateTime: startDateTimeStr,
          endDateTime: endDateTimeStr
        });
        setSuccessMsg('Calendar schedule event updated successfully!');
      } else {
        await addDoc(collection(db, 'schedules'), {
          summary: summary.toUpperCase(),
          description,
          location,
          startDateTime: startDateTimeStr,
          endDateTime: endDateTimeStr,
          ownerId: farmOwnerId
        });
        setSuccessMsg('New calendar schedule event registered!');
      }

      setIsModalOpen(false);
      // Success auto dismiss in 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Operation failed. Please verify dates and database permissions.');
    } finally {
      setLoading(false);
    }
  };

  const triggerDeleteConfirm = (event: UIEvent) => {
    setEventToDelete(event);
    setDeleteConfirmText('');
  };

  const executeDelete = async () => {
    if (!eventToDelete) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const docRef = doc(db, 'schedules', eventToDelete.id);
      await deleteDoc(docRef);
      setSuccessMsg(`Successfully deleted event: "${eventToDelete.summary}"`);
      setEventToDelete(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to remove calendar event from registry.');
    } finally {
      setLoading(false);
    }
  };

  // Formatting date string nicely
  const formatEventTime = (event: UIEvent) => {
    if (event.start.dateTime) {
      const d = new Date(event.start.dateTime);
      const e = event.end.dateTime ? new Date(event.end.dateTime) : null;
      
      const dateString = d.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      }).toUpperCase();

      const startTimeString = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });

      const endTimeString = e ? e.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      return {
        date: dateString,
        time: endTimeString ? `${startTimeString} - ${endTimeString}` : startTimeString,
        isPast: d.getTime() < Date.now()
      };
    }
    return { date: 'UNKNOWN DATE', time: 'N/A', isPast: false };
  };

  const filteredEvents = events.filter(e => {
    const term = searchQuery.toUpperCase();
    const matchesQuery = (
      (e.summary || '').toUpperCase().includes(term) ||
      (e.description || '').toUpperCase().includes(term) ||
      (e.location || '').toUpperCase().includes(term)
    );

    if (categoryFilter === 'ALL') return matchesQuery;
    const cat = getCategory(e.summary).label;
    return matchesQuery && cat === categoryFilter;
  });

  // Calculate quick metrics for schedules
  const totalUpcoming = events.filter(e => e.start.dateTime && new Date(e.start.dateTime).getTime() >= Date.now()).length;
  const totalPast = events.length - totalUpcoming;

  return (
    <div className="space-y-8 p-4 sm:p-10 max-w-7xl mx-auto z-10 relative">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b-4 border-mud-900 pb-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-terracotta-500 bg-terracotta-500/10 px-3 py-1 font-mono">
              Farm Operations
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600 bg-emerald-50 px-2 py-1 font-mono border border-emerald-300/30 rounded-xs">
              Connected
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-mud-900 font-serif italic">
            Farm Calendar
          </h1>
          <p className="text-xs font-bold text-mud-900/50 uppercase tracking-widest mt-1">
            Calendar schedule and tasks for {profile?.farmDetails?.farmName || "SAVANNA FARM"}.
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="flex items-center justify-center space-x-2 px-6 py-4 bg-mud-900 text-cream-100 font-black uppercase tracking-widest text-xs border-2 border-mud-900 hover:bg-white hover:text-mud-900 transition-all shadow-[6px_6px_0px_rgba(38,28,26,0.15)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Farm task</span>
        </button>
      </div>

      {/* Database sync messages */}
      {errorMsg && (
        <div className="p-4 bg-terracotta-500/10 border-l-4 border-terracotta-500 text-xs font-black uppercase text-terracotta-500 tracking-widest flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-leaf-500/10 border-l-4 border-leaf-500 text-xs font-black uppercase text-leaf-500 tracking-widest flex items-center space-x-3 duration-300">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filtering Sidebar on Left (1 col on large) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border-4 border-mud-900 p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-terracotta-500 mb-4 pb-2 border-b border-mud-900/10">
              <ListFilter className="w-4 h-4 stroke-[2.5]" />
              <h2 className="text-[10px] font-black uppercase tracking-widest font-mono">Operation Filters</h2>
            </div>

            <div className="space-y-2">
              {[
                { id: 'ALL', label: 'All Operations' },
                { id: 'VETERINARY', label: '🩺 Veterinary Care' },
                { id: 'PASTURE ROTATION', label: '🌾 Pasture Rotation' },
                { id: 'LOGISTICS', label: '🥛 Supply & Logistics' },
                { id: 'MILKING OPERATIONS', label: '🧴 Milking Roster' },
                { id: 'FARM OPERATION', label: '🚜 General Operations' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`w-full text-left px-3 py-2.5 font-mono text-[10px] font-bold uppercase border-2 transition-all rounded ${
                    categoryFilter === cat.id
                      ? 'bg-mud-900 text-cream-100 border-mud-900 translate-x-1'
                      : 'bg-cream-100/50 text-mud-900 border-transparent hover:bg-cream-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats overview card */}
          <div className="bg-stone-50 border-4 border-mud-900 p-5 font-mono text-xs space-y-3">
            <div className="flex justify-between items-center bg-white p-3 border border-mud-900/10 rounded">
              <span className="text-[10px] uppercase font-black text-mud-900/50">Active Roster</span>
              <span className="font-extrabold text-terracotta-500 text-base">{totalUpcoming}</span>
            </div>
            <div className="flex justify-between items-center bg-white p-3 border border-mud-900/10 rounded">
              <span className="text-[10px] uppercase font-black text-mud-900/50">Completed Tasks</span>
              <span className="font-extrabold text-mud-900/50 text-base">{totalPast}</span>
            </div>
          </div>

          {/* Farm Roster Health */}
          <div className="bg-white border-4 border-mud-900 p-5 shadow-sm relative overflow-hidden">
            <h2 className="text-[11px] font-black uppercase tracking-widest mb-4 pb-2 border-b border-mud-900/10">Farm Roster Health</h2>
            <div className="space-y-4 font-mono text-[10px]">
              <div>
                <div className="flex justify-between font-bold uppercase mb-1">
                  <span>Veterinary Care</span>
                  <span>{events.filter(e => getCategory(e.summary).label === 'VETERINARY').length}</span>
                </div>
                <div className="w-full bg-cream-100 h-2 border border-mud-900/15">
                  <div className="bg-red-500 h-full animate-pulse-subtle" style={{ width: `${(events.filter(e => getCategory(e.summary).label === 'VETERINARY').length / (events.length || 1)) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold uppercase mb-1">
                  <span>Pasture Rotation</span>
                  <span>{events.filter(e => getCategory(e.summary).label === 'PASTURE ROTATION').length}</span>
                </div>
                <div className="w-full bg-cream-100 h-2 border border-mud-900/15">
                  <div className="bg-green-500 h-full" style={{ width: `${(events.filter(e => getCategory(e.summary).label === 'PASTURE ROTATION').length / (events.length || 1)) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold uppercase mb-1">
                  <span>Supply & Logistics</span>
                  <span>{events.filter(e => getCategory(e.summary).label === 'LOGISTICS').length}</span>
                </div>
                <div className="w-full bg-cream-100 h-2 border border-mud-900/15">
                  <div className="bg-blue-500 h-full" style={{ width: `${(events.filter(e => getCategory(e.summary).label === 'LOGISTICS').length / (events.length || 1)) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-bold uppercase mb-1">
                  <span>Milking Shifts</span>
                  <span>{events.filter(e => getCategory(e.summary).label === 'MILKING OPERATIONS').length}</span>
                </div>
                <div className="w-full bg-cream-100 h-2 border border-mud-900/15">
                  <div className="bg-amber-500 h-full" style={{ width: `${(events.filter(e => getCategory(e.summary).label === 'MILKING OPERATIONS').length / (events.length || 1)) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Native Schedule Hub */}
          <div className="bg-mud-900 text-cream-100 p-5 shadow-sm border-4 border-mud-900 relative">
            <h3 className="font-serif italic font-black text-sm uppercase tracking-tight mb-2">Native Schedule Hub</h3>
            <p className="text-[10px] text-cream-100/75 uppercase leading-relaxed font-sans mb-4">
              Google Calendar sync is disabled on this station. All tasks are cached locally and synchronized through secure Firebase Cloud Firestore clusters immediately.
            </p>
            <div className="flex items-center space-x-2 text-[9px] font-mono text-terracotta-400 font-extrabold tracking-widest uppercase">
              <ShieldCheck className="w-4 h-4 stroke-[2]" />
              <span>Verified Isolated Ledger</span>
            </div>
          </div>
        </div>

        {/* List and Search of Events (3 cols on large) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter and Search Actions bar */}
          <div className="relative border-4 border-mud-900 bg-white shadow-sm flex items-center">
            <div className="px-5 text-mud-900/40">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              placeholder="SEARCH SCHEDULE REGISTRY BY KEYWORDS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-5 pr-5 bg-transparent border-0 font-bold text-xs uppercase tracking-widest text-mud-900 leading-none focus:outline-none focus:bg-cream-100/30 transition-colors"
            />
          </div>

          {/* Roster entries */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-20 bg-white border-4 border-dashed border-mud-900/10 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-terracotta-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-mud-900/40">
                  Acquiring Ecosystem Schedule Payload...
                </span>
              </div>
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const timeDetails = formatEventTime(event);
                const catTheme = getCategory(event.summary);
                return (
                  <motion.div
                    layout
                    key={event.id}
                    className={`bg-white border-4 border-mud-900 p-6 hover:shadow-[6px_6px_0px_#A64B2A] transition-all relative ${
                      timeDetails.isPast ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(event)}
                        className="p-1.5 bg-cream-100 hover:bg-mud-900 hover:text-cream-100 text-mud-900 transition-colors border border-mud-900/30 rounded"
                        title="Edit Task Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => triggerDeleteConfirm(event)}
                        className="p-1.5 bg-terracotta-500/10 hover:bg-terracotta-500 hover:text-white text-terracotta-500 transition-colors border border-terracotta-500/30 rounded"
                        title="Cancel/Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Badges info */}
                    <div className="mb-3 pr-28 flex flex-wrap items-center gap-2">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded ${catTheme.bg}`}>
                        {catTheme.label}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-widest bg-mud-900 text-cream-100 px-2 py-0.5 rounded">
                        {timeDetails.isPast ? 'COMPLETED TASK' : 'ACTIVE SCHEDULE'}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-mud-900 leading-snug break-words pr-24">
                      {event.summary}
                    </h3>

                    {/* Schedule parameters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold text-mud-900/70 uppercase tracking-wider border-t border-b border-mud-900/5 py-3 my-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-terracotta-500 stroke-[2.5]" />
                        <span>{timeDetails.date} @ {timeDetails.time}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-ochre-500 stroke-[2.5]" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Event description */}
                    {event.description && (
                      <div className="text-[11px] text-mud-900/60 font-medium leading-relaxed font-sans whitespace-pre-wrap">
                        {event.description}
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-20 bg-white border-4 border-dashed border-mud-900/10">
                <p className="text-xs font-bold text-mud-900/40 uppercase tracking-widest">
                  {categoryFilter === 'ALL' 
                    ? 'No dairy schedule logs match search parameters.' 
                    : `No tasks found for ${categoryFilter} category.`}
                </p>
                <button 
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center justify-center space-x-2 px-6 py-3 bg-cream-100 border-2 border-mud-900 text-mud-900 font-extrabold text-[10px] uppercase tracking-widest hover:bg-mud-900 hover:text-white transition-all rounded"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register first event entry</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* UX Check deletion modal check */}
      <AnimatePresence>
        {eventToDelete && (
          <div className="fixed inset-0 bg-mud-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-4 border-mud-900 p-6 sm:p-10 max-w-lg w-full shadow-[24px_24px_0px_#A64B2A] relative text-stone-900"
            >
              <div className="p-4 bg-terracotta-500/10 border-l-4 border-terracotta-500 text-xs font-black uppercase text-terracotta-500 tracking-widest mb-6 flex items-center space-x-3">
                <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                <div>
                  <span className="block text-[10px] font-black tracking-widest text-terracotta-600 leading-none mb-1">PLEASE CONFIRM</span>
                  <span>DELETE CALENDAR EVENT</span>
                </div>
              </div>

              <h2 className="text-xl font-black uppercase tracking-tight text-mud-900 font-serif mb-4">
                Confirm Deletion of Farm Task?
              </h2>

              <p className="text-xs font-semibold text-mud-900/60 leading-relaxed mb-6 font-sans">
                You are about to permanently delete the calendar task:
                <span className="block mt-2 p-3 bg-cream-100 font-mono font-black text-mud-900 rounded text-xs">
                  {eventToDelete.summary}
                </span>
                This action cannot be undone.
              </p>

              <div className="mb-6">
                <label className="block text-[9px] font-black uppercase tracking-widest text-mud-900/40 mb-2">
                  To confirm, type "<strong className="text-mud-900 font-serif lowercase">delete</strong>" below:
                </label>
                <input
                  type="text"
                  placeholder="Type delete..."
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-3 bg-cream-100 border-2 border-mud-900 font-bold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  className="w-full sm:w-1/3 px-4 py-4 border-4 border-mud-900 bg-white hover:bg-cream-100 text-mud-900 font-black uppercase tracking-wide text-[10px] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete' || loading}
                  className="w-full sm:w-2/3 px-4 py-4 bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-40 text-cream-100 font-black uppercase tracking-wide text-[10px] border-4 border-mud-900 transition-colors shadow-sm"
                >
                  {loading ? 'Deleting...' : 'DELETE TASK'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation/Editing sliding form modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-mud-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white border-4 border-mud-900 p-6 sm:p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-[16px_16px_0px_rgba(0,0,0,0.1)] relative"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-2 bg-cream-100 hover:bg-mud-900 hover:text-cream-100 text-mud-900 transition-colors border border-mud-900/20"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 border-b border-mud-900/10 pb-4">
                <span className="text-[9px] font-black tracking-widest uppercase text-terracotta-500 font-mono">
                  {isEditing ? 'Edit Event' : 'New Event'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-mud-900 font-serif italic">
                  {isEditing ? 'Edit Scheduled Task' : 'Add Calendar Event'}
                </h2>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-5 font-sans text-xs font-semibold">
                
                {/* Event Title */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2 font-mono">
                    Event Title / Summary
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PASTURE SECTOR ROTATION"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full px-4 py-3.5 bg-cream-100 border-2 border-mud-900 font-extrabold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Date & Time bounds */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2 font-mono">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (!endDate || new Date(e.target.value) > new Date(endDate)) {
                          setEndDate(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-3.5 bg-cream-100 border-2 border-mud-900 font-extrabold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2 font-mono">
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3.5 bg-cream-100 border-2 border-mud-900 font-extrabold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* End Date */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2 font-mono">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3.5 bg-cream-100 border-2 border-mud-900 font-extrabold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2 font-mono">
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3.5 bg-cream-100 border-2 border-mud-900 font-extrabold text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location area */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2 font-mono">
                    Event Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Milking Parlor"
                    className="w-full px-4 py-3.5 bg-cream-100 border-2 border-mud-900 font-extrabold text-xs uppercase tracking-widest focus:bg-white focus:outline-none transition-colors"
                  />
                </div>

                {/* Descriptive logs */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-mud-900/60 mb-2 font-mono">
                    Description & Notes
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide specific notes, vaccines, tag IDs or checklist items for staff..."
                    className="w-full px-4 py-3.5 bg-cream-100 border-2 border-mud-900 font-extrabold text-xs focus:bg-white focus:outline-none transition-colors font-sans"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-mud-900/10 font-mono">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-1/3 px-5 py-4 border-2 border-mud-900 bg-white hover:bg-cream-100 text-mud-900 font-black uppercase tracking-widest text-[10px]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 px-5 py-4 bg-mud-900 text-white hover:bg-terracotta-500 font-black uppercase tracking-widest text-[10px] border-2 border-mud-900 hover:border-terracotta-500 shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : isEditing ? 'SAVE CHANGES' : 'SAVE CALENDAR EVENT'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
