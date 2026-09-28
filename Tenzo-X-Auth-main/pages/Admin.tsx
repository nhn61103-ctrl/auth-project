
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ref, onValue, set, remove, get } from 'firebase/database';
import {
  Users, BarChart2, Box, LogOut, Trash2, Edit2,
  Plus, Coins, ShieldCheck, Mail, ArrowLeft, Loader2,
  Search, X, Key, Info, AlertTriangle, Crown, Settings,
  ArrowUp, ArrowDown, Hammer, GripVertical, Code
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { encrypt, decrypt } from '../services/encryption';
import { Customer, SystemPlan, SystemConfig, SDK } from '../types';
import { ADMIN_EMAIL } from '../constants';

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
    <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
        <h3 className="text-xl font-black uppercase tracking-widest text-muted/50 text-[10px]">{title}</h3>
        <button onClick={onClose} className="text-muted hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button>
      </div>
      <div className="p-8 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [plans, setPlans] = useState<Record<string, SystemPlan>>({});
  const [allApps, setAllApps] = useState<{ name: string; secret: string; owner: string }[]>([]);
  const [appCount, setAppCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'users' | 'plans' | 'system'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [maintenance, setMaintenance] = useState<SystemConfig>({ maintenanceMode: false, maintenanceMessage: '' });

  const [showEditUserPlan, setShowEditUserPlan] = useState<string | null>(null); 
  const [showGiveCredits, setShowGiveCredits] = useState<string | null>(null); 
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState<string | null>(null); 
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean, title: string, message: string, onConfirm: () => void, danger?: boolean
  }>({ show: false, title: '', message: '', onConfirm: () => { } });

  const [toasts, setToasts] = useState<{ id: number, msg: string, type: 'success' | 'error' }[]>([]);

  const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    if (auth.currentUser?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      navigate('/dashboard');
      return;
    }

    const loadingTimer = setTimeout(() => setLoading(false), 5000);

    onValue(ref(db, 'customers'), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, Customer> = {};
      Object.keys(raw).forEach(k => {
        const result = decrypt(raw[k]);
        if (result && typeof result === 'object') dec[k] = result as Customer;
      });
      setCustomers(dec);
      clearTimeout(loadingTimer);
      setLoading(false);
    });

    onValue(ref(db, 'system/plans'), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, SystemPlan> = {};
      Object.keys(raw).forEach(k => dec[k] = decrypt(raw[k]));

      if (!dec['Free Plan']) {
        const free = { maxApps: 1, maxUsers: 50, onSale: true, creditPrice: 0, price: 'Free', order: 0 };
        set(ref(db, 'system/plans/Free Plan'), encrypt(free));
        dec['Free Plan'] = free;
      }

      setPlans(dec);
    });



    onValue(ref(db, 'system/config'), (snap) => {
      setMaintenance(snap.val() || { maintenanceMode: false, maintenanceMessage: '' });
    });

    onValue(ref(db, 'applications'), (snap) => {
      let count = 0;
      const data = snap.val() || {};
      Object.values(data).forEach((userApps: any) => {
        count += Object.keys(userApps).length;
      });
      setAppCount(count);
      const appsList: { name: string; secret: string; owner: string }[] = [];
      Object.keys(data).forEach(secret => {
        Object.keys(data[secret]).forEach(appName => {
          const owner = (Object.values(customers) as Customer[]).find(c => c.secret === secret)?.email || 'Unknown';
          appsList.push({ name: appName, secret, owner });
        });
      });
      setAllApps(appsList);

      let userCount = 0;
      Object.keys(data).forEach(secret => {
        Object.values(data[secret]).forEach((app: any) => {
          if (app.users) {
            userCount += Object.keys(app.users).length;
          }
        });
      });
      set(ref(db, 'system/stats'), {
        totalUsers: userCount,
        totalApps: count,
        lastUpdated: Date.now()
      });
    });

    return () => clearTimeout(loadingTimer);
  }, []);

  const filteredCustomers = (Object.entries(customers) as [string, Customer][]).filter(([key, cust]) =>
    (cust?.email?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
    (cust?.secret?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen bg-background text-white">
      
      <aside className="w-64 bg-surface border-r border-border p-6 flex flex-col">
        <div className="flex items-center gap-2 font-black text-xl mb-12">
          <span className="bg-white text-black px-2 py-0.5 rounded text-sm">TXA</span>
          <span className="text-muted text-sm uppercase">Admin</span>
        </div>
        <nav className="flex-1 space-y-1">
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-muted'}`}>
            <Users size={18} /> Customers
          </button>
          <button onClick={() => setActiveTab('plans')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'plans' ? 'bg-white/10 text-white' : 'text-muted'}`}>
            <BarChart2 size={18} /> System Plans
          </button>
          <button onClick={() => setActiveTab('system')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'system' ? 'bg-white/10 text-white' : 'text-muted'}`}>
            <Hammer size={18} /> System Config
          </button>
        </nav>
        <Link to="/dashboard" className="mt-auto flex items-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-widest text-muted hover:text-white">
          <ArrowLeft size={18} /> Back to App
        </Link>
      </aside>

      <main className="flex-1 overflow-y-auto p-10 space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-black uppercase tracking-tight">Management Console</h1>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-surface border border-border p-6 rounded-2xl">
            <div className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Total Users</div>
            <div className="text-3xl font-black">{Object.keys(customers).length}</div>
          </div>
          <div className="bg-surface border border-border p-6 rounded-2xl">
            <div className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Total Apps</div>
            <div className="text-3xl font-black">{appCount}</div>
          </div>
          <div className="bg-surface border border-border p-6 rounded-2xl">
            <div className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Active Plans</div>
            <div className="text-3xl font-black">{Object.keys(plans).length}</div>
          </div>
          <div className="bg-surface border border-border p-6 rounded-2xl">
            <div className="text-muted text-[10px] font-black uppercase tracking-widest mb-1">Active Plans</div>
            <div className="text-3xl font-black">{Object.keys(plans).length}</div>
          </div>
        </div>

        {activeTab === 'users' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-white transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search by email or secret..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-white/20 transition-all placeholder:text-muted/50"
                />
              </div>
              <button
                onClick={() => setShowGiveCredits('')}
                className="bg-white text-black px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
              >
                <Coins size={14} /> Add Credits
              </button>
            </div>

            <div className="bg-surface border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left text-sm text-white">
                <thead>
                  <tr className="bg-white/[0.02] text-[10px] font-black uppercase tracking-[0.2em] text-muted/60">
                    <th className="p-6">Customer</th>
                    <th className="p-6">Plan</th>
                    <th className="p-6">Credits</th>
                    <th className="p-6">Joined</th>
                    <th className="p-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {(filteredCustomers as [string, Customer][]).map(([key, c]) => (
                    <tr key={key} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{c.email}</span>
                          <span className="text-[10px] font-mono text-muted/50 uppercase tracking-tighter mt-1">{c.secret}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                          {c.plan}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <Coins size={14} className="text-yellow-500" />
                          <span className="font-black text-white">{c.credits}</span>
                        </div>
                      </td>
                      <td className="p-6 text-muted/60 font-medium">
                        {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setShowEditUserPlan(key)}
                            className="p-2.5 bg-white/5 text-muted hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            title="Edit Plan"
                          >
                            <Crown size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                show: true,
                                title: 'Delete Customer',
                                message: `Are you sure you want to delete ${c.email}? This will also delete ALL their applications and data.`,
                                danger: true,
                                onConfirm: async () => {
                                  await remove(ref(db, `customers/${key}`));
                                  await remove(ref(db, `applications/${c.secret}`));
                                  setConfirmModal(prev => ({ ...prev, show: false }));
                                  addToast('Customer deleted');
                                }
                              });
                            }}
                            className="p-2.5 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-xl transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-muted uppercase tracking-widest text-xs font-bold opacity-30">
                        No customers found matching your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'plans' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Object.entries(plans) as [string, SystemPlan][])
              .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
              .map(([name, plan], index, allPlans) => (
                <div
                  key={name}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('planName', name);
                    e.dataTransfer.setData('planIndex', index.toString());
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const draggedName = e.dataTransfer.getData('planName');
                    const draggedIndex = parseInt(e.dataTransfer.getData('planIndex'));
                    if (draggedName === name) return;

                    const newOrder = [...allPlans];
                    const [draggedItem] = newOrder.splice(draggedIndex, 1);
                    newOrder.splice(index, 0, draggedItem);

                    const { update } = await import('firebase/database');
                    const updates: Record<string, string> = {};
                    newOrder.forEach(([pName, pData], i) => {
                      updates[`system/plans/${pName}`] = encrypt({ ...pData, order: i });
                    });

                    await update(ref(db), updates);
                    addToast('Plan order updated');
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-white/40', 'bg-white/[0.03]');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-white/40', 'bg-white/[0.03]');
                  }}
                  onDropCapture={(e) => {
                    e.currentTarget.classList.remove('border-white/40', 'bg-white/[0.03]');
                  }}
                  className="relative group bg-surface border border-white/5 p-8 rounded-[2rem] shadow-xl hover:border-white/20 transition-all flex flex-col h-full cursor-move"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <GripVertical size={20} className="text-muted/30 group-hover:text-white/40" />
                      <div>
                        <h3 className="text-2xl font-black tracking-tight mb-1">{name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${plan.onSale ? 'bg-success/10 text-success border-success/20' : 'bg-muted/10 text-muted/60 border-white/5'}`}>
                            {plan.onSale ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold text-muted/50 uppercase tracking-widest">Max Apps</span>
                      <span className="font-black text-lg">{plan.maxApps}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                      <span className="text-xs font-bold text-muted/50 uppercase tracking-widest">Max Users</span>
                      <span className="font-black text-lg">{plan.maxUsers}</span>
                    </div>
                    <div className="flex justify-between items-center bg-yellow-400/[0.03] p-4 rounded-2xl border border-yellow-400/10">
                      <span className="text-xs font-bold text-yellow-500/50 uppercase tracking-widest">Credit Price</span>
                      <span className="font-black text-lg text-yellow-500">{plan.creditPrice}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-auto">
                    <div className="flex gap-2">
                      <button
                        disabled={index === 0}
                        onClick={async () => {
                          const prev = allPlans[index - 1];
                          const currOrder = plan.order;
                          const prevOrder = prev[1].order;
                          await set(ref(db, `system/plans/${name}`), encrypt({ ...plan, order: prevOrder }));
                          await set(ref(db, `system/plans/${prev[0]}`), encrypt({ ...prev[1], order: currOrder }));
                        }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 flex items-center justify-center gap-2"
                      >
                        <ArrowUp size={14} /> Up
                      </button>
                      <button
                        disabled={index === allPlans.length - 1}
                        onClick={async () => {
                          const next = allPlans[index + 1];
                          const currOrder = plan.order;
                          const nextOrder = next[1].order;
                          await set(ref(db, `system/plans/${name}`), encrypt({ ...plan, order: nextOrder }));
                          await set(ref(db, `system/plans/${next[0]}`), encrypt({ ...next[1], order: currOrder }));
                        }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 flex items-center justify-center gap-2"
                      >
                        <ArrowDown size={14} /> Down
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowEditPlan(name)}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Configure
                      </button>
                      <button
                        onClick={() => {
                          if (name === 'Free Plan') return addToast('Free Plan cannot be deleted', 'error');
                          setConfirmModal({
                            show: true,
                            title: 'Delete Plan',
                            message: `Permanently delete the ${name}? Customers currently on this plan will stay on it but it won't be assignable anymore.`,
                            danger: true,
                            onConfirm: async () => {
                              await remove(ref(db, `system/plans/${name}`));
                              setConfirmModal(prev => ({ ...prev, show: false }));
                              addToast('Plan deleted');
                            }
                          });
                        }}
                        className="px-4 bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 rounded-2xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            <button
              onClick={() => setShowCreatePlan(true)}
              className="group border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center p-12 text-muted/40 hover:text-white hover:border-white/30 hover:bg-white/[0.01] transition-all"
            >
              <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus size={32} />
              </div>
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Develop New Plan</span>
            </button>
          </div>
        ) : (
          <div className="max-w-xl space-y-8 animate-fade-in">
            <div className="bg-surface border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <Hammer className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Maintenance Control</h3>
                  <p className="text-muted text-[10px] uppercase font-bold tracking-widest mt-1">Global System Toggle</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                  <div className="space-y-1">
                    <div className="font-black text-sm uppercase tracking-widest">Maintenance Mode</div>
                    <div className="text-muted text-[10px] uppercase font-bold">Block non-admin access</div>
                  </div>
                  <button
                    onClick={async () => {
                      const newState = !maintenance?.maintenanceMode;
                      await set(ref(db, 'system/config/maintenanceMode'), newState);
                      addToast(`Maintenance mode ${newState ? 'ENABLED' : 'DISABLED'}`);
                    }}
                    className={`w-14 h-8 rounded-full transition-all relative ${maintenance?.maintenanceMode ? 'bg-danger shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${maintenance?.maintenanceMode ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="space-y-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black tracking-widest uppercase text-muted/50 ml-2">Sub-Status Text</label>
                    <input
                      placeholder="e.g. Polishing Gears"
                      value={maintenance?.maintenanceStatus || ''}
                      onChange={(e) => setMaintenance(prev => ({ ...prev, maintenanceStatus: e.target.value }))}
                      className="w-full bg-surfaceHighlight border border-white/5 p-4 rounded-2xl focus:outline-none focus:border-white/20 text-sm"
                    />
                  </div>
                  <div className="space-y-1 mt-4">
                    <label className="text-[10px] font-black tracking-widest uppercase text-muted/50 ml-2">Custom Message</label>
                    <textarea
                      placeholder="We're currently performing some improvements..."
                      value={maintenance?.maintenanceMessage || ''}
                      onChange={(e) => setMaintenance(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                      className="w-full bg-surfaceHighlight border border-white/5 p-6 rounded-3xl focus:outline-none focus:border-white/20 text-sm leading-relaxed"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const { update } = await import('firebase/database');
                      await update(ref(db, 'system/config'), {
                        maintenanceMessage: maintenance.maintenanceMessage || '',
                        maintenanceStatus: maintenance.maintenanceStatus || ''
                      });
                      addToast('Maintenance info updated');
                    }}
                    className="w-full py-4 bg-white hover:bg-gray-200 text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all"
                  >
                    Update All Info
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl">
                  <Code className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">SDK Management</h3>
                  <p className="text-muted text-[10px] uppercase font-bold tracking-widest mt-1">Manage Official SDK Links</p>
                </div>
              </div>

              <div className="space-y-6">
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  const name = d.get('sdkName') as string;
                  const link = d.get('sdkLink') as string;
                  if (!name || !link) return;

                  const newSdks = { ...(maintenance.sdks || {}), [name]: { name, link } };
                  await set(ref(db, 'system/config/sdks'), newSdks);
                  addToast(`SDK ${name} added`);
                  (e.target as HTMLFormElement).reset();
                }} className="space-y-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black tracking-widest uppercase text-muted/50 ml-2">SDK Name</label>
                      <input name="sdkName" placeholder="e.g. Cpp" className="w-full bg-surfaceHighlight border border-white/5 p-4 rounded-2xl focus:outline-none focus:border-white/20 text-sm" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black tracking-widest uppercase text-muted/50 ml-2">Github Link</label>
                      <input name="sdkLink" placeholder="https://github.com/..." className="w-full bg-surfaceHighlight border border-white/5 p-4 rounded-2xl focus:outline-none focus:border-white/20 text-sm" required />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-4 bg-white hover:bg-gray-200 text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all">
                    Add SDK Link
                  </button>
                </form>

                <div className="space-y-2">
                  {(Object.values(maintenance.sdks || {}) as SDK[]).map((sdk) => (
                    <div key={sdk.name} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5 group">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{sdk.name}</span>
                        <span className="text-[10px] text-muted truncate max-w-[200px]">{sdk.link}</span>
                      </div>
                      <button
                        onClick={async () => {
                          const newSdks = { ...maintenance.sdks };
                          delete newSdks[sdk.name];
                          await set(ref(db, 'system/config/sdks'), newSdks);
                          addToast(`SDK ${sdk.name} removed`);
                        }}
                        className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!maintenance.sdks || Object.keys(maintenance.sdks).length === 0) && (
                    <div className="text-center py-6 text-muted text-[10px] uppercase font-bold tracking-widest opacity-30">No SDKs registered</div>
                  )}
                </div>
              </div>
            </div>



            <div className="bg-danger/5 border border-danger/20 p-8 rounded-[2rem] flex items-start gap-4">
              <AlertTriangle className="text-danger mt-1" size={20} />
              <div className="space-y-1">
                <div className="text-danger font-black text-xs uppercase tracking-widest">Administrator Bypass</div>
                <p className="text-danger/60 text-[10px] leading-relaxed uppercase font-bold">
                  Maintenance mode does not affect your account. You will always have access to the Dashboard and Management Console.
                </p>
              </div>
            </div>
          </div>
        )
        }
      </main >

      

      {
        showEditUserPlan && (
          <Modal title="Edit Customer Plan" onClose={() => setShowEditUserPlan(null)}>
            <div className="space-y-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-[10px] font-bold text-muted/50 uppercase mb-1">Customer</div>
                <div className="font-mono text-sm">{customers[showEditUserPlan]?.email}</div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Select Plan</label>
                <select
                  id="adminPlanSelect"
                  defaultValue={customers[showEditUserPlan]?.plan}
                  className="w-full bg-surfaceHighlight border border-white/10 p-4 rounded-xl focus:outline-none focus:border-white/30 text-white appearance-none cursor-pointer"
                >
                  {Object.keys(plans).map(pn => <option key={pn} value={pn}>{pn}</option>)}
                </select>
              </div>
              <button
                onClick={async () => {
                  const newPlan = (document.getElementById('adminPlanSelect') as HTMLSelectElement).value;
                  const cust = { ...customers[showEditUserPlan], plan: newPlan };
                  await set(ref(db, `customers/${showEditUserPlan}`), encrypt(cust));
                  setShowEditUserPlan(null);
                  addToast('Customer plan updated');
                }}
                className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-[0.2em] text-xs hover:bg-gray-200 transition-all"
              >
                Update Plan
              </button>
            </div>
          </Modal>
        )
      }

      {
        showGiveCredits !== null && (
          <Modal title="Give Credits" onClose={() => setShowGiveCredits(null)}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const email = d.get('email') as string;
              const amount = parseInt(d.get('amount') as string);
              if (!email || isNaN(amount)) return;

              const key = email.replace(/\./g, ',');
              const snap = await get(ref(db, `customers/${key}`));
              if (!snap.exists()) return addToast('User not found', 'error');

              const cust = decrypt(snap.val());
              cust.credits = (cust.credits || 0) + amount;
              await set(ref(db, `customers/${key}`), encrypt(cust));
              setShowGiveCredits(null);
              addToast(`Added ${amount} credits to ${email}`);
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Customer Email</label>
                <input name="email" defaultValue={showGiveCredits} placeholder="user@example.com" className="w-full bg-surfaceHighlight border border-white/10 p-4 rounded-xl focus:outline-none focus:border-white/30" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Amount</label>
                <input name="amount" type="number" placeholder="1000" className="w-full bg-surfaceHighlight border border-white/10 p-4 rounded-xl focus:outline-none focus:border-white/30" required />
              </div>
              <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-[0.2em] text-xs">
                Confirm Transaction
              </button>
            </form>
          </Modal>
        )
      }

      {
        showCreatePlan && (
          <Modal title="New System Plan" onClose={() => setShowCreatePlan(false)}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const name = d.get('name') as string;
              if (!name) return;
              const p: SystemPlan = {
                maxApps: parseInt(d.get('maxApps') as string),
                maxUsers: parseInt(d.get('maxUsers') as string),
                onSale: (d.get('onSale') === 'on'),
                creditPrice: parseInt(d.get('creditPrice') as string),
                price: 'Credit Only',
                order: Object.keys(plans).length
              };
              await set(ref(db, `system/plans/${name}`), encrypt(p));
              setShowCreatePlan(false);
              addToast('Plan Created');
            }} className="space-y-4">
              <input name="name" placeholder="Plan Name (e.g. Gold)" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" required />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase ml-1">Max Apps</label>
                  <input name="maxApps" type="number" defaultValue="5" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase ml-1">Max Users</label>
                  <input name="maxUsers" type="number" defaultValue="100" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">Credit Price</label>
                <input name="creditPrice" type="number" defaultValue="500" className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 p-2">
                <input type="checkbox" name="onSale" id="os" />
                <label htmlFor="os" className="text-sm text-muted">Show in public shop</label>
              </div>
              <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Create Plan</button>
            </form>
          </Modal>
        )
      }





      {
        showEditPlan && (
          <Modal title={`Configure ${showEditPlan}`} onClose={() => setShowEditPlan(null)}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              const feats = document.querySelectorAll('input[name="feature"]:checked');
              const selectedFeatures = Array.from(feats).map(f => (f as HTMLInputElement).value);

              const p: SystemPlan = {
                maxApps: parseInt(d.get('maxApps') as string),
                maxUsers: parseInt(d.get('maxUsers') as string),
                onSale: (d.get('onSale') === 'on'),
                creditPrice: parseInt(d.get('creditPrice') as string),
                price: plans[showEditPlan].price,
                order: plans[showEditPlan].order || 0,
                features: selectedFeatures
              };
              await set(ref(db, `system/plans/${showEditPlan}`), encrypt(p));
              setShowEditPlan(null);
              addToast('Plan updated');
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase ml-1">Max Apps</label>
                  <input name="maxApps" type="number" defaultValue={plans[showEditPlan].maxApps} className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted uppercase ml-1">Max Users</label>
                  <input name="maxUsers" type="number" defaultValue={plans[showEditPlan].maxUsers} className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted uppercase ml-1">Credit Price</label>
                <input name="creditPrice" type="number" defaultValue={plans[showEditPlan].creditPrice} className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none" />
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Included Features</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'webhooks', label: 'Webhooks' },
                    { id: 'multiple_apps', label: 'Multiple Apps' },
                    { id: 'resellers', label: 'Reseller Portal' },
                    { id: 'variables', label: 'Cloud Variables' },
                    { id: 'export_users', label: 'Export Data' }
                  ].map(f => {
                    const isChecked = plans[showEditPlan].features?.includes(f.id);
                    return (
                      <label key={f.id} className="flex items-center gap-3 cursor-pointer group select-none p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all">
                        <div className="relative w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center transition-all group-hover:border-white/40">
                          <input
                            type="checkbox"
                            name="feature"
                            value={f.id}
                            defaultChecked={isChecked}
                            className="peer sr-only"
                          />
                          <div className="absolute inset-0 bg-white rounded-[4px] transform scale-0 peer-checked:scale-75 transition-transform"></div>
                        </div>
                        <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 p-2">
                <input type="checkbox" name="onSale" id="os-edit" defaultChecked={plans[showEditPlan].onSale} />
                <label htmlFor="os-edit" className="text-sm text-muted">Show in public shop</label>
              </div>
              <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl uppercase tracking-widest text-xs">Save Changes</button>
            </form>
          </Modal>
        )
      }

      
      {
        confirmModal.show && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
              <div className="p-10 text-center">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 ${confirmModal.danger ? 'bg-danger/10 text-danger' : 'bg-white/10 text-white'}`}>
                  <AlertTriangle size={40} />
                </div>
                <h3 className="text-2xl font-black mb-3 tracking-tight">{confirmModal.title}</h3>
                <p className="text-muted/60 text-sm mb-10 leading-relaxed px-4">{confirmModal.message}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => confirmModal.onConfirm()}
                    className={`w-full font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs ${confirmModal.danger ? 'bg-danger text-white' : 'bg-white text-black'}`}
                  >
                    Confirm Action
                  </button>
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl transition-all text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      
      <div className="fixed bottom-8 right-8 z-[500] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl animate-fade-in-up ${t.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-success/10 border-success/20 text-success'}`}>
            <div className={`w-2 h-2 rounded-full ${t.type === 'error' ? 'bg-danger' : 'bg-success'}`} />
            <span className="text-sm font-bold tracking-tight">{t.msg}</span>
          </div>
        ))}
      </div>
    </div >
  );
};

export default Admin;
