import React, { useState } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { 
  FileText, 
  Download, 
  Database, 
  Clock, 
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  ChevronRight,
  Activity,
  History,
  ShieldCheck,
  Filter,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useProfile } from '../lib/useProfile';

type DatasetType = 'cattle' | 'production' | 'finance' | 'health' | 'labour';
type FormatType = 'csv' | 'json';

interface DatasetConfig {
  id: DatasetType;
  name: string;
  description: string;
  icon: any;
  endpoint: string;
}

const DATASETS: DatasetConfig[] = [
  { id: 'cattle', name: 'Cattle Herd', description: 'Cows, heifers, calves, and breed records', icon: Activity, endpoint: 'cattle' },
  { id: 'production', name: 'Milk Yields', description: 'Daily milking volumes and collections', icon: History, endpoint: 'production' },
  { id: 'finance', name: 'Financial Records', description: 'Income, expense transactions, and sales', icon: DollarSign, endpoint: 'transactions' },
  { id: 'health', name: 'Health Records', description: 'Animal illnesses, treatments, and vaccinations', icon: Activity, endpoint: 'health' },
  { id: 'labour', name: 'Employee Records', description: 'Workers, roles, work schedules, and wages', icon: ShieldCheck, endpoint: 'labour' },
];

export const Reports: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const { profile, loading: profileLoading } = useProfile();
  const [selectedDatasets, setSelectedDatasets] = useState<DatasetType[]>(['cattle']);
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('csv');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error', message?: string }>({ type: 'idle' });

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-pulse">
        <div className="w-12 h-12 border-4 border-terracotta-500/10 border-t-terracotta-500 rounded-full animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-mud-900/30 mt-4">Resolving Authority Tier...</span>
      </div>
    );
  }

  const isOwner = profile?.role === 'owner';
  const allowedDatasets = DATASETS.filter(d => isOwner || (d.id !== 'finance' && d.id !== 'labour'));

  const toggleDataset = (id: DatasetType) => {
    // Prevent unallowed dataset selection for workers
    if (!isOwner && (id === 'finance' || id === 'labour')) return;

    setSelectedDatasets(prev => 
      prev.includes(id) 
        ? (prev.length > 1 ? prev.filter(d => d !== id) : prev) 
        : [...prev, id]
    );
  };


  const convertToCSV = (data: any[], title: string) => {
    if (data.length === 0) return `--- NO DATA FOR ${title} ---\n`;
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
      headers.map(header => {
        let val = obj[header];
        if (val && typeof val === 'object' && val.toDate) {
          val = format(val.toDate(), 'yyyy-MM-dd HH:mm:ss');
        }
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',')
    );
    return `\n=== UNIT: ${title} ===\n` + [headers.join(','), ...rows].join('\n');
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateReport = async () => {
    if (!auth.currentUser || !farmOwnerId || selectedDatasets.length === 0) return;
    setGenerating(true);
    setStatus({ type: 'idle' });

    try {
      const combinedData: Record<string, any[]> = {};
      let totalRecords = 0;

      for (const dsId of selectedDatasets) {
        const config = DATASETS.find(d => d.id === dsId);
        if (!config) continue;

        // Apply owner filter
        let q = query(
          collection(db, config.endpoint), 
          where('ownerId', '==', farmOwnerId)
        );

        const snap = await getDocs(q);
        let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Manual date filtering (since Firestore composite indices vary)
        const start = new Date(dateRange.start).getTime();
        const end = new Date(dateRange.end).getTime() + 86400000; // Include full end day

        docs = docs.filter((d: any) => {
          const timestamp = d.timestamp?.toDate ? d.timestamp.toDate().getTime() : 
                           d.date?.toDate ? d.date.toDate().getTime() :
                           d.eventDate ? new Date(d.eventDate).getTime() :
                           d.hireDate ? new Date(d.hireDate).getTime() : 
                           d.birthDate ? new Date(d.birthDate).getTime() : 0;
          
          if (!timestamp) return true; // Include if no date field for safety
          return timestamp >= start && timestamp <= end;
        });

        combinedData[dsId] = docs;
        totalRecords += docs.length;
      }

      if (totalRecords === 0) {
        setStatus({ type: 'error', message: 'No records found in this date range.' });
        setGenerating(false);
        return;
      }

      const fileName = `savanna_farm_report_${selectedDatasets.length}_datasets_${format(new Date(), 'yyyyMMdd')}.${selectedFormat}`;
      
      if (selectedFormat === 'csv') {
        let fullCsv = `SAVANNA DAIRY FARM REPORT\nGENERATED: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\nPERIOD: ${dateRange.start} TO ${dateRange.end}\n`;
        Object.entries(combinedData).forEach(([key, val]) => {
          fullCsv += convertToCSV(val, key.toUpperCase());
        });
        downloadFile(fullCsv, fileName, 'text/csv;charset=utf-8;');
      } else {
        const jsonContent = JSON.stringify({
          metadata: {
            generatedAt: new Date().toISOString(),
            period: dateRange,
            datasets: selectedDatasets
          },
          payload: combinedData
        }, null, 2);
        downloadFile(jsonContent, fileName, 'application/json;charset=utf-8;');
      }

      setStatus({ type: 'success', message: `Report generated successfully. Exported ${totalRecords} records.` });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'reports_combined');
      setStatus({ type: 'error', message: 'Export failed. Please check your internet connection or try again.' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b-4 border-mud-900/5 pb-16">
        <div className="max-w-2xl">
           <div className="flex items-center space-x-3 text-terracotta-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4">
              <Database className="w-4 h-4" />
              <span>Download Farm Reports</span>
           </div>
          <h1 className="text-6xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none mb-6">Reports & Exports</h1>
          <p className="text-sm font-bold text-mud-900 opacity-60 leading-relaxed max-w-xl">
            Export your farm records to Excel-compatible CSV files or JSON data. Choose your files, range, and format below.
          </p>
        </div>
        <div className="hidden lg:block">
           <div className="bg-mud-900 p-8 shadow-[12px_12px_0px_#A64B2A] text-cream-100">
              <div className="flex items-center space-x-4 mb-4">
                 <ShieldCheck className="w-6 h-6 text-terracotta-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">Status: Connected</span>
              </div>
              <p className="text-[9px] font-mono opacity-40 uppercase">Account ID: {auth.currentUser?.uid.slice(0, 16)}...</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
        {/* Step 1: Dataset Selection */}
        <div className="space-y-10">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-mud-900 text-cream-100 flex items-center justify-center text-xs font-black">01</div>
            <h2 className="text-xl font-black font-serif italic uppercase tracking-tight text-mud-900">Choose What to Export</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {allowedDatasets.map((dataset) => {
              const isSelected = selectedDatasets.includes(dataset.id);
              return (
                <button
                  key={dataset.id}
                  onClick={() => toggleDataset(dataset.id)}
                  className={`group flex items-center p-6 border-4 transition-all text-left relative overflow-hidden ${
                    isSelected 
                    ? "border-terracotta-500 bg-white shadow-[8px_8px_0px_rgba(166,75,42,0.1)]" 
                    : "border-mud-900/5 bg-transparent hover:border-mud-900/20"
                  }`}
                >
                  {isSelected && (
                    <motion.div layoutId="activeTag" className="absolute right-4 top-4 w-4 h-4 bg-terracotta-500 rounded-full flex items-center justify-center">
                       <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                  <div className={`p-4 mr-6 transition-colors ${isSelected ? 'bg-terracotta-500 text-white' : 'bg-mud-900/5 text-mud-900/20 group-hover:text-mud-900'}`}>
                    <dataset.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className={`block text-xs font-black uppercase tracking-[0.2em] mb-1 ${isSelected ? 'text-mud-900' : 'text-mud-900/40'}`}>
                      {dataset.name}
                    </span>
                    <span className="text-[9px] font-bold text-mud-900/30 uppercase leading-none">{dataset.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Format & Parameters */}
        <div className="space-y-10">
           <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-mud-900 text-cream-100 flex items-center justify-center text-xs font-black">02</div>
            <h2 className="text-xl font-black font-serif italic uppercase tracking-tight text-mud-900">Set Date & Format</h2>
          </div>

          <div className="bg-white p-10 border-4 border-mud-900 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-terracotta-500" />
             <div className="space-y-12">
                <div className="space-y-6">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Date Range</label>
                   <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                         <span className="text-[8px] font-black uppercase text-mud-900/30 ml-1">Start Date</span>
                         <input 
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-terracotta-500 transition-colors"
                         />
                      </div>
                      <div className="space-y-2">
                         <span className="text-[8px] font-black uppercase text-mud-900/30 ml-1">End Date</span>
                         <input 
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            className="w-full bg-cream-100/50 border-2 border-mud-900/5 p-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-terracotta-500 transition-colors"
                         />
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">File Format</label>
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setSelectedFormat('csv')}
                        className={`flex flex-col items-center p-8 border-2 transition-all ${
                          selectedFormat === 'csv' 
                          ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-500' 
                          : 'border-mud-900/5 bg-cream-100/50 text-mud-900/20 hover:border-mud-900/20'
                        }`}
                      >
                         <FileSpreadsheet className="w-8 h-8 mb-4" />
                         <span className="text-[11px] font-black uppercase tracking-widest">CSV Format</span>
                      </button>
                      <button 
                        onClick={() => setSelectedFormat('json')}
                        className={`flex flex-col items-center p-8 border-2 transition-all ${
                          selectedFormat === 'json' 
                          ? 'border-ochre-500 bg-ochre-50 text-ochre-500' 
                          : 'border-mud-900/5 bg-cream-100/50 text-mud-900/20 hover:border-mud-900/20'
                        }`}
                      >
                         <FileCode className="w-8 h-8 mb-4" />
                         <span className="text-[11px] font-black uppercase tracking-widest">JSON Object</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-6">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-mud-900/40 px-1">Items to Export</label>
                   <div className="p-6 bg-cream-100/50 border-2 border-mud-900/5 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                         <Filter className="w-4 h-4 text-mud-900/20" />
                         <span className="text-[10px] font-bold text-mud-900/40 uppercase">Selected Tables</span>
                      </div>
                      <span className="px-3 py-1 bg-mud-900 text-white text-[9px] font-black uppercase">{selectedDatasets.length} Units</span>
                   </div>
                </div>

                <div className="pt-8 border-t border-mud-900/5">
                   <div className="flex items-start space-x-4 p-4 bg-terracotta-50/50 border border-terracotta-500/10">
                      <AlertCircle className="w-4 h-4 text-terracotta-500 mt-0.5" />
                      <p className="text-[9px] font-bold text-mud-900 opacity-60 leading-relaxed uppercase">
                        Generative processes are limited to current authorization token session.
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Step 3: Generation Status */}
        <div className="space-y-10">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-mud-900 text-cream-100 flex items-center justify-center text-xs font-black">03</div>
            <h2 className="text-xl font-black font-serif italic uppercase tracking-tight text-mud-900">Generate File</h2>
          </div>

          <div className="space-y-8">
            <button
               onClick={generateReport}
               disabled={generating}
               className="group w-full bg-mud-900 text-cream-100 p-12 shadow-[12px_12px_10px_rgba(0,0,0,0.05)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex flex-col items-center disabled:opacity-50 border-8 border-mud-900/5"
            >
               <div className="w-20 h-20 bg-terracotta-500 flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform">
                 {generating ? <Activity className="w-10 h-10 text-white animate-spin" /> : <Download className="w-10 h-10 text-white" />}
               </div>
               <span className="text-lg font-black font-serif italic uppercase tracking-tighter mb-2">Download Report</span>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Export Engine Ready</span>
            </button>

            <AnimatePresence>
              {status.type !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-10 border-4 ${
                    status.type === 'success' 
                    ? 'border-leaf-500 bg-leaf-50 text-leaf-500' 
                    : 'border-terracotta-500 bg-terracotta-50 text-terracotta-500'
                  }`}
                >
                   <div className="flex items-center space-x-6">
                      <div className="p-4 bg-white shadow-sm">
                        {status.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest mb-1">{status.type === 'success' ? 'EXPORT SUCCESSFUL' : 'EXPORT FAILED'}</h4>
                        <p className="text-[10px] font-bold opacity-80 leading-relaxed uppercase">{status.message}</p>
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

             {/* Archive History (Recent Generation) */}
            <div className="bg-white border-2 border-mud-900/5 p-10 relative overflow-hidden">
               <div className="flex justify-between items-center mb-8 border-b-2 border-mud-900/5 pb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-mud-900">Export History</h3>
                  <History className="w-4 h-4 text-mud-900/20" />
               </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-mud-900/5 opacity-40">
                     <div className="flex items-center space-x-4">
                        <FileText className="w-4 h-4" />
                        <div>
                           <p className="text-[10px] font-black uppercase leading-none mb-1">CATTLE_DUMP_01</p>
                           <p className="text-[8px] font-bold opacity-60">2024-05-18 10:42</p>
                        </div>
                     </div>
                     <span className="text-[9px] font-black uppercase tracking-widest">CSV</span>
                  </div>
                  <p className="text-[9px] font-bold text-center text-mud-900/20 uppercase tracking-[0.2em] pt-4">No reports generated during this session yet</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
