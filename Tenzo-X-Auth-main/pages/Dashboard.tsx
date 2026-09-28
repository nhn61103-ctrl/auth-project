
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ref, onValue, set, update, get, remove, query, orderByChild, equalTo } from 'firebase/database';
import {
  Box, Users, Key, Database, Webhook, Settings, LogOut,
  Crown, Coins, Plus, Copy, Trash2, Pause, Play, Search,
  CheckCircle2, AlertCircle, Loader2, X, Edit2, ShieldAlert,
  ChevronDown, Monitor, RefreshCcw, Info, Hash, ShoppingCart, Menu,
  Settings2, AlertTriangle, Check, MessageSquare, Bot, Share2, ShieldCheck, Lock
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { encrypt, decrypt } from '../services/encryption';
import { Customer, AppMetadata, User, License, WebhookSettings, SystemPlan, Reseller } from '../types';

type Tab = 'application' | 'users' | 'license' | 'variables' | 'interrogation' | 'settings' | 'resellers' | 'earn';


const CustomCheckbox: React.FC<{ checked: boolean, onChange: (val: boolean) => void, label?: string }> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none">
    <div
      className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${checked
        ? 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
        : 'border-border bg-surfaceHighlight group-hover:border-white/30'
        }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`transition-all duration-300 transform ${checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        <Check size={14} className="text-black stroke-[4px]" />
      </div>
    </div>
    {label && <span className={`text-sm font-semibold transition-all duration-300 ${checked ? 'text-white' : 'text-muted group-hover:text-white/80'}`}>{label}</span>}
  </label>
);

const CustomSelect: React.FC<{ value: string, options: { label: string, value: string }[], onChange: (val: string) => void, placeholder?: string }> = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-surfaceHighlight border border-border rounded-xl text-sm hover:border-white/20 transition-all text-left cursor-pointer"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : (placeholder || 'Select...')}</span>
        <ChevronDown size={16} className={`transition-transform text-muted ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surfaceHighlight border border-border rounded-xl shadow-2xl z-[150] overflow-hidden animate-fade-in max-h-48 overflow-y-auto">
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer hover:bg-white/5 transition-colors ${value === opt.value ? 'text-white bg-white/10' : 'text-muted'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ label: string, val: string, copyable?: boolean }> = ({ label, val, copyable }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 py-3 border-b border-border/50">
    <span className="text-muted text-sm">{label}</span>
    <div className="flex items-center gap-3 overflow-hidden">
      <code className="font-mono text-sm bg-black/50 px-3 py-1.5 rounded-lg text-white/80 select-all border border-white/10 truncate max-w-[200px]">{val}</code>
      {copyable && <button onClick={() => { navigator.clipboard.writeText(val); alert('Copied!'); }} className="text-muted hover:text-white transition-colors flex-shrink-0"><Copy size={16} /></button>}
    </div>
  </div>
);

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
    <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
        <h3 className="text-lg font-bold">{title}</h3>
        <button onClick={onClose} className="text-muted hover:text-white transition-colors"><X size={20} /></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('application');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [userSecret, setUserSecret] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState<SystemPlan | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [apps, setApps] = useState<Record<string, any>>({});
  const [currentApp, setCurrentApp] = useState<string | null>(localStorage.getItem('mtc_selected_app'));

  const [users, setUsers] = useState<Record<string, User>>({});
  const [licenses, setLicenses] = useState<Record<string, License>>({});
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [webhookSettings, setWebhookSettings] = useState<WebhookSettings>({
    url: '', notifyLogin: true, notifyAddUser: true, notifyDeleteUser: true,
    notifyAddLicense: true, notifyExpireLicense: true, notifyPauseApp: true
  });

  const [allPlans, setAllPlans] = useState<Record<string, SystemPlan>>({});
  const [featureRestrictions, setFeatureRestrictions] = useState<Record<string, { featureId: string, requiredPlan: string, displayName: string }>>({});

  const [loading, setLoading] = useState(false);
  const [showCreateApp, setShowCreateApp] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<string | null>(null);
  const [showCreateLicense, setShowCreateLicense] = useState(false);
  const [showEditLicense, setShowEditLicense] = useState<string | null>(null);
  const [showCreateVariable, setShowCreateVariable] = useState(false);
  const [showEditVariable, setShowEditVariable] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: 'success' | 'error' }[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean, title: string, message: string, onConfirm: () => void, danger?: boolean
  }>({ show: false, title: '', message: '', onConfirm: () => { }, danger: false });

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [licenseSearch, setLicenseSearch] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('all');

  const [extendUnit, setExtendUnit] = useState('days');
  const [createUnit, setCreateUnit] = useState('days');
  const [genLicenseUnit, setGenLicenseUnit] = useState('days');
  const [createHwidLock, setCreateHwidLock] = useState(true);
  const [createOneTime, setCreateOneTime] = useState(false);
  const [licenseSegs, setLicenseSegs] = useState('4');
  const [licenseLen, setLicenseLen] = useState('5');
  const [createVal, setCreateVal] = useState(1);
  const [genLicVal, setGenLicVal] = useState(1);

  const [resellers, setResellers] = useState<Record<string, Reseller>>({});
  const [showCreateReseller, setShowCreateReseller] = useState(false);
  const [showEditReseller, setShowEditReseller] = useState<string | null>(null);
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [showGeneratedKeys, setShowGeneratedKeys] = useState(false);
  const [genAmount, setGenAmount] = useState(1);
  const [afkEarnings, setAfkEarnings] = useState(0);
  const [afkTimer, setAfkTimer] = useState(0); 

  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const sendWebhook = async (event: string, data: any) => {
    if (!webhookSettings.url) return; 
    if (!(webhookSettings as any)[event]) return; 

    try {
      const embed = {
        title: data.title || 'TXA Event',
        description: data.description || '',
        color: data.color || 3447003, 
        fields: data.fields || [],
        timestamp: new Date().toISOString(),
        footer: { text: 'TXA Authentication System' }
      };

      await fetch(webhookSettings.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });
    } catch (err) {
      console.error('Webhook error:', err);
    }
  };

  useEffect(() => {
    if (!auth.currentUser?.email) return;
    const emailKey = auth.currentUser.email.replace(/\./g, ',');

    onValue(ref(db, `customers/${emailKey}`), async (snap) => {
      const data = decrypt(snap.val());
      if (data) {
        setCustomer(data);
        setUserSecret(data.secret);
        const planSnap = await get(ref(db, `system/plans/${data.plan}`));
        if (planSnap.exists()) setPlanLimits(decrypt(planSnap.val()));
      } else {
        const secret = 'TXA-' + Math.random().toString(36).substring(2, 15).toUpperCase();
        const customer = {
          email: auth.currentUser?.email,
          secret,
          plan: 'Free Plan',
          credits: 0,
          createdAt: new Date().toISOString()
        };
        await set(ref(db, `customers/${emailKey}`), encrypt(customer));
      }
    });
  }, []);

  useEffect(() => {
    if (!userSecret) return;
    onValue(ref(db, `applications/${userSecret}`), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, any> = {};
      Object.keys(raw).forEach(k => {
        if (raw[k]?.metadata) dec[k] = decrypt(raw[k].metadata);
      });
      setApps(dec);
      if (Object.keys(dec).length === 0 && !localStorage.getItem('txa_onboarding_done')) {
        setShowOnboarding(true);
      }
      if (!currentApp && Object.keys(dec).length > 0) {
        const first = Object.keys(dec)[0];
        setCurrentApp(first);
        localStorage.setItem('mtc_selected_app', first);
      }
    });
    onValue(ref(db, `webhookSettings/${userSecret}`), (snap) => {
      const data = decrypt(snap.val());
      if (data) setWebhookSettings(data);
    });
  }, [userSecret]);

  useEffect(() => {
    if (!currentApp || !userSecret || !apps[currentApp]?.autoClearExpired) return;

    const performAutoClear = async () => {
      let clearedCount = 0;
      const updates: Record<string, null> = {};
      const now = new Date();

      const appSnap = await get(ref(db, `applications/${userSecret}/${currentApp}`));
      if (!appSnap.exists()) return;
      
      const appData = appSnap.val();
      const usersData = appData.users || {};
      const licensesData = appData.licenses || {};

      Object.entries(usersData).forEach(([name, user]: [string, any]) => {
        if (user.expiry !== 'lifetime' && new Date(user.expiry) < now) {
          updates[`users/${name}`] = null;
          clearedCount++;
        }
      });

      Object.entries(licensesData).forEach(([key, lic]: [string, any]) => {
        if (lic.expiry !== 'lifetime' && new Date(lic.expiry) < now) {
          updates[`licenses/${key}`] = null;
          clearedCount++;
        }
      });

      if (clearedCount > 0) {
        await update(ref(db, `applications/${userSecret}/${currentApp}`), updates);
        addToast(`Auto-cleared ${clearedCount} expired entries`, 'success');
      }
    };

    performAutoClear();
  }, [currentApp, userSecret, apps]);

  useEffect(() => {
    if (!userSecret || !currentApp) return;
    onValue(ref(db, `applications/${userSecret}/${currentApp}/users`), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, User> = {};
      Object.keys(raw).forEach(k => dec[k] = decrypt(raw[k]));
      setUsers(dec);
    });
    onValue(ref(db, `applications/${userSecret}/${currentApp}/licenses`), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, License> = {};
      Object.keys(raw).forEach(k => dec[k] = decrypt(raw[k]));
      setLicenses(dec);
    });
    onValue(ref(db, `applications/${userSecret}/${currentApp}/variables`), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, string> = {};
      Object.keys(raw).forEach(k => dec[k] = decrypt(raw[k]));
      setVariables(dec);
    });
    onValue(ref(db, `applications/${userSecret}/${currentApp}/variables`), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, string> = {};
      Object.keys(raw).forEach(k => dec[k] = decrypt(raw[k]));
      setVariables(dec);
    });
  }, [userSecret, currentApp]);

  useEffect(() => {
    if (!auth.currentUser?.email) return;
    const emailKey = auth.currentUser.email.replace(/\./g, ',');

    const loadResellers = () => {
      const resellersRef = ref(db, 'resellers');
      onValue(resellersRef, (snap) => {
        const raw = snap.val() || {};
        const dec: Record<string, Reseller> = {};

        Object.entries(raw).forEach(([hash, ciphertext]) => {
          try {
            const r = decrypt(ciphertext as string) as Reseller;
            if (r && r.createdBy === emailKey) {
              dec[hash] = r;
            }
          } catch (e) {
          }
        });

        setResellers(dec);
      }, (error) => {
        console.error("Reseller fetch error:", error);
      });
    };
    loadResellers();

    onValue(ref(db, 'system/plans'), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, SystemPlan> = {};
      Object.keys(raw).forEach(k => dec[k] = decrypt(raw[k]));
      setAllPlans(dec);
    });

    onValue(ref(db, 'system/config/featureRestrictions'), (snap) => {
      setFeatureRestrictions(snap.val() || {});
    });

  }, []);

  useEffect(() => {
    if (activeTab !== 'earn' || !auth.currentUser?.email || !customer) return;
    
    let isFocused = document.hasFocus();
    const interval = setInterval(async () => {
      if (!isFocused) return;
      
      setAfkTimer(prev => {
        if (prev >= 599) {
          const emailKey = auth.currentUser!.email!.replace(/\./g, ',');
          
          setAfkEarnings(e => e + 1);
          
          get(ref(db, `customers/${emailKey}`)).then(async (snap) => {
            if (snap.exists()) {
              const currentData = decrypt(snap.val());
              await set(ref(db, `customers/${emailKey}`), encrypt({
                ...currentData,
                credits: (currentData.credits || 0) + 1
              }));
            }
          });
          
          return 0; 
        }
        return prev + 1;
      });
    }, 100); 

    const onFocus = () => { isFocused = true; };
    const onBlur = () => { isFocused = false; };
    
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [activeTab, customer]);

  useEffect(() => {
    if (activeTab !== 'earn') {
      setAfkEarnings(0);
    }
  }, [activeTab]);

  const isFeatureLocked = (featureId: string): { locked: boolean, requiredPlan?: string } => {
    if (!customer?.plan) return { locked: true, requiredPlan: 'Any Plan' };


    const plan = allPlans[customer.plan];
    if (!plan) return { locked: true, requiredPlan: 'Valid Plan' };

    if (plan.features && plan.features.includes(featureId)) {
      return { locked: false };
    }

    const upgradePlan = Object.entries(allPlans).find(([_, p]) => p.features?.includes(featureId))?.[0];

    return { locked: true, requiredPlan: upgradePlan || 'Higher Tier' };
  };


  const handleCreateApp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = (new FormData(e.currentTarget).get('appName') as string).trim();
    if (!name || !userSecret) return;

    if (planLimits && planLimits.maxApps !== -1) {
      const currentAppCount = Object.keys(apps).length;
      if (currentAppCount >= planLimits.maxApps) {
        addToast(`Application limit reached (${planLimits.maxApps}). Upgrade your plan.`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const meta: AppMetadata = { created: new Date().toISOString(), version: "1.0", applicationPaused: false };
      await set(ref(db, `applications/${userSecret}/${name}/metadata`), encrypt(meta));
      setCurrentApp(name);
      localStorage.setItem('mtc_selected_app', name);
      setShowCreateApp(false);
      setShowOnboarding(false);
      localStorage.setItem('txa_onboarding_done', 'true');
      await sendWebhook('notifyPauseApp', {
        title: 'Application Created',
        description: `New application **${name}** has been deployed.`,
        color: 0x2ecc71,
        fields: [{ name: 'Name', value: name, inline: true }]
      });
      addToast('Application Created');
    } catch (err) { addToast('Failed to create.', 'error'); }
    setLoading(false);
  };

  const updateAppVersion = async (version: string) => {
    if (!currentApp || !userSecret) return;
    const newMeta = { ...apps[currentApp], version };
    await set(ref(db, `applications/${userSecret}/${currentApp}/metadata`), encrypt(newMeta));
    addToast('Version Updated');
  };

  const deleteApp = async () => {
    setConfirmModal({
      show: true,
      title: 'Delete Application',
      message: `Are you sure you want to delete ${currentApp}? This action is permanent.`,
      danger: true,
      onConfirm: async () => {
        if (!currentApp || !userSecret) return;
        await remove(ref(db, `applications/${userSecret}/${currentApp}`));
        setCurrentApp(null);
        localStorage.removeItem('mtc_selected_app');
        await sendWebhook('notifyPauseApp', {
          title: 'Application Deleted',
          description: `Application **${currentApp}** has been permanently removed.`,
          color: 0xe74c3c
        });
        addToast('Application Deleted');
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const filteredLicenses = useMemo(() => {
    return (Object.entries(licenses) as [string, License][]).filter(([key, lic]) => {
      const matchesSearch = key.toLowerCase().includes(licenseSearch.toLowerCase());
      const matchesFilter = licenseFilter === 'all' || (licenseFilter === 'used' ? lic.used : !lic.used);
      return matchesSearch && matchesFilter;
    });
  }, [licenses, licenseSearch, licenseFilter]);

  const filteredUsers = useMemo(() => {
    return (Object.entries(users) as [string, User][]).filter(([name, user]) => {
      const matchesSearch = name.toLowerCase().includes(userSearch.toLowerCase());
      const matchesFilter = userFilter === 'all' ||
        (userFilter === 'banned' ? user.isBanned :
          userFilter === 'lifetime' ? user.expiry === 'lifetime' :
            !user.isBanned);
      return matchesSearch && matchesFilter;
    });
  }, [users, userSearch, userFilter]);

  const calculateExpiry = (val: number, unit: string) => {
    if (unit === 'lifetime') return 'lifetime';
    const d = new Date();
    if (unit === 'minutes') d.setMinutes(d.getMinutes() + val);
    else if (unit === 'hours') d.setHours(d.getHours() + val);
    else if (unit === 'days') d.setDate(d.getDate() + val);
    else if (unit === 'months') d.setMonth(d.getMonth() + val);
    return d.toISOString();
  };

  const logout = () => {
    ['txa_afk_earnings', 'txa_last_daily', 'txa_streak', 'txa_selected_app'].forEach(k => localStorage.removeItem(k));
    signOut(auth).then(() => navigate('/login'));
  };


  return (
    <div className="flex h-screen overflow-hidden bg-background text-white font-sans selection:bg-white/20">
      
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md min-w-[300px] animate-fade-in pointer-events-auto ${t.type === 'success' ? 'border-success/20 text-success bg-surface' : 'border-danger/20 text-danger bg-surface'}`}>
            {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-semibold text-white/90">{t.msg}</span>
          </div>
        ))}
      </div>

      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>

      
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border transform transition-transform duration-300 md:relative md:transform-none flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border flex items-center justify-center gap-2 font-bold text-xl">
          <span className="bg-white text-black px-2 py-0.5 rounded text-sm font-extrabold uppercase tracking-tight">TXA</span>
          <span className="text-muted tracking-tight">Dashboard</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('application'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'application' ? 'bg-white/10 text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
          >
            <Box size={18} /> Application
          </button>
          <button
            onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
          >
            <Users size={18} /> Users
          </button>
          <button
            onClick={() => { setActiveTab('license'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'license' ? 'bg-white/10 text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
          >
            <Key size={18} /> Licenses
          </button>

          <button
            onClick={() => { setActiveTab('earn'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'earn' ? 'bg-white/10 text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
          >
            <Coins size={18} /> Earn Credits
          </button>

          <button
            onClick={() => {
              const lock = isFeatureLocked('variables');
              if (lock.locked) {
                addToast(`Upgrade to ${lock.requiredPlan} to access Variables`, 'error');
                return;
              }
              setActiveTab('variables');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'variables' ? 'bg-white text-black font-semibold' : 'text-muted hover:text-white hover:bg-white/5'
              }`}
          >
            <div className="flex items-center gap-3">
              <Database size={18} />
              <span className="text-sm font-medium">Cloud Variables</span>
            </div>
            {isFeatureLocked('variables').locked && <Lock size={14} className="text-muted/50" />}
          </button>

          <button
            onClick={() => {
              const lock = isFeatureLocked('interrogation'); 
              const lockState = isFeatureLocked('webhooks');
              if (lockState.locked) {
                addToast(`Upgrade to ${lockState.requiredPlan} to access Webhooks`, 'error');
                return;
              }
              setActiveTab('interrogation');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'interrogation' ? 'bg-white text-black font-semibold' : 'text-muted hover:text-white hover:bg-white/5'
              }`}
          >
            <div className="flex items-center gap-3">
              <Webhook size={18} />
              <span className="text-sm font-medium">Interrogation</span>
            </div>
            {isFeatureLocked('webhooks').locked && <Lock size={14} className="text-muted/50" />}
          </button>

          <button
            onClick={() => {
              const lock = isFeatureLocked('resellers');
              if (lock.locked) {
                addToast(`Upgrade to ${lock.requiredPlan} to access Resellers`, 'error');
                return;
              }
              setActiveTab('resellers');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'resellers' ? 'bg-white text-black font-semibold' : 'text-muted hover:text-white hover:bg-white/5'
              }`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} />
              <span className="text-sm font-medium">Resellers</span>
            </div>
            {isFeatureLocked('resellers').locked && <Lock size={14} className="text-muted/50" />}
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
          >
            <Settings size={18} /> Settings
          </button>
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-danger hover:bg-danger/10 rounded-xl transition-all">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden fixed top-4 left-4 z-50 p-2 bg-surface border border-border rounded-lg text-white">
        <Menu size={20} />
      </button>

      
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="ml-10 md:ml-0 flex items-center gap-4 flex-1">
            <div className="w-64">
              <CustomSelect
                value={currentApp || ''}
                options={Object.keys(apps).map(k => ({ label: k, value: k }))}
                onChange={(val) => { setCurrentApp(val); localStorage.setItem('mtc_selected_app', val); }}
                placeholder="Select Application"
              />
            </div>
            <button onClick={() => setShowCreateApp(true)} className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <Plus size={20} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-surfaceHighlight/50 border border-border rounded-full">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted border-r border-border pr-3">
                <Crown size={14} className="text-yellow-500" />
                <span className="uppercase tracking-wider">{customer?.plan || 'Free Plan'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-success pl-1">
                <Coins size={14} />
                <span>{customer?.credits || 0}</span>
              </div>
            </div>
            <Link to="/shop" className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <ShoppingCart size={20} />
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in">
          <div className="max-w-6xl mx-auto space-y-6">

            
            {activeTab === 'application' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Units', val: Object.keys(users).length + Object.keys(licenses).length, color: 'text-white' },
                    { label: 'Active Users', val: (Object.values(users) as User[]).filter(u => !u.isBanned).length, color: 'text-success' },
                    { label: 'Lifetime Users', val: (Object.values(users) as User[]).filter(u => u.expiry === 'lifetime').length, color: 'text-purple-400' },
                    { label: 'HWID Locked', val: (Object.values(users) as User[]).filter(u => u.hwidLock).length, color: 'text-blue-400' },
                    { label: 'Used Licenses', val: (Object.values(licenses) as License[]).filter(l => l.used).length, color: 'text-muted' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-surface border border-border p-4 rounded-xl shadow-sm">
                      <div className="text-muted text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</div>
                      <div className={`text-2xl font-black ${stat.color}`}>{stat.val}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
                    <h3 className="text-lg font-bold">Application Details</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${apps[currentApp || '']?.applicationPaused ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {apps[currentApp || '']?.applicationPaused ? 'Paused' : 'Active'}
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <DetailRow label="Application Name" val={currentApp || '-'} />
                    <DetailRow label="Master Secret Key" val={userSecret || '-'} copyable />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                      <span className="text-muted text-sm">Current Version</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium mr-4 text-white/50">{apps[currentApp || '']?.version || '1.0'}</span>
                        <div className="flex gap-2">
                          <input id="appVerInput" type="text" placeholder="1.0" className="bg-surfaceHighlight border border-border rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-white/30" />
                          <button onClick={() => updateAppVersion((document.getElementById('appVerInput') as HTMLInputElement).value)} className="bg-white text-black px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-200">Update</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-surfaceHighlight/30 border-t border-border flex flex-wrap gap-3">
                    <button onClick={async () => {
                      setConfirmModal({
                        show: true,
                        title: 'Auto Clear Expired',
                        message: 'This will delete all users and licenses with past expiry dates. This action cannot be undone.',
                        danger: true,
                        onConfirm: async () => {
                          let clearedCount = 0;
                          const updates: Record<string, null> = {};
                          
                          Object.entries(users).forEach(([name, user]) => {
                            if (user.expiry !== 'lifetime' && new Date(user.expiry) < new Date()) {
                              updates[`users/${name}`] = null;
                              clearedCount++;
                            }
                          });
                          
                          Object.entries(licenses).forEach(([key, lic]) => {
                            if (lic.expiry !== 'lifetime' && new Date(lic.expiry) < new Date()) {
                              updates[`licenses/${key}`] = null;
                              clearedCount++;
                            }
                          });
                          
                          if (clearedCount > 0) {
                            await update(ref(db, `applications/${userSecret}/${currentApp}`), updates);
                            addToast(`Cleared ${clearedCount} expired entries!`);
                          } else {
                            addToast('No expired entries found.', 'error');
                          }
                          setConfirmModal(prev => ({ ...prev, show: false }));
                        }
                      });
                    }} className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg text-sm font-medium hover:bg-yellow-500/20">
                      <Trash2 size={16} /> Auto Clear Expired
                    </button>
                    <button onClick={async () => {
                      const newPaused = !apps[currentApp || '']?.applicationPaused;
                      await update(ref(db, `applications/${userSecret}/${currentApp}`), { metadata: encrypt({ ...apps[currentApp || ''], applicationPaused: newPaused }) });
                      await sendWebhook('notifyPauseApp', {
                        title: newPaused ? 'Application Paused' : 'Application Resumed',
                        description: `Application **${currentApp}** status changed.`,
                        color: newPaused ? 0xe74c3c : 0x2ecc71,
                        fields: [{ name: 'Status', value: newPaused ? '🔴 Paused' : '🟢 Active', inline: true }]
                      });
                      addToast(newPaused ? 'Application Paused' : 'Application Resumed');
                    }} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surfaceHighlight transition-colors">
                      {apps[currentApp || '']?.applicationPaused ? <><Play size={16} /> Resume Application</> : <><Pause size={16} /> Pause Application</>}
                    </button>
                    <button onClick={deleteApp} className="flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-medium hover:bg-danger/20">
                      <Trash2 size={16} /> Delete Application
                    </button>
                  </div>
                </div>
              </div>
            )}

            
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-2xl font-bold">User Management</h2>
                  <button onClick={() => setShowCreateUser(true)} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <Plus size={16} /> Create User
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input type="text" placeholder="Search users by name..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none" />
                  </div>
                  <div className="w-48">
                    <CustomSelect value={userFilter} options={[{ label: 'All Status', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Banned', value: 'banned' }, { label: 'Lifetime', value: 'lifetime' }]} onChange={setUserFilter} />
                  </div>
                </div>
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <div className="p-4 bg-surfaceHighlight/30 border-b border-border">
                    <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-muted px-2">
                      <div className="col-span-4">User</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-4">Expiry</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {filteredUsers.length === 0 ? (
                      <div className="p-10 text-center text-muted">No users found.</div>
                    ) : filteredUsers.map(([name, user]) => (
                      <div key={name} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors group">
                        <div className="col-span-4 font-bold truncate">{name}</div>
                        <div className="col-span-2">
                          {user.isBanned ? <span className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded font-bold uppercase">Banned</span> : <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded font-bold uppercase">Active</span>}
                        </div>
                        <div className="col-span-4 text-xs text-muted font-mono">{user.expiry === 'lifetime' ? 'Lifetime' : new Date(user.expiry).toLocaleDateString()}</div>
                        <div className="col-span-2 text-right flex justify-end gap-2">
                          <button onClick={() => setShowEditUser(name)} className="p-1.5 text-muted hover:text-white"><Settings2 size={16} /></button>
                          <button onClick={() => {
                            const u = { ...user, isBanned: !user.isBanned };
                            set(ref(db, `applications/${userSecret}/${currentApp}/users/${name}`), encrypt(u));
                            addToast(u.isBanned ? 'User banned.' : 'User restored.');
                          }} className="p-1.5 text-muted hover:text-white"><ShieldAlert size={16} /></button>
                          <button onClick={() => {
                            setConfirmModal({
                              show: true,
                              title: 'Delete User',
                              message: `Are you sure you want to delete user ${name}?`,
                              danger: true,
                              onConfirm: async () => {
                                if (user.license) {
                                  await remove(ref(db, `applications/${userSecret}/${currentApp}/licenses/${user.license}`));
                                }
                                await remove(ref(db, `applications/${userSecret}/${currentApp}/users/${name}`));
                                await sendWebhook('notifyDeleteUser', {
                                  title: 'User Deleted',
                                  description: `User **${name}** removed from **${currentApp}**.`,
                                  color: 0xe74c3c
                                });
                                addToast('User and linked license deleted.');
                                setConfirmModal(prev => ({ ...prev, show: false }));
                              }
                            });
                          }} className="p-1.5 text-muted hover:text-danger"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            
            {activeTab === 'license' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-2xl font-bold">License Management</h2>
                  <button onClick={() => setShowCreateLicense(true)} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <Plus size={16} /> Generate License
                  </button>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input type="text" placeholder="Search license keys..." value={licenseSearch} onChange={(e) => setLicenseSearch(e.target.value)} className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none" />
                  </div>
                  <div className="w-48">
                    <CustomSelect value={licenseFilter} options={[{ label: 'All Status', value: 'all' }, { label: 'Unused', value: 'unused' }, { label: 'Used', value: 'used' }]} onChange={setLicenseFilter} />
                  </div>
                </div>
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <div className="p-4 bg-surfaceHighlight/30 border-b border-border">
                    <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-muted px-2">
                      <div className="col-span-3">License Key</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-3">Display Name</div>
                      <div className="col-span-2">User</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {filteredLicenses.length === 0 ? (
                      <div className="p-10 text-center text-muted">No licenses found.</div>
                    ) : filteredLicenses.map(([key, lic]) => {
                      const connectedUser = lic.associatedUser;
                      return (
                        <div key={key} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors group">
                          <div className="col-span-3 font-mono text-[10px] text-blue-400 font-bold truncate select-all">{key}</div>
                          <div className="col-span-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${lic.used ? 'bg-gray-800 text-muted' : 'bg-success/10 text-success'}`}>{lic.used ? 'Used' : 'Unused'}</span>
                          </div>
                          <div className="col-span-3 text-xs text-muted truncate">{lic.displayName || '-'}</div>
                          <div className="col-span-2 text-xs font-bold text-white/70 truncate">{connectedUser || '-'}</div>
                          <div className="col-span-2 text-right flex justify-end gap-2">
                            <button onClick={() => setShowEditLicense(key)} className="p-1.5 text-muted hover:text-white"><Edit2 size={16} /></button>
                            <button onClick={() => {
                              setConfirmModal({
                                show: true,
                                title: 'Delete License',
                                message: `Are you sure you want to delete license ${key}? ${lic.used ? 'The connected user will also be deleted.' : ''}`,
                                danger: true,
                                onConfirm: async () => {
                                  if (lic.associatedUser) {
                                    await remove(ref(db, `applications/${userSecret}/${currentApp}/users/${lic.associatedUser}`));
                                  }
                                  await remove(ref(db, `applications/${userSecret}/${currentApp}/licenses/${key}`));
                                  await sendWebhook('notifyAddLicense', {
                                    title: 'License Deleted',
                                    description: `License key removed from **${currentApp}**.`,
                                    color: 0xe74c3c,
                                    fields: [{ name: 'Key', value: `\`${key}\``, inline: false }]
                                  });
                                  addToast('License and connected user deleted.');
                                  setConfirmModal(prev => ({ ...prev, show: false }));
                                }
                              });
                            }} className="p-1.5 text-muted hover:text-danger"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            
            {activeTab === 'earn' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">Earn Credits</h2>
                  <p className="text-muted text-sm mt-1">Earn free credits by claiming daily rewards or staying active on this page.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="bg-surface border border-border p-6 rounded-2xl shadow-xl flex flex-col space-y-4 relative overflow-hidden">

                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-yellow-500/20 text-yellow-500 rounded-xl">
                        <Crown size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Daily Reward</h3>
                        <p className="text-sm text-muted">Consecutive Days: <span className="font-bold text-white">{customer?.consecutiveDays || 0}</span></p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted">
                      Claim your daily reward to earn credits. Your reward increases by 10 credits for each consecutive day, up to a maximum of 1,000 credits per day!
                    </p>
                    
                    <div className="pt-4 mt-auto z-10">
                      <button 
                        onClick={async () => {
                          if (!auth.currentUser?.email) return;
                          const emailKey = auth.currentUser.email.replace(/\./g, ',');
                          const now = new Date();
                          const lastClaim = customer?.lastDaily ? new Date(customer.lastDaily) : null;
                          
                          let consecutive = customer?.consecutiveDays || 0;
                          
                          if (lastClaim) {
                            const isSameDay = lastClaim.getDate() === now.getDate() && lastClaim.getMonth() === now.getMonth() && lastClaim.getFullYear() === now.getFullYear();
                            if (isSameDay) {
                              addToast('You have already claimed your daily reward today!', 'error');
                              return;
                            }
                            
                            const yesterday = new Date(now);
                            yesterday.setDate(yesterday.getDate() - 1);
                            const isYesterday = lastClaim.getDate() === yesterday.getDate() && lastClaim.getMonth() === yesterday.getMonth() && lastClaim.getFullYear() === yesterday.getFullYear();
                            
                            if (isYesterday) {
                              consecutive += 1;
                            } else {
                              consecutive = 1;
                            }
                          } else {
                            consecutive = 1;
                          }
                          
                          const reward = Math.min(1000, consecutive * 10);
                          
                          const snap = await get(ref(db, `customers/${emailKey}`));
                          if (snap.exists()) {
                            const currentData = decrypt(snap.val());
                            await set(ref(db, `customers/${emailKey}`), encrypt({
                              ...currentData,
                              credits: (currentData.credits || 0) + reward,
                              lastDaily: now.toISOString(),
                              consecutiveDays: consecutive
                            }));
                          }
                          
                          addToast(`Claimed ${reward} credits!`);
                        }}
                        className="w-full bg-white text-black font-bold py-3 rounded-xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors shadow-lg"
                      >
                        Claim Reward
                      </button>
                    </div>
                  </div>

                  
                  <div className="bg-surface border border-border p-6 rounded-2xl shadow-xl flex flex-col space-y-4 relative overflow-hidden group">

                    <div className="flex items-center gap-3 relative z-10">
                      <div className="p-3 bg-success/20 text-success rounded-xl relative overflow-hidden">
                        <Monitor size={24} />
                        <div className="absolute inset-0 bg-success/10 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">AFK Session</h3>
                        <p className="text-sm text-muted">Status: <span className="font-bold text-white flex gap-1 inline-flex items-center"><span className="w-2 h-2 rounded-full bg-success animate-pulse inline-block shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span> Earning</span></p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted relative z-10">
                      Stay focused on this page to accumulate credits. Every minute of activity grants you <span className="text-white font-bold">1 Credit</span>.
                    </p>
                    
                    <div className="space-y-2 relative z-10">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted">
                        <span>Progress to next credit</span>
                        <span>{Math.floor((afkTimer / 600) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-surfaceHighlight rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-success shadow-[0_0_12px_rgba(34,197,94,0.4)] transition-all duration-150 ease-linear" 
                          style={{ width: `${(afkTimer / 600) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-4 bg-surfaceHighlight/30 p-4 rounded-xl border border-border flex justify-between items-center z-10 backdrop-blur-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Session Total</span>
                        <span className="text-xs text-white/50">Credits earned this session</span>
                      </div>
                      <span className="text-3xl font-black text-success drop-shadow-sm" id="afk-earnings">+{afkEarnings}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            {activeTab === 'variables' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Cloud Variables</h2>
                  <button onClick={() => setShowCreateVariable(true)} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <Plus size={16} /> Add Variable
                  </button>
                </div>
                <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {Object.entries(variables).length === 0 ? (
                    <div className="p-10 text-center text-muted">No variables defined.</div>
                  ) : Object.entries(variables).map(([name, val]) => (
                    <div key={name} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors group">
                      <div className="col-span-4 font-mono text-sm text-blue-400 font-bold truncate">{name}</div>
                      <div className="col-span-6 font-mono text-sm text-muted bg-black/20 px-2 py-1 rounded truncate select-all">{val}</div>
                      <div className="col-span-2 text-right flex justify-end gap-2">
                        <button onClick={() => setShowEditVariable(name)} className="p-1.5 text-muted hover:text-white"><Edit2 size={16} /></button>
                        <button onClick={() => {
                          setConfirmModal({
                            show: true,
                            title: 'Delete Variable',
                            message: `Are you sure you want to delete variable ${name}?`,
                            danger: true,
                            onConfirm: async () => {
                              await remove(ref(db, `applications/${userSecret}/${currentApp}/variables/${name}`));
                              addToast('Variable Deleted');
                              setConfirmModal(prev => ({ ...prev, show: false }));
                            }
                          });
                        }} className="p-1.5 text-muted hover:text-danger"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {activeTab === 'interrogation' && (
              <div className="space-y-8 animate-fade-in pb-12">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-4 bg-white/5 rounded-3xl border border-white/5 shadow-xl">
                    <Webhook className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Interrogation</h2>
                    <p className="text-muted text-[10px] uppercase font-bold tracking-widest mt-1">Remote Integration & Bot Control</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  <div className="space-y-6">
                    <div className="bg-surface border border-border p-10 rounded-[3rem] space-y-8 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                      <div className="relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3">
                          <Share2 size={16} className="text-muted" /> Discord Webhook Sync
                        </h3>

                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest uppercase text-muted/50 ml-4">Webhook Endpoint URL</label>
                            <input
                              type="text"
                              value={webhookSettings.url}
                              onChange={(e) => setWebhookSettings(p => ({ ...p, url: e.target.value }))}
                              placeholder="https://discord.com/api/webhooks/..."
                              className="w-full bg-surfaceHighlight border border-white/5 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-white/20 transition-all font-mono placeholder:opacity-20"
                            />
                          </div>

                          <div className="space-y-4 pt-4">
                            <h4 className="text-[10px] font-black tracking-widest uppercase text-muted/50 ml-4 mb-4">Event Subscription</h4>
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { id: 'notifyLogin', label: 'First Time Login' },
                                { id: 'notifyAddUser', label: 'User Created' },
                                { id: 'notifyDeleteUser', label: 'User Deleted' },
                                { id: 'notifyAddLicense', label: 'License Created' },
                                { id: 'notifyExpireLicense', label: 'License Expired' },
                                { id: 'notifyPauseApp', label: 'App Status Modified' }
                              ].map(event => (
                                <div key={event.id} className="p-5 rounded-3xl border border-white/5 bg-white/[0.02] flex items-center justify-between hover:bg-white/[0.04] transition-all group/item">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all ${(webhookSettings as any)[event.id] ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-white/10'}`} />
                                    <span className="text-xs font-bold text-muted group-hover/item:text-white transition-colors">{event.label}</span>
                                  </div>
                                  <CustomCheckbox checked={(webhookSettings as any)[event.id]} onChange={(v) => setWebhookSettings(p => ({ ...p, [event.id]: v }))} />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-6">
                            <button
                              onClick={async () => {
                                await set(ref(db, `webhookSettings/${userSecret}`), encrypt(webhookSettings));
                                addToast('Webhook protocols synchronized');
                              }}
                              className="w-full bg-white text-black py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-white/5"
                            >
                              Save Webhook Configuration
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  
                  <div className="space-y-6">
                    <div className="bg-surface border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group h-full">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-10">
                          <div className="p-4 bg-blue-500/10 rounded-3xl border border-blue-500/20">
                            <Bot className="text-blue-400" size={24} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Public Interrogation</h3>
                            <p className="text-[10px] text-blue-400/50 font-black uppercase tracking-tight mt-1">Multi-Server Management Bot</p>
                          </div>
                        </div>

                        <div className="space-y-8 flex-grow">
                          <p className="text-muted text-sm leading-relaxed font-bold">
                            Bridge the gap between your community and your infrastructure. Manage your users, licenses, and apps directly within Discord using advanced slash commands.
                          </p>

                          <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-start gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                              <div className="p-3 bg-white/5 rounded-2xl text-blue-400"><Users size={18} /></div>
                              <div className="space-y-1">
                                <div className="text-xs font-black uppercase tracking-widest text-white">Live Interrogation</div>
                                <div className="text-[10px] text-muted font-bold uppercase leading-relaxed">Instantly view user activity and manage bans from any authorized server</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                              <div className="p-3 bg-white/5 rounded-2xl text-blue-400"><Key size={18} /></div>
                              <div className="space-y-1">
                                <div className="text-xs font-black uppercase tracking-widest text-white">Rapid Deployment</div>
                                <div className="text-[10px] text-muted font-bold uppercase leading-relaxed">Generate single or bulk licenses and assign them to users in seconds</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                              <div className="p-3 bg-white/5 rounded-2xl text-blue-400"><ShieldAlert size={18} /></div>
                              <div className="space-y-1">
                                <div className="text-xs font-black uppercase tracking-widest text-white">Zero Compromise</div>
                                <div className="text-[10px] text-muted font-bold uppercase leading-relaxed">Maintains our industry-standard AES encryption across all channels</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-white/5">
                          <div className="bg-gradient-to-br from-blue-500/10 to-transparent rounded-[2rem] p-8 border border-blue-500/20 text-center relative overflow-hidden group/btn">
                            <div className="absolute inset-0 bg-blue-400/5 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            <div className="relative z-10">
                              <div className="text-xs font-black text-blue-400 uppercase tracking-[0.4em] mb-4">Status: Active</div>
                              <p className="text-[10px] text-blue-300/40 font-black uppercase mb-8 leading-relaxed px-6">
                                Integrate your Discord server with our authentication infrastructure for seamless multi-server management.
                              </p>
                              <a
                                href="https://discord.com/api/oauth2/authorize?client_id=1454665401290981501&permissions=8&scope=bot%20applications.commands"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-gray-200 transition-all shadow-2xl shadow-blue-500/20"
                              >
                                <Bot size={14} /> Invite Public Bot
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            {activeTab === 'resellers' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Reseller Management</h2>
                    <p className="text-muted text-sm mt-1">Create and manage sub-accounts with restricted access</p>
                  </div>
                  <button onClick={() => setShowCreateReseller(true)} className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <Plus size={16} /> Create Reseller
                  </button>
                </div>

                <div className="bg-surface border border-border rounded-2xl overflow-hidden divide-y divide-border">
                  {Object.entries(resellers).length === 0 ? (
                    <div className="p-10 text-center text-muted">No resellers found. Create one to get started.</div>
                  ) : (Object.entries(resellers) as [string, Reseller][]).map(([hash, r]) => (
                    <div key={hash} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center hover:bg-white/5 transition-colors group">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-lg">{r.username}</span>
                        <span className="text-[10px] text-muted font-mono uppercase tracking-widest mt-1">Created: {new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted uppercase">Allowed Apps</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.allowedApps?.map(appStr => {
                            const appName = appStr.split('::')[1] || appStr;
                            return <span key={appStr} className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/5">{appName}</span>
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-muted uppercase">User Limit</span>
                        <span className="font-bold text-white">{r.userLimit === -1 ? 'Unlimited' : r.userLimit}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/#/reseller/${hash}`;
                            navigator.clipboard.writeText(url);
                            addToast('Portal Link Copied');
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-surfaceHighlight hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <Copy size={14} /> Portal Link
                        </button>
                        <button onClick={() => setShowEditReseller(hash)} className="p-2 text-muted hover:text-white rounded-lg hover:bg-white/10 transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => {
                          setConfirmModal({
                            show: true,
                            title: 'Delete Reseller',
                            message: `Delete ${r.username}? This will also remove ALL users and licenses created by this reseller.`,
                            danger: true,
                            onConfirm: async () => {
                              const emailKey = auth.currentUser?.email?.replace(/\./g, ',') || '';
                              if (!emailKey) return;


                              await remove(ref(db, `resellers/${hash}`));
                              addToast('Reseller Deleted');
                              setConfirmModal(prev => ({ ...prev, show: false }));
                            }
                          });
                        }} className="p-2 text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Account Settings</h2>

                
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Crown size={20} className="text-yellow-500" /> Plan & Usage
                    </h3>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted">{customer?.plan || 'Free'} Plan</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Users & Licenses Used</span>
                        <span className="font-bold">{(Object.keys(users).length + Object.keys(licenses).length)} / {planLimits?.maxUsers || '∞'}</span>
                      </div>
                      <div className="h-2 bg-surfaceHighlight rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-500"
                          style={{ width: `${Math.min(100, ((Object.keys(users).length + Object.keys(licenses).length) / (planLimits?.maxUsers || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Credits Available</span>
                        <span className="font-bold text-success">{customer?.credits || 0}</span>
                      </div>
                      <div className="h-2 bg-surfaceHighlight rounded-full overflow-hidden">
                        <div className="h-full bg-success opacity-50 w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
                      <div className="text-[10px] font-bold text-muted uppercase mb-1">Max Apps</div>
                      <div className="text-lg font-bold">{planLimits?.maxApps === -1 ? '∞' : planLimits?.maxApps || '∞'}</div>
                    </div>
                    <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
                      <div className="text-[10px] font-bold text-muted uppercase mb-1">Max Users</div>
                      <div className="text-lg font-bold">{planLimits?.maxUsers || '∞'}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-6">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Settings size={20} /> System Preferences
                  </h3>
                  
                  <div className="flex items-center justify-between p-4 bg-surfaceHighlight/30 rounded-xl border border-border hover:border-white/20 transition-all">
                    <div>
                      <div className="font-bold text-sm">Auto-clear Expired Data</div>
                      <div className="text-xs text-muted">Automatically remove users and licenses once they expire.</div>
                    </div>
                    <button 
                      onClick={async () => {
                        if (!currentApp || !userSecret) return;
                        const newMeta = { ...apps[currentApp], autoClearExpired: !apps[currentApp]?.autoClearExpired };
                        await update(ref(db, `applications/${userSecret}/${currentApp}`), { metadata: encrypt(newMeta) });
                        addToast(`Auto-clear ${newMeta.autoClearExpired ? 'Enabled' : 'Disabled'}`);
                      }}
                      className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${apps[currentApp || '']?.autoClearExpired ? 'bg-success' : 'bg-surfaceHighlight border border-border'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${apps[currentApp || '']?.autoClearExpired ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button onClick={() => navigate('/forgot-password')} className="bg-surface border border-border p-6 rounded-2xl text-left hover:border-white/30 transition-all group">
                    <div className="h-10 w-10 bg-surfaceHighlight rounded-lg flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-colors">
                      <Key size={20} />
                    </div>
                    <h3 className="font-bold mb-1">Reset Password</h3>
                    <p className="text-sm text-muted">Send a password reset email to your account.</p>
                  </button>
                  <button onClick={() => {
                    setConfirmModal({
                      show: true,
                      title: 'Delete Account',
                      message: 'This will delete ALL data forever. This action is irreversible. Confirm?',
                      danger: true,
                      onConfirm: async () => {
                        if (!userSecret) return;
                        await remove(ref(db, `applications/${userSecret}`));
                        await remove(ref(db, `customers/${auth.currentUser?.email?.replace(/\./g, ',')}`));
                        await auth.currentUser?.delete();
                        setConfirmModal(prev => ({ ...prev, show: false }));
                        navigate('/login');
                      }
                    });
                  }} className="bg-surface border border-danger/20 p-6 rounded-2xl text-left hover:bg-danger/5 transition-all group">
                    <div className="h-10 w-10 bg-danger/10 text-danger rounded-lg flex items-center justify-center mb-4">
                      <Trash2 size={20} />
                    </div>
                    <h3 className="font-bold mb-1 text-danger">Delete Account</h3>
                    <p className="text-sm text-muted">Permanently remove your account and all data.</p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      

      {showOnboarding && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-[40px] p-12 max-w-xl text-center shadow-2xl animate-scale-up relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                <Box size={48} className="text-white opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-4xl font-black mb-6 tracking-tight">Welcome to <span className="text-white">TXA Security</span></h2>
              <p className="text-muted text-lg font-medium mb-12 leading-relaxed max-w-md mx-auto">
                Protect your software with industry-leading encryption. Let's start by creating your first application profile to generate your master keys.
              </p>
              <div className="flex flex-col items-center gap-6">
                <button
                  onClick={() => { setShowOnboarding(false); setShowCreateApp(true); }}
                  className="group relative bg-white text-black font-black py-5 px-16 rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95 uppercase tracking-[0.2em] text-xs overflow-hidden"
                >
                  <span className="relative z-10">Create Application</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/5 to-black/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </button>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  Pointing you To the app selector next
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                </p>
              </div>
            </div>

            
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          </div>
        </div>
      )}

      {showCreateApp && <Modal title="New Application" onClose={() => setShowCreateApp(false)}>
        <form onSubmit={handleCreateApp} className="space-y-6">
          <input name="appName" placeholder="e.g. My Awesome Tool" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none focus:border-white/30" required />
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowCreateApp(false)} className="w-full bg-transparent border border-border text-white font-medium py-3 rounded-xl hover:bg-surfaceHighlight transition-colors">Cancel</button>
            <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors uppercase tracking-widest text-xs">Create</button>
          </div>
        </form>
      </Modal>}

      {showCreateUser && <Modal title="Create User" onClose={() => setShowCreateUser(false)}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const u = d.get('u') as string;
          const p = d.get('p') as string;

          if (!u || !p || !userSecret || !currentApp) return;
          const exp = calculateExpiry(createVal, createUnit);
          try {
            const resp = await fetch('/create_user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ownerEmailKey: auth.currentUser?.email?.replace(/\./g, ','),
                username: u,
                password: p,
                secret: userSecret,
                appName: currentApp,
                appVersion: apps[currentApp]?.version || '1.0',
                hwid: "",
                expiry: exp,
                subscription: "default"
              })
            });
            const result = await resp.json();
            if(!result.success) throw new Error(result.message);
          } catch(err) {
            await set(ref(db, `applications/${userSecret}/${currentApp}/users/${u}`), encrypt({
              password: p, expiry: exp, isBanned: false, hwidLock: createHwidLock, sid: "", oneTime: createOneTime, created: new Date().toISOString()
            }));
          }
          setShowCreateUser(false);
          await sendWebhook('notifyAddUser', {
            title: 'User Created',
            description: `Account **${u}** added to **${currentApp}**.`,
            color: 0x2ecc71,
            fields: [
              { name: 'User', value: u, inline: true },
              { name: 'Expiry', value: exp === 'lifetime' ? 'Lifetime' : new Date(exp).toLocaleDateString(), inline: true }
            ]
          });
          addToast('User Created');
        }} className="space-y-4">
          <input name="u" placeholder="Username" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" required />
          <input name="p" placeholder="Password" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" required />
          <div className="flex gap-2">
            {createUnit !== 'lifetime' && (
              <input type="number" value={createVal} onChange={(e) => setCreateVal(parseInt(e.target.value) || 0)} className="w-24 bg-surfaceHighlight border border-border rounded-xl px-4 focus:outline-none" />
            )}
            <CustomSelect value={createUnit} options={[{ label: 'Lifetime', value: 'lifetime' }, { label: 'Minutes', value: 'minutes' }, { label: 'Hours', value: 'hours' }, { label: 'Days', value: 'days' }, { label: 'Months', value: 'months' }]} onChange={setCreateUnit} />
          </div>
          <div className="space-y-3">
            <CustomCheckbox checked={createHwidLock} onChange={setCreateHwidLock} label="HWID Lock" />
            <CustomCheckbox checked={createOneTime} onChange={setCreateOneTime} label="One-Time Login" />
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Create User</button>
        </form>
      </Modal>}

      {showEditUser && <Modal title={`Edit ${showEditUser}`} onClose={() => setShowEditUser(null)}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">Extend Expiry</label>
            <div className="flex gap-2">
              {extendUnit !== 'lifetime' && (
                <input id="extend-val" type="number" defaultValue="1" className="w-24 bg-surfaceHighlight border border-border rounded-xl px-4 focus:outline-none" />
              )}
              <CustomSelect value={extendUnit} options={[{ label: 'Minutes', value: 'minutes' }, { label: 'Hours', value: 'hours' }, { label: 'Days', value: 'days' }, { label: 'Months', value: 'months' }, { label: 'Lifetime', value: 'lifetime' }]} onChange={setExtendUnit} />
              <button onClick={async () => {
                const valInput = document.getElementById('extend-val') as HTMLInputElement;
                const val = valInput ? parseInt(valInput.value) : 1;
                const unit = extendUnit;

                try {
                  const userSnap = await get(ref(db, `applications/${userSecret}/${currentApp}/users/${showEditUser}`));
                  if (userSnap.exists()) {
                    const userData = decrypt(userSnap.val());
                    const newExp = calculateExpiry(val, unit);
                    await set(ref(db, `applications/${userSecret}/${currentApp}/users/${showEditUser}`), encrypt({
                      ...userData,
                      expiry: newExp
                    }));
                    addToast('Expiry Updated');
                  }
                } catch (err) {
                  addToast('Failed to update expiry.', 'error');
                }
              }} className="px-4 bg-white text-black font-bold rounded-xl text-sm">Set</button>
            </div>
            <input type="hidden" id="extend-unit-hidden" value={extendUnit} />
          </div>
          <div className="space-y-4">
            <CustomCheckbox checked={users[showEditUser]?.hwidLock} onChange={async (v) => {
              const userSnap = await get(ref(db, `applications/${userSecret}/${currentApp}/users/${showEditUser}`));
              if (userSnap.exists()) {
                const userData = decrypt(userSnap.val());
                await set(ref(db, `applications/${userSecret}/${currentApp}/users/${showEditUser}`), encrypt({
                  ...userData,
                  hwidLock: v
                }));
                addToast('HWID Lock status updated.');
              }
            }} label="HWID Lock" />
            <div className="flex justify-between items-center p-3 border border-border rounded-xl bg-surfaceHighlight/50">
              <span className="text-sm text-muted font-mono truncate">{users[showEditUser]?.sid || 'No HWID'}</span>
              <button onClick={async () => {
                const userSnap = await get(ref(db, `applications/${userSecret}/${currentApp}/users/${showEditUser}`));
                if (userSnap.exists()) {
                  const userData = decrypt(userSnap.val());
                  await set(ref(db, `applications/${userSecret}/${currentApp}/users/${showEditUser}`), encrypt({
                    ...userData,
                    sid: ""
                  }));
                  addToast('HWID Reset');
                }
              }} className="text-xs bg-surfaceHighlight px-2 py-1 rounded text-white border border-border hover:bg-white/20">Reset</button>
            </div>
          </div>
        </div>
      </Modal>}

      {showEditLicense && <Modal title={`Edit License ${showEditLicense}`} onClose={() => setShowEditLicense(null)}>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">Update Expiry</label>
            <div className="flex gap-2">
              {extendUnit !== 'lifetime' && (
                <input id="lic-extend-val" type="number" defaultValue="1" className="w-24 bg-surfaceHighlight border border-border rounded-xl px-4 focus:outline-none" />
              )}
              <CustomSelect value={extendUnit} options={[{ label: 'Minutes', value: 'minutes' }, { label: 'Hours', value: 'hours' }, { label: 'Days', value: 'days' }, { label: 'Months', value: 'months' }, { label: 'Lifetime', value: 'lifetime' }]} onChange={setExtendUnit} />
              <button onClick={async () => {
                const valInput = document.getElementById('lic-extend-val') as HTMLInputElement;
                const val = valInput ? parseInt(valInput.value) : 1;
                const unit = extendUnit;
                try {
                  const licSnap = await get(ref(db, `applications/${userSecret}/${currentApp}/licenses/${showEditLicense}`));
                  if (licSnap.exists()) {
                    const licData = decrypt(licSnap.val());
                    const newExp = calculateExpiry(val, unit);
                    await set(ref(db, `applications/${userSecret}/${currentApp}/licenses/${showEditLicense}`), encrypt({ ...licData, expiry: newExp }));
                    if (licData.associatedUser) {
                      const cUser = licData.associatedUser;
                      const userSnap = await get(ref(db, `applications/${userSecret}/${currentApp}/users/${cUser}`));
                      if (userSnap.exists()) {
                        const userData = decrypt(userSnap.val());
                        await set(ref(db, `applications/${userSecret}/${currentApp}/users/${cUser}`), encrypt({ ...userData, expiry: newExp }));
                      }
                    }
                    addToast('License & User Expiry Updated');
                  }
                } catch (err) { addToast('Failed to update.', 'error'); }
              }} className="px-4 bg-white text-black font-bold rounded-xl text-sm">Set</button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 border border-border rounded-xl bg-surfaceHighlight/50">
              <span className="text-xs text-muted flex flex-col">
                <span className="font-bold flex items-center gap-1 uppercase tracking-tighter"><Monitor size={12} /> HWID Status</span>
                <span>{licenses[showEditLicense || '']?.associatedUser ? `Linked to ${licenses[showEditLicense || ''].associatedUser}` : 'Unlinked'}</span>
              </span>
              <button onClick={async () => {
                const lic = licenses[showEditLicense || ''];
                if (lic && lic.associatedUser) {
                  const cUser = lic.associatedUser;
                  const userSnap = await get(ref(db, `applications/${userSecret}/${currentApp}/users/${cUser}`));
                  if (userSnap.exists()) {
                    const userData = decrypt(userSnap.val());
                    await set(ref(db, `applications/${userSecret}/${currentApp}/users/${cUser}`), encrypt({ ...userData, sid: "" }));
                    addToast('User HWID Reset');
                  }
                } else { addToast('No user linked to this license', 'error'); }
              }} className="text-[10px] bg-surfaceHighlight px-3 py-2 rounded text-white border border-border hover:bg-white/20 font-bold uppercase tracking-widest">Reset User HWID</button>
            </div>
          </div>
        </div>
      </Modal>}

      {showCreateLicense && <Modal title="Generate License" onClose={() => setShowCreateLicense(false)}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const prefix = (d.get('prefix') as string || 'TXA').toUpperCase();
          const displayName = d.get('displayName') as string;
          const amount = genAmount;

          if (!userSecret || !currentApp) return;
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          const newKeys: string[] = [];
          const exp = calculateExpiry(genLicVal, genLicenseUnit);

          setLoading(true);
          try {
            for (let a = 0; a < amount; a++) {
              let key = prefix;
              for (let i = 0; i < parseInt(licenseSegs); i++) {
                key += "-";
                for (let j = 0; j < parseInt(licenseLen); j++) key += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              
              try {
                const resp = await fetch('/create_license', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ownerEmailKey: auth.currentUser?.email?.replace(/\./g, ','),
                    secret: userSecret,
                    appName: currentApp,
                    licenseKey: key,
                    rank: 'default',
                    expiry: exp,
                    note: displayName || ''
                  })
                });
                const result = await resp.json();
                if(!result.success) throw new Error(result.message);
              } catch(err) {
                await set(ref(db, `applications/${userSecret}/${currentApp}/licenses/${key}`), encrypt({
                  expiry: exp, displayName: displayName || '', used: false, created: new Date().toISOString()
                }));
              }
              newKeys.push(key);
            }

            setGeneratedKeys(newKeys);
            setShowCreateLicense(false);
            setShowGeneratedKeys(true);
            
            await sendWebhook('notifyAddLicense', {
              title: 'Licenses Generated',
              description: `**${amount}** new license key(s) created for **${currentApp}**.`,
              color: 0x9b59b6,
              fields: [
                { name: 'Amount', value: amount.toString(), inline: true },
                { name: 'Expiry', value: exp === 'lifetime' ? 'Lifetime' : new Date(exp).toLocaleDateString(), inline: true }
              ]
            });
            addToast(`Generated ${amount} licenses`);
          } catch (err) {
            addToast('Failed to generate licenses', 'error');
          }
          setLoading(false);
        }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted mb-1 block">Prefix</label>
              <input name="prefix" placeholder="Prefix (TXA)" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted mb-1 block">Display Name</label>
              <input name="displayName" placeholder="Display Name" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Segments</label>
              <CustomSelect value={licenseSegs} options={[{ label: '4 Segments', value: '4' }, { label: '5 Segments', value: '5' }]} onChange={setLicenseSegs} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Length</label>
              <CustomSelect value={licenseLen} options={[{ label: '4 Chars', value: '4' }, { label: '5 Chars', value: '5' }]} onChange={setLicenseLen} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Amount</label>
              <input type="number" value={genAmount} onChange={(e) => setGenAmount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-surfaceHighlight border border-border rounded-xl p-3.5 focus:outline-none" min="1" max="100" />
            </div>
          </div>
          <div className="flex gap-2">
            {genLicenseUnit !== 'lifetime' && (
              <input type="number" value={genLicVal} onChange={(e) => setGenLicVal(parseInt(e.target.value) || 0)} className="w-24 bg-surfaceHighlight border border-border rounded-xl px-4 focus:outline-none" />
            )}
            <CustomSelect value={genLicenseUnit} options={[{ label: 'Lifetime', value: 'lifetime' }, { label: 'Minutes', value: 'minutes' }, { label: 'Hours', value: 'hours' }, { label: 'Days', value: 'days' }]} onChange={setGenLicenseUnit} />
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Generate</button>
        </form>
      </Modal>}

      {showGeneratedKeys && (
        <Modal title="Generated Licenses" onClose={() => setShowGeneratedKeys(false)}>
          <div className="space-y-6">
            <div className="bg-black/20 border border-border rounded-xl p-4 max-h-60 overflow-y-auto custom-scrollbar font-mono text-xs space-y-2">
              {generatedKeys.map(k => (
                <div key={k} className="flex justify-between items-center group">
                  <span className="text-blue-400">{k}</span>
                  <button onClick={() => { navigator.clipboard.writeText(k); addToast('Key copied'); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-white">
                    <Copy size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(generatedKeys.join('\n'));
                  addToast('All keys copied to clipboard');
                }}
                className="flex items-center justify-center gap-2 bg-surfaceHighlight border border-border p-3 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors"
              >
                <Copy size={16} /> Copy All
              </button>
              <button 
                onClick={() => {
                  const data = JSON.stringify(generatedKeys, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `licenses_${new Date().getTime()}.json`;
                  a.click();
                  addToast('JSON Downloaded');
                }}
                className="flex items-center justify-center gap-2 bg-surfaceHighlight border border-border p-3 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors"
              >
                <Database size={16} /> Download JSON
              </button>
            </div>
            <button onClick={() => setShowGeneratedKeys(false)} className="w-full bg-white text-black font-bold py-3 rounded-xl uppercase tracking-widest text-xs">Close</button>
          </div>
        </Modal>
      )}

      {showCreateVariable && <Modal title="Add Variable" onClose={() => setShowCreateVariable(false)}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          const n = (d.get('n') as string).trim();
          const v = d.get('v') as string;
          if (!n || !v || !userSecret || !currentApp) return;
          await update(ref(db, `applications/${userSecret}/${currentApp}/variables`), { [n]: encrypt(v) });
          setShowCreateVariable(false);
          addToast('Variable saved');
        }} className="space-y-4">
          <input name="n" placeholder="Variable Name (e.g. status)" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" required />
          <input name="v" placeholder="Value (e.g. active)" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" required />
          <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Add Variable</button>
        </form>
      </Modal>}

      {showEditVariable && <Modal title="Edit Variable" onClose={() => setShowEditVariable(null)}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted mb-1 block">Variable Name</label>
            <input type="text" value={showEditVariable} className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none text-muted cursor-not-allowed" disabled />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Value</label>
            <input id="editVarVal" type="text" defaultValue={variables[showEditVariable]} className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none" />
          </div>
          <button onClick={async () => {
            const val = (document.getElementById('editVarVal') as HTMLInputElement).value;
            await update(ref(db, `applications/${userSecret}/${currentApp}/variables`), { [showEditVariable]: encrypt(val) });
            setShowEditVariable(null);
            addToast('Variable updated');
          }} className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Save Changes</button>
        </div>
      </Modal>}

      {showCreateReseller && (
        <Modal title="Create Reseller" onClose={() => setShowCreateReseller(false)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            const username = d.get('username') as string;
            const password = d.get('password') as string;
            if (!username || !password) return;

            const selectedApps: string[] = [];
            document.querySelectorAll('input[name="app_select"]:checked').forEach((cb: any) => {
              selectedApps.push(cb.value);
            });

            if (selectedApps.length === 0) return addToast('Select at least one app', 'error');

            const limit = d.get('unlimited') === 'on' ? -1 : parseInt(d.get('limit') as string);
            const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const newReseller: Reseller = {
              username,
              passwordHash: password, 
              hash,
              allowedApps: selectedApps,
              userLimit: limit,
              createdBy: auth.currentUser?.email?.replace(/\./g, ',') || '',
              createdAt: new Date().toISOString(),
              usersCreated: 0,
              licensesCreated: 0,
              panelName: d.get('panelName') as string || undefined
            };

            await set(ref(db, `resellers/${hash}`), encrypt(newReseller));
            setShowCreateReseller(false);
            addToast('Reseller Created');
          }} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Username</label>
              <input name="username" placeholder="Reseller User" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Password</label>
              <input name="password" type="text" placeholder="Access Password" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Panel Name (Optional)</label>
              <input name="panelName" placeholder="e.g. My Custom Panel" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Allowed Applications</label>
              <div className="bg-surfaceHighlight border border-border rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
                {Object.keys(apps).length === 0 && <div className="text-muted text-xs">No apps found.</div>}
                {Object.keys(apps).map(appName => (
                  <label key={appName} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                    <input type="checkbox" name="app_select" value={`${userSecret}::${appName}`} className="accent-white" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{appName}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">User Limit</label>
                <input name="limit" type="number" defaultValue="50" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="unlimited" id="unl" />
                <label htmlFor="unl" className="text-sm text-muted">Unlimited</label>
              </div>
            </div>

            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Create Account</button>
          </form>
        </Modal>
      )}

      {showEditReseller && resellers[showEditReseller] && (
        <Modal title="Edit Reseller" onClose={() => setShowEditReseller(null)}>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            const r = resellers[showEditReseller];
            if (!r) return;

            const selectedApps: string[] = [];
            document.querySelectorAll('input[name="app_select_edit"]:checked').forEach((cb: any) => {
              selectedApps.push(cb.value);
            });

            if (selectedApps.length === 0) return addToast('Select at least one app', 'error');

            const limit = d.get('unlimited') === 'on' ? -1 : parseInt(d.get('limit') as string);

            const updated: Reseller = {
              ...r,
              userLimit: limit,
              allowedApps: selectedApps,
              panelName: d.get('panelName') as string || undefined
            };

            const pwd = d.get('password') as string;
            if (pwd) updated.passwordHash = pwd;

            await set(ref(db, `resellers/${r.hash}`), encrypt(updated));
            setShowEditReseller(null);
            addToast('Reseller updated');
          }} className="space-y-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
              <span className="text-xs font-bold text-muted uppercase tracking-widest">Reseller</span>
              <span className="text-sm font-mono text-white">{resellers[showEditReseller].username}</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">New Password</label>
              <input name="password" type="text" placeholder="Leave empty to keep current" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none placeholder:text-muted/30" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Panel Name</label>
              <input name="panelName" defaultValue={resellers[showEditReseller].panelName || ''} placeholder="e.g. My Custom Panel" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-muted uppercase ml-1">Allowed Applications</label>
              <div className="bg-surfaceHighlight border border-border rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
                {Object.keys(apps).map(appName => (
                  <label key={`edit-${appName}`} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                    <input type="checkbox" name="app_select_edit" value={`${userSecret}::${appName}`} defaultChecked={resellers[showEditReseller].allowedApps?.includes(`${userSecret}::${appName}`)} className="accent-white" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{appName}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">User Limit</label>
                <input name="limit" type="number" defaultValue={resellers[showEditReseller].userLimit === -1 ? 50 : resellers[showEditReseller].userLimit} className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" name="unlimited" id="unl-edit" defaultChecked={resellers[showEditReseller].userLimit === -1} />
                <label htmlFor="unl-edit" className="text-sm text-muted">Unlimited</label>
              </div>
            </div>

            <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Update Reseller</button>
          </form>
        </Modal>
      )}

      
      {confirmModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-surface border border-border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-8 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${confirmModal.danger ? 'bg-danger/10 text-danger' : 'bg-white/10 text-white'}`}>
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">{confirmModal.title}</h3>
              <p className="text-muted text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 bg-surfaceHighlight hover:bg-white/5 text-white font-bold py-3 rounded-xl transition-all border border-border"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                  }}
                  className={`flex-1 font-bold py-3 rounded-xl transition-all ${confirmModal.danger ? 'bg-danger text-white hover:bg-danger/80' : 'bg-white text-black hover:bg-gray-200'}`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};



export default Dashboard;
