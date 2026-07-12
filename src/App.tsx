/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';
import { Shell } from './components/Shell';
import { FarmProvider } from './lib/farmContext';

// Dynamic route split lazy loaded chunks for optimal web vitals and fast start
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const HerdManagement = lazy(() => import('./components/HerdManagement').then(m => ({ default: m.HerdManagement })));
const MilkProduction = lazy(() => import('./components/MilkProduction').then(m => ({ default: m.MilkProduction })));
const Inventory = lazy(() => import('./components/Inventory').then(m => ({ default: m.Inventory })));
const Finance = lazy(() => import('./components/Finance').then(m => ({ default: m.Finance })));
const HealthRecords = lazy(() => import('./components/HealthRecords').then(m => ({ default: m.HealthRecords })));
const LabourManagement = lazy(() => import('./components/LabourManagement').then(m => ({ default: m.LabourManagement })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const CalendarView = lazy(() => import('./components/Calendar').then(m => ({ default: m.Calendar })));

// Ultra-fast lightweight matching loader layout
const ViewLoadingFallback = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-pulse">
    <div className="w-12 h-12 border-4 border-terracotta-500/10 border-t-terracotta-500 rounded-full animate-spin"></div>
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-mud-900/30">Resolving Data Node...</span>
  </div>
);

import { ToastProvider } from './lib/ToastContext';

export default function App() {
  return (
    <FarmProvider>
      <ToastProvider>
        <Router>
          <Shell>
            <Suspense fallback={<ViewLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/herd" element={<HerdManagement />} />
                <Route path="/production" element={<MilkProduction />} />
                <Route path="/health" element={<HealthRecords />} />
                <Route path="/labour" element={<LabourManagement />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/calendar" element={<CalendarView />} />
              </Routes>
            </Suspense>
          </Shell>
        </Router>
      </ToastProvider>
    </FarmProvider>
  );
}

