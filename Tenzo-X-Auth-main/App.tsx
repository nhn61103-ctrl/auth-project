
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './services/firebase';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import ResellerPortal from './pages/ResellerPortal';
import Shop from './pages/Shop';
import TOS from './pages/TOS';
import Docs from './pages/Docs';
import { onValue, ref } from 'firebase/database';
import { db } from './services/firebase';
import { ADMIN_EMAIL } from './constants';
import { SystemConfig } from './types';
import { Hammer } from 'lucide-react';

const MaintenanceView: React.FC<{ status?: string, message?: string }> = ({ status, message }) => (
  <div className="flex h-screen items-center justify-center bg-background px-4">
    <div className="text-center max-w-md">
      <div className="mb-6 flex justify-center">
        <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
          <Hammer className="w-12 h-12 text-white" />
        </div>
      </div>
      <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Maintenance Mode</h1>
      <p className="text-white/60 mb-8 leading-relaxed">
        {message || "We're currently performing some improvements to the site. Please check back later!"}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 border-dashed">
        <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse"></div>
        <span className="text-[10px] uppercase font-black tracking-widest text-white/40">Status: {status || "Polishing Gears"}</span>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState<SystemConfig | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u?.email === 'reseller@gmail.com') {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(u);
      setLoading(false);
    });

    const maintenanceRef = ref(db, 'system/config');
    const unsubscribeMaintenance = onValue(maintenanceRef, (snapshot) => {
      setMaintenance(snapshot.val());
    });

    return () => {
      unsubscribeAuth();
      unsubscribeMaintenance();
    };
  }, []);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
      </div>
    );
  }

  const isLoginPage = window.location.hash === '#/login';
  if (maintenance?.maintenanceMode && !isAdmin && !isLoginPage) {
    return <MaintenanceView status={maintenance.maintenanceStatus} message={maintenance.maintenanceMessage} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/login/:discordId" element={<Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" /> : <Signup />} />
        <Route path="/signup/:discordId" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/tos" element={<TOS />} />
        <Route path="/docs" element={<Docs />} />

        
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/shop" element={user ? <Shop /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? <Admin /> : <Navigate to="/dashboard" />} />
        <Route path="/reseller/:hash" element={<ResellerPortal />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
