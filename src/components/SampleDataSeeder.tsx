import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export const SampleDataSeeder: React.FC = () => {
  const [seeding, setSeeding] = useState(false);
  const [done, setDone] = useState(false);

  const seedData = async () => {
    if (!auth.currentUser) return;
    setSeeding(true);
    
    try {
      // 1. Seed Cattle
      const cattleData = [
        { tagId: 'SAV-001', breed: 'Holstein', birthDate: '2020-05-15', status: 'milking', weight: 650, healthNotes: 'Healthy, peak production.' },
        { tagId: 'SAV-002', breed: 'Jersey', birthDate: '2021-02-10', status: 'milking', weight: 480, healthNotes: 'Consistent high fat yield.' },
        { tagId: 'SAV-003', breed: 'Guernsey', birthDate: '2019-11-20', status: 'dry', weight: 590, healthNotes: 'Gestation period, due in 2 months.' },
        { tagId: 'SAV-004', breed: 'Holstein', birthDate: '2022-08-05', status: 'heifer', weight: 320, healthNotes: 'Normal growth cycle.' },
        { tagId: 'SAV-005', breed: 'Ayrshire', birthDate: '2023-12-01', status: 'sick', weight: 410, healthNotes: 'Isolating for minor respiratory treatment.' },
      ];

      for (const animal of cattleData) {
        await addDoc(collection(db, 'cattle'), {
          ...animal,
          updatedAt: serverTimestamp(),
          ownerId: auth.currentUser.uid
        });
      }

      // 2. Seed Inventory
      const inventoryData = [
        { name: 'High-Density Alfalfa Feed', category: 'feed', quantity: 1250, unit: 'KG', minThreshold: 500, acquisitionCost: 24000 },
        { name: 'Sulphur Salt Lick Blocks', category: 'feed', quantity: 45, unit: 'BLOCKS', minThreshold: 10, acquisitionCost: 20250 },
        { name: 'Synthetic Pesticide Fluid', category: 'sanitation', quantity: 60, unit: 'LITERS', minThreshold: 5, acquisitionCost: 108000 },
        { name: 'Broad-Spectrum Antibiotics', category: 'medicine', quantity: 15, unit: 'UNITS', minThreshold: 20, acquisitionCost: 15000 },
        { name: 'Z-Sanitation Fluid', category: 'sanitation', quantity: 45, unit: 'LITERS', minThreshold: 10, acquisitionCost: 12500 },
        { name: 'Mineral Powder Pre-Mix', category: 'feed', quantity: 100, unit: 'BAGS', minThreshold: 15, acquisitionCost: 320000 },
        { name: 'Biodegradable Milk Cartons', category: 'packaging', quantity: 5000, unit: 'UNITS', minThreshold: 1000, acquisitionCost: 75000 },
      ];

      for (const item of inventoryData) {
        await addDoc(collection(db, 'inventory'), {
          ...item,
          ownerId: auth.currentUser.uid
        });
      }

      // 3. Seed Transactions
      const transactionsData = [
        { type: 'income', amount: 1250, category: 'milk_sales', description: 'Weekly Bulk Milk Fulfillment - Nestlé', date: new Date() },
        { type: 'income', amount: 450, category: 'milk_sales', description: 'Farmers Market Direct Sales', date: new Date() },
        { type: 'expense', amount: 800, category: 'feed', description: 'Monthly Feed Inventory Replenishment', date: new Date() },
        { type: 'expense', amount: 120, category: 'medical', description: 'Vet Consultation & Vaccinations', date: new Date() },
      ];

      for (const tx of transactionsData) {
        await addDoc(collection(db, 'transactions'), {
          ...tx,
          ownerId: auth.currentUser.uid,
          createdAt: serverTimestamp()
        });
      }

      // 4. Seed Production (Last 7 days)
      const now = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Morning shift
        await addDoc(collection(db, 'production'), {
          date: dateStr,
          shift: 'morning',
          volume: 600 + Math.random() * 100,
          fatContent: 4.0 + Math.random() * 0.5,
          recordedBy: auth.currentUser.displayName,
          ownerId: auth.currentUser.uid
        });

        // Evening shift
        await addDoc(collection(db, 'production'), {
          date: dateStr,
          shift: 'evening',
          volume: 550 + Math.random() * 80,
          fatContent: 4.1 + Math.random() * 0.4,
          recordedBy: auth.currentUser.displayName,
          ownerId: auth.currentUser.uid
        });
      }

      setDone(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'multiple');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <section className="bg-white border-2 border-mud-900/5 p-10 shadow-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Database className="w-24 h-24" />
      </div>
      <h3 className="text-sm font-black uppercase tracking-[0.3em] text-mud-900 mb-6 flex items-center">
        <Database className="w-4 h-4 mr-3 text-terracotta-500" />
        Add Sample Data
      </h3>
      <p className="text-[11px] font-bold text-mud-900/40 uppercase tracking-widest leading-relaxed mb-10 max-w-md">
        Fill your farm dashboard with some initial sample data to explore different features.
      </p>

      {done ? (
        <div className="flex items-center space-x-4 text-leaf-500">
          <CheckCircle2 className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sample data added successfully</span>
        </div>
      ) : (
        <button 
          onClick={seedData}
          disabled={seeding}
          className="flex items-center space-x-6 px-10 py-5 bg-mud-900 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-[8px_8px_0px_rgba(166,75,42,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {seeding ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Adding data...</span>
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              <span>Initialize Sample Data</span>
            </>
          )}
        </button>
      )}
    </section>
  );
};
