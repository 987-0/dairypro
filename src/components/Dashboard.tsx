import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { useFarm } from '../lib/farmContext';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  Droplets, 
  AlertTriangle, 
  Package, 
  Beef as Cow,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Zap,
  Globe,
  Activity,
  Box
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, subDays } from 'date-fns';

const mockProductionData = [
  { day: 'Mon', morning: 420, evening: 380 },
  { day: 'Tue', morning: 450, evening: 400 },
  { day: 'Wed', morning: 410, evening: 390 },
  { day: 'Thu', morning: 480, evening: 420 },
  { day: 'Fri', morning: 460, evening: 410 },
  { day: 'Sat', morning: 500, evening: 450 },
  { day: 'Sun', morning: 520, evening: 480 },
];

const mockHerdHealth = [
  { status: 'Milking', count: 42, color: '#A64B2A' },
  { status: 'Dry', count: 12, color: '#D99125' },
  { status: 'Heifers', count: 18, color: '#5B6342' },
  { status: 'Calves', count: 10, color: '#D99125' },
  { status: 'Sick', count: 3, color: '#261C1A' },
];

const StatCard = ({ title, value, change, icon: Icon, colorClass }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    className={`bg-white border-2 border-mud-900/5 p-8 relative overflow-hidden group shadow-sm transition-all hover:shadow-xl`}
  >
    <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
       <Icon className="w-full h-full" />
    </div>
    <div className="flex justify-between items-start mb-6">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-mud-900/30 mb-2 font-sans">{title}</p>
        <h3 className="text-4xl font-black font-serif italic text-mud-900 tracking-tighter">{value}</h3>
      </div>
      <div className={`p-4 ${colorClass || 'bg-mud-900'} text-white shadow-[6px_6px_0px_#f2e8df] transition-transform hover:-rotate-12`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="flex items-center space-x-3 pt-6 border-t border-mud-900/5">
      {change > 0 ? (
        <span className="flex items-center text-[10px] font-black text-leaf-500 uppercase tracking-widest bg-leaf-500/10 px-2 py-1">
          <ArrowUpRight className="w-3 h-3 mr-1" />
          +{change}%
        </span>
      ) : (
        <span className="flex items-center text-[10px] font-black text-terracotta-500 uppercase tracking-widest bg-terracotta-50 px-2 py-1">
          <ArrowDownRight className="w-3 h-3 mr-1" />
          {change}%
        </span>
      )}
      <span className="text-[9px] font-bold text-mud-900/20 uppercase tracking-widest italic font-sans px-2">Cycle Variance</span>
    </div>
  </motion.div>
);

export const Dashboard: React.FC = () => {
  const { farmOwnerId } = useFarm();
  const [stats, setStats] = useState({
    yield: '0L',
    herd: '0 Head',
    logistics: 'Nominal'
  });
  const [chartData, setChartData] = useState<any[]>(mockProductionData);
  const [herdData, setHerdData] = useState<any[]>(mockHerdHealth);
  const [sickCount, setSickCount] = useState(0);
  const [farmName, setFarmName] = useState<string>('Farm Dashboard');

  useEffect(() => {
    if (auth.currentUser) {
      const unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        if (snap.exists()) {
          const uProfile = snap.data();
          if (uProfile && uProfile.farmDetails && uProfile.farmDetails.farmName) {
            setFarmName(`${uProfile.farmDetails.farmName} Dashboard`);
          }
        }
      });
      return () => unsubUser();
    }
  }, []);

  useEffect(() => {
    if (!auth.currentUser || !farmOwnerId) return;

    // 1. Fetch Production Data (last 7 days)
    const qProd = query(
      collection(db, 'production'),
      where('ownerId', '==', farmOwnerId)
    );
    const unsubProd = onSnapshot(qProd, (snap) => {
      const docs = snap.docs.map(d => d.data());
      if (docs.length > 0) {
        // Group by day for the chart
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = subDays(new Date(), i);
          return format(d, 'yyyy-MM-dd');
        }).reverse();

        const formatted = last7Days.map(dateStr => {
          const dayMatches = docs.filter(d => d.date === dateStr);
          const morning = dayMatches.find(d => d.shift === 'morning')?.volume || 0;
          const evening = dayMatches.find(d => d.shift === 'evening')?.volume || 0;
          return {
            day: format(new Date(dateStr), 'EEE'),
            morning: Math.round(morning),
            evening: Math.round(evening)
          };
        });
        setChartData(formatted);

        // Daily yield (today)
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayYield = docs.filter(d => d.date === today).reduce((acc, curr) => acc + curr.volume, 0);
        
        setStats(prev => ({ 
          ...prev, 
          yield: `${Math.round(todayYield)}L`
        }));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'production'));

    // 2. Fetch Herd Data
    const qHerd = query(
      collection(db, 'cattle'),
      where('ownerId', '==', farmOwnerId)
    );
    const unsubHerd = onSnapshot(qHerd, (snap) => {
      const docs = snap.docs.map(d => d.data());
      if (docs.length > 0) {
        setStats(prev => ({ ...prev, herd: `${docs.length} Head` }));
        
        const counts: any = { milking: 0, dry: 0, heifer: 0, calf: 0, sick: 0 };
        docs.forEach(d => { if(counts[d.status] !== undefined) counts[d.status]++; });
        
        setSickCount(counts.sick);
        setHerdData([
          { status: 'Milking', count: counts.milking, color: '#A64B2A' },
          { status: 'Dry', count: counts.dry, color: '#D99125' },
          { status: 'Heifers', count: counts.heifer, color: '#5B6342' },
          { status: 'Calves', count: counts.calf, color: '#D99125' },
          { status: 'Sick', count: counts.sick, color: '#261C1A' },
        ]);
      }
    });

    // 3. Fetch Inventory
    const qInv = query(
      collection(db, 'inventory'),
      where('ownerId', '==', farmOwnerId)
    );
    const unsubInv = onSnapshot(qInv, (snap) => {
      const docs = snap.docs.map(d => d.data());
      const lowStock = docs.some(d => d.quantity <= d.minThreshold);
      setStats(prev => ({ ...prev, logistics: lowStock ? 'Critical' : 'Nominal' }));
    });

    return () => { unsubProd(); unsubHerd(); unsubInv(); };
  }, [farmOwnerId]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative overflow-hidden">
      {/* Tactical Illustration Layer */}
      <div className="absolute top-0 right-0 w-[40%] h-full opacity-[0.02] pointer-events-none z-0">
         <img 
           src="https://www.freeiconspng.com/uploads/silo-png-1.png" 
           className="absolute -top-20 -right-20 w-[400px] grayscale brightness-50"
           alt=""
         />
      </div>
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] opacity-[0.015] pointer-events-none z-0">
         <img 
           src="https://www.freeiconspng.com/uploads/cow-png-30.png" 
           className="w-full grayscale rotate-12"
           alt=""
         />
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-4 border-mud-900/5 pb-12 gap-8 relative z-10">
         <div>
            <div className="flex items-center space-x-3 text-terracotta-500 font-black text-[10px] uppercase tracking-[0.4em] mb-3">
               <Globe className="w-4 h-4" />
               <span>Farm Overview</span>
            </div>
            <h1 className="text-5xl font-black font-serif italic text-mud-900 tracking-tighter uppercase leading-none">{farmName}</h1>
            <p className="text-xs font-bold text-mud-900/30 uppercase tracking-[0.2em] mt-3">Real-time updates of cattle and milk production</p>
         </div>
         <div className="flex items-center space-x-4">
            <div className="bg-white px-6 py-3 border-2 border-mud-900/5 flex items-center space-x-4">
               <Activity className="w-5 h-5 text-leaf-500" />
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-mud-900/40 uppercase">Active Sensors</span>
                  <span className="text-xs font-black uppercase tracking-widest">Systems Online</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard title="Daily Milk Yield" value={stats.yield} change={5.2} icon={Droplets} colorClass="bg-terracotta-500" />
        <StatCard title="Active Herd" value={stats.herd} change={2.0} icon={Cow} colorClass="bg-mud-900" />
        <StatCard title="Stock Alert" value={stats.logistics} change={-12.0} icon={Package} colorClass="bg-mud-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
        <div className="lg:col-span-2 bg-white border-2 border-mud-900/5 p-6 sm:p-12 shadow-sm relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-mud-900/5 -mr-12 -mt-12 pointer-events-none group-hover:-rotate-12 transition-transform duration-1000">
             <Zap className="w-64 h-64" />
          </div>
          <div className="flex justify-between items-start mb-12 border-b border-mud-900/5 pb-8 relative z-10">
            <div>
              <h3 className="text-2xl font-black uppercase font-serif italic text-mud-900">Milk Yield Trends</h3>
              <p className="text-[10px] font-bold text-mud-900/30 uppercase tracking-widest mt-1">Total milk volume collected per shift</p>
            </div>
            <div className="flex space-x-4">
               <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-mud-900" />
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Morn</span>
               </div>
               <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-mud-900 bg-white" />
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Even</span>
               </div>
            </div>
          </div>
          
          <div className="h-[400px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMilk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A64B2A" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#A64B2A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E033" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900 }} 
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900 }}
                  dx={-15}
                />
                <Tooltip 
                  cursor={{ stroke: '#A64B2A', strokeWidth: 2 }}
                  contentStyle={{ 
                    backgroundColor: '#261C1A', 
                    border: 'none', 
                    color: '#fff',
                    padding: '16px',
                    boxShadow: '10px 10px 0px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area type="monotone" dataKey="morning" stroke="#A64B2A" strokeWidth={4} fillOpacity={1} fill="url(#colorMilk)" />
                <Area type="monotone" dataKey="evening" stroke="#A64B2A" strokeWidth={2} strokeDasharray="6 6" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border-2 border-mud-900/5 p-6 sm:p-12 shadow-sm flex flex-col">
          <div className="mb-12">
            <h3 className="text-2xl font-black uppercase font-serif italic text-mud-900">Herd Breakdown</h3>
            <p className="text-[10px] font-bold text-mud-900/30 uppercase tracking-widest mt-1">Cattle categories distribution</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={herdData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="status" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900 }}
                  width={80}
                />
                <Tooltip cursor={{ fill: 'rgba(166,75,42,0.05)' }} />
                <Bar dataKey="count" barSize={35} radius={[0, 4, 4, 0]}>
                  {herdData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-12 space-y-4">
             <motion.div 
               whileHover={{ x: 10 }}
               className="flex items-center justify-between p-6 bg-terracotta-50 border-l-8 border-terracotta-500 cursor-pointer shadow-sm"
              >
                <div className="flex items-center space-x-4 text-terracotta-500">
                  <AlertTriangle className="w-6 h-6" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[2px]">Health Alerts</span>
                    <span className="text-[11px] font-bold text-mud-900/60 uppercase">{sickCount} sick cattle needing care</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-terracotta-500" />
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

