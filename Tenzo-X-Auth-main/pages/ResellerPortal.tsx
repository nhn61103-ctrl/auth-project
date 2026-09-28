import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, onValue, set, update, get, remove } from 'firebase/database';
import {
    Users, Box, Key, LogOut, Plus, Search, CheckCircle2, AlertCircle, Loader2,
    Trash2, ShieldAlert, Share2, Palette, Database, Settings, RefreshCcw, Edit, X,
    ChevronDown, Copy, Check, AlertTriangle, ShieldCheck, Settings2, Monitor
} from 'lucide-react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { encrypt, decrypt } from '../services/encryption';
import { Reseller, User, License, AppMetadata, WebhookSettings } from '../types';

const CustomCheckbox: React.FC<{ 
    checked: boolean, 
    onChange: (val: boolean) => void, 
    label?: string,
    disabled?: boolean 
}> = ({ checked, onChange, label, disabled = false }) => (
    <label className={`flex items-center gap-3 cursor-pointer group select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div 
            onClick={() => !disabled && onChange(!checked)}
            className={`relative w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
                checked 
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

const CustomSelect: React.FC<{ 
    value: string, 
    onChange: (val: string) => void, 
    options: { label: string, value: string }[],
    disabled?: boolean,
    placeholder?: string
}> = ({ value, onChange, options, disabled = false, placeholder = "Select..." }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button 
                type="button" 
                onClick={() => !disabled && setOpen(!open)} 
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-surfaceHighlight border border-border rounded-xl text-sm hover:border-white/20 transition-all text-left cursor-pointer ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
                <span className="truncate text-white/90">{selected?.label || placeholder}</span>
                <ChevronDown size={16} className={`transition-transform text-muted ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && !disabled && (
                <div className="absolute top-full left-0 w-full mt-2 bg-surfaceHighlight border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in max-h-60 overflow-y-auto">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left p-3.5 text-sm transition-colors duration-150 hover:bg-white/5 hover:text-white ${
                                value === opt.value 
                                    ? 'text-white bg-white/10 font-semibold' 
                                    : 'text-muted'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const Modal: React.FC<{ title: string, onClose: () => void, children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-surface border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

const ResellerPortal: React.FC = () => {
    const { hash } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reseller, setReseller] = useState<Reseller | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [firebaseAuthAttempted, setFirebaseAuthAttempted] = useState(false);

    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');

    const [activeTab, setActiveTab] = useState<'users' | 'licenses' | 'webhooks'>('users');
    const [apps, setApps] = useState<{ name: string, secret: string, version: string }[]>([]);
    const [currentApp, setCurrentApp] = useState<{ name: string, secret: string } | null>(null);
    const [users, setUsers] = useState<Record<string, User>>({});
    const [licenses, setLicenses] = useState<Record<string, License>>({});
    const [webhookSettings, setWebhookSettings] = useState<WebhookSettings>({
        url: '', notifyLogin: true, notifyAddUser: true, notifyDeleteUser: true,
        notifyAddLicense: true, notifyExpireLicense: true, notifyPauseApp: false
    });

    const [showEditUser, setShowEditUser] = useState<string | null>(null);
    const [showEditLicense, setShowEditLicense] = useState<string | null>(null);
    
    const [extendUnit, setExtendUnit] = useState('days');
    const [extendDuration, setExtendDuration] = useState('1');

    const [toasts, setToasts] = useState<{ id: number, msg: string, type: 'success' | 'error' }[]>([]);
    const addToast = (msg: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        duration: '1',
        unit: 'days',
        oneTime: false
    });

    const [licenseForm, setLicenseForm] = useState({
        prefix: 'TXA',
        displayName: '',
        duration: '1',
        unit: 'days',
        amount: '1'
    });

    const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
    const [showGeneratedKeys, setShowGeneratedKeys] = useState(false);

    const unitOptions = [
        { label: 'Minutes', value: 'minutes' },
        { label: 'Hours', value: 'hours' },
        { label: 'Days', value: 'days' },
        { label: 'Months', value: 'months' },
        { label: 'Lifetime', value: 'lifetime' }
    ];

    useEffect(() => {
        if (!hash) { setLoading(false); return; }

        const savedCredentials = localStorage.getItem('reseller_credentials');
        if (savedCredentials) {
            try {
                const { username, password, hash: savedHash } = JSON.parse(savedCredentials);
                if (savedHash === hash) {
                    setLoginUser(username);
                    setLoginPass(password);
                    setRememberMe(true);
                }
            } catch (e) {
                console.error('Failed to parse saved credentials:', e);
            }
        }

        let hasLoaded = false;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user && !hasLoaded) {
                hasLoaded = true;
                setFirebaseAuthAttempted(true);
                try {
                    const snap = await get(ref(db, `resellers/${hash}`));
                    if (snap.exists()) {
                        const data = decrypt(snap.val());
                        if (data.hash === hash) {
                            setReseller(data);

                            if (savedCredentials) {
                                try {
                                    const { username, password, hash: savedHash } = JSON.parse(savedCredentials);
                                    if (savedHash === hash && data.username === username && data.passwordHash === password) {
                                        setIsAuthenticated(true);
                                        const parsedApps = data.allowedApps.map((str: string) => {
                                            const [secret, name] = str.split('::');
                                            return { secret, name, version: '1.0' };
                                        });
                                        setApps(parsedApps);
                                        if (parsedApps.length > 0) setCurrentApp(parsedApps[0]);
                                        addToast('Auto-login successful');
                                    }
                                } catch (e) {
                                    console.error('Auto-login failed:', e);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch reseller', error);
                }
                setLoading(false);
            } else if (!user && !hasLoaded) {
                try {
                    await signInWithEmailAndPassword(auth, 'reseller@gmail.com', 'resellser');
                    console.log('Firebase authenticated silently');
                } catch (error: any) {
                    console.error('Silent Firebase auth failed:', error.message);
                    setFirebaseAuthAttempted(true);
                    setLoading(false);
                }
            }
        });

        return () => unsubscribeAuth();
    }, [hash]);

    useEffect(() => {
        if (!isAuthenticated || !reseller || !currentApp || !firebaseAuthAttempted) return;

        onValue(ref(db, `applications/${currentApp.secret}/${currentApp.name}/users`), (snap) => {
            const u: Record<string, User> = {};
            const raw = snap.val() || {};
            Object.keys(raw).forEach(k => {
                const user = decrypt(raw[k]);
                if (user.createdBy === hash) {
                    u[k] = user;
                }
            });
            setUsers(u);
        });

        onValue(ref(db, `applications/${currentApp.secret}/${currentApp.name}/licenses`), (snap) => {
            const l: Record<string, License> = {};
            const raw = snap.val() || {};
            Object.keys(raw).forEach(k => {
                const license = decrypt(raw[k]);
                if (license.createdBy === hash) {
                    l[k] = license;
                }
            });
            setLicenses(l);
        });

        onValue(ref(db, `resellerWebhooks/${hash}`), (snap) => {
            if (snap.exists()) setWebhookSettings(decrypt(snap.val()));
        });

    }, [isAuthenticated, reseller, currentApp, hash, firebaseAuthAttempted]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reseller) return addToast('Invalid Portal Link', 'error');
        if (reseller.username === loginUser && reseller.passwordHash === loginPass) {
            setIsAuthenticated(true);
            const parsedApps = reseller.allowedApps.map(str => {
                const [secret, name] = str.split('::');
                return { secret, name, version: '1.0' };
            });
            setApps(parsedApps);
            if (parsedApps.length > 0) setCurrentApp(parsedApps[0]);
            
            if (rememberMe) {
                localStorage.setItem('reseller_credentials', JSON.stringify({
                    username: loginUser,
                    password: loginPass,
                    hash: hash
                }));
            } else {
                localStorage.removeItem('reseller_credentials');
            }
            
            addToast('Welcome back');
        } else {
            addToast('Invalid Credentials', 'error');
        }
    };

    const handleCreateLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reseller || !currentApp || !firebaseAuthAttempted) return;

        const { prefix, displayName, duration, unit, amount } = licenseForm;
        const prefixUpper = prefix.toUpperCase();
        const durationNum = parseInt(duration) || 1;
        const amountNum = Math.max(1, parseInt(amount) || 1);

        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const newKeys: string[] = [];
        const expDate = new Date();
        if (unit === 'minutes') expDate.setMinutes(expDate.getMinutes() + durationNum);
        if (unit === 'hours') expDate.setHours(expDate.getHours() + durationNum);
        if (unit === 'days') expDate.setDate(expDate.getDate() + durationNum);
        if (unit === 'months') expDate.setMonth(expDate.getMonth() + durationNum);
        const exp = unit === 'lifetime' ? 'lifetime' : expDate.toISOString();

        setLoading(true);
        try {
            for (let a = 0; a < amountNum; a++) {
                let key = prefixUpper;
                for (let i = 0; i < 4; i++) {
                    key += "-";
                    for (let j = 0; j < 5; j++) key += chars.charAt(Math.floor(Math.random() * chars.length));
                }

                await set(ref(db, `applications/${currentApp.secret}/${currentApp.name}/licenses/${key}`), encrypt({
                    expiry: exp,
                    displayName: displayName || '',
                    used: false,
                    created: new Date().toISOString(),
                    createdBy: hash
                }));
                newKeys.push(key);
            }

            const updateReseller = { ...reseller, licensesCreated: (reseller.licensesCreated || 0) + amountNum };
            await set(ref(db, `resellers/${reseller.hash}`), encrypt(updateReseller));
            setReseller(updateReseller);

            setGeneratedKeys(newKeys);
            setShowGeneratedKeys(true);

            addToast(`Generated ${amountNum} licenses`);
            
            setLicenseForm({
                prefix: 'TXA',
                displayName: '',
                duration: '1',
                unit: 'days',
                amount: '1'
            });
        } catch (error) {
            addToast('Failed to generate licenses', 'error');
        }
        setLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reseller || !currentApp || !firebaseAuthAttempted) return;
        if (reseller.userLimit !== -1 && reseller.usersCreated >= reseller.userLimit) {
            return addToast('User limit reached', 'error');
        }

        const { username, password, duration, unit, oneTime } = userForm;
        const durationNum = parseInt(duration) || 1;

        let exp = 'lifetime';
        if (unit !== 'lifetime') {
            const expDate = new Date();
            if (unit === 'minutes') expDate.setMinutes(expDate.getMinutes() + durationNum);
            if (unit === 'hours') expDate.setHours(expDate.getHours() + durationNum);
            if (unit === 'days') expDate.setDate(expDate.getDate() + durationNum);
            if (unit === 'months') expDate.setMonth(expDate.getMonth() + durationNum);
            exp = expDate.toISOString();
        }

        const u: User = {
            password, 
            expiry: exp, 
            isBanned: false, 
            hwidLock: true, 
            sid: '', 
            oneTime: oneTime,
            created: new Date().toISOString(),
            createdBy: hash
        };

        if (users[username]) return addToast('User already exists', 'error');

        await set(ref(db, `applications/${currentApp.secret}/${currentApp.name}/users/${username}`), encrypt(u));

        const updateReseller = { ...reseller, usersCreated: (reseller.usersCreated || 0) + 1 };
        await set(ref(db, `resellers/${reseller.hash}`), encrypt(updateReseller));
        setReseller(updateReseller);

        addToast('User Created');
        
        setUserForm({
            username: '',
            password: '',
            duration: '1',
            unit: 'days',
            oneTime: false
        });
    };

    const calculateExpiry = (val: number, unit: string) => {
        if (unit === 'lifetime') return 'lifetime';
        const d = new Date();
        if (unit === 'minutes') d.setMinutes(d.getMinutes() + val);
        else if (unit === 'hours') d.setHours(d.getHours() + val);
        else if (unit === 'days') d.setDate(d.getDate() + val);
        else if (unit === 'months') d.setMonth(d.getMonth() + val);
        return d.toISOString();
    };

    const handleBanUser = async (username: string) => {
        if (!currentApp || !users[username] || !firebaseAuthAttempted) return;
        
        try {
            const user = users[username];
            const newBannedStatus = !user.isBanned;
            
            await set(
                ref(db, `applications/${currentApp.secret}/${currentApp.name}/users/${username}`),
                encrypt({ ...user, isBanned: newBannedStatus })
            );
            
            addToast(newBannedStatus ? 'User banned' : 'User unbanned');
        } catch (error) {
            console.error('Failed to update user ban status:', error);
            addToast('Failed to update user', 'error');
        }
    };

    const handleExtendUserExpiry = async () => {
        if (!showEditUser || !currentApp || !firebaseAuthAttempted) return;
        
        try {
            const user = users[showEditUser];
            if (!user) return;

            let newExpiry = user.expiry;
            const duration = parseInt(extendDuration) || 1;
            const unit = extendUnit;

            if (unit === 'lifetime') {
                newExpiry = 'lifetime';
            } else {
                const expDate = new Date(user.expiry === 'lifetime' ? new Date() : new Date(user.expiry));
                if (unit === 'minutes') expDate.setMinutes(expDate.getMinutes() + duration);
                if (unit === 'hours') expDate.setHours(expDate.getHours() + duration);
                if (unit === 'days') expDate.setDate(expDate.getDate() + duration);
                if (unit === 'months') expDate.setMonth(expDate.getMonth() + duration);
                newExpiry = expDate.toISOString();
            }

            await set(
                ref(db, `applications/${currentApp.secret}/${currentApp.name}/users/${showEditUser}`),
                encrypt({ ...user, expiry: newExpiry })
            );

            addToast('Expiry extended successfully');
            setExtendDuration('1');
            setExtendUnit('days');
        } catch (error) {
            console.error('Failed to extend expiry:', error);
            addToast('Failed to extend expiry', 'error');
        }
    };

    const handleExtendLicenseExpiry = async () => {
        if (!showEditLicense || !currentApp || !firebaseAuthAttempted) return;
        
        try {
            const license = licenses[showEditLicense];
            if (!license) return;

            let newExpiry = license.expiry;
            const duration = parseInt(extendDuration) || 1;
            const unit = extendUnit;

            if (unit === 'lifetime') {
                newExpiry = 'lifetime';
            } else {
                const expDate = new Date(license.expiry === 'lifetime' ? new Date() : new Date(license.expiry));
                if (unit === 'minutes') expDate.setMinutes(expDate.getMinutes() + duration);
                if (unit === 'hours') expDate.setHours(expDate.getHours() + duration);
                if (unit === 'days') expDate.setDate(expDate.getDate() + duration);
                if (unit === 'months') expDate.setMonth(expDate.getMonth() + duration);
                newExpiry = expDate.toISOString();
            }

            await set(
                ref(db, `applications/${currentApp.secret}/${currentApp.name}/licenses/${showEditLicense}`),
                encrypt({ ...license, expiry: newExpiry })
            );

            if (license.associatedUser && users[license.associatedUser]) {
                const user = users[license.associatedUser];
                await set(
                    ref(db, `applications/${currentApp.secret}/${currentApp.name}/users/${license.associatedUser}`),
                    encrypt({ ...user, expiry: newExpiry })
                );
            }

            addToast('License & User Expiry Updated');
            setExtendDuration('1');
            setExtendUnit('days');
        } catch (error) {
            console.error('Failed to extend license expiry:', error);
            addToast('Failed to update license', 'error');
        }
    };

    const handleUpdateHwidLock = async (username: string, hwidLock: boolean) => {
        if (!currentApp || !users[username] || !firebaseAuthAttempted) return;
        
        try {
            const user = users[username];
            await set(
                ref(db, `applications/${currentApp.secret}/${currentApp.name}/users/${username}`),
                encrypt({ ...user, hwidLock })
            );
            addToast('HWID Lock status updated.');
        } catch (error) {
            console.error('Failed to update HWID lock:', error);
            addToast('Failed to update HWID lock', 'error');
        }
    };

    const handleResetHwid = async (username: string) => {
        if (!currentApp || !users[username] || !firebaseAuthAttempted) return;
        
        try {
            const user = users[username];
            await set(
                ref(db, `applications/${currentApp.secret}/${currentApp.name}/users/${username}`),
                encrypt({ 
                    ...user, 
                    hwidLock: false,
                    sid: "" 
                })
            );
            addToast('HWID Reset');
        } catch (error) {
            console.error('Failed to reset HWID:', error);
            addToast('Failed to reset HWID', 'error');
        }
    };

    const handleResetUserHwidFromLicense = async (associatedUser: string) => {
        if (!currentApp || !users[associatedUser] || !firebaseAuthAttempted) return;
        
        try {
            const user = users[associatedUser];
            await set(
                ref(db, `applications/${currentApp.secret}/${currentApp.name}/users/${associatedUser}`),
                encrypt({ 
                    ...user, 
                    sid: "" 
                })
            );
            addToast('User HWID Reset');
        } catch (error) {
            console.error('Failed to reset user HWID:', error);
            addToast('Failed to reset user HWID', 'error');
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem('reseller_credentials');
            setIsAuthenticated(false);
            setReseller(null);
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-background text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="text-muted">Loading portal...</span>
            </div>
        </div>
    );

    if (!firebaseAuthAttempted) return (
        <div className="h-screen flex items-center justify-center bg-background text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin w-8 h-8" />
                <span className="text-muted">Loading...</span>
            </div>
        </div>
    );

    if (!reseller) return (
        <div className="h-screen flex flex-col items-center justify-center bg-background text-white p-4 text-center">
            <ShieldAlert size={64} className="text-danger mb-6" />
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Invalid Portal</h1>
            <p className="text-muted">This reseller link is invalid or has been revoked.</p>
        </div>
    );

    if (!isAuthenticated) return (
        <div className="h-screen flex items-center justify-center bg-background text-white p-4">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.05]" style={{ 
                backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                backgroundSize: '50px 50px' 
            }}></div>
            
            <div className="w-full max-w-md space-y-8 animate-fade-in relative z-10">
                <div className="text-center">
                    <div className="inline-flex p-4 rounded-3xl bg-surfaceHighlight border border-border mb-6">
                        <Users size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-tight mb-2">{reseller.panelName || 'Reseller Portal'}</h1>
                    <p className="text-muted text-sm">Access your management dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="bg-surface border border-border p-8 rounded-2xl space-y-4 shadow-2xl">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted uppercase ml-2">Username</label>
                        <input 
                            value={loginUser} 
                            onChange={e => setLoginUser(e.target.value)} 
                            className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none focus:border-white/30 text-white placeholder:text-muted/50" 
                            placeholder="Enter username" 
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted uppercase ml-2">Password</label>
                        <input 
                            type="password" 
                            value={loginPass} 
                            onChange={e => setLoginPass(e.target.value)} 
                            className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl focus:outline-none focus:border-white/30 text-white placeholder:text-muted/50" 
                            placeholder="Enter password" 
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                        <CustomCheckbox 
                            checked={rememberMe}
                            onChange={setRememberMe}
                            label="Remember me"
                        />
                        <button 
                            type="submit"
                            className="px-8 py-3 bg-white text-black font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors"
                        >
                            Access Portal
                        </button>
                    </div>
                </form>
            </div>
            <div className="fixed bottom-8 right-8 z-[500] flex flex-col gap-3">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-md pointer-events-auto ${
                        t.type === 'error' 
                            ? 'border-danger/20 text-danger bg-surface' 
                            : 'border-success/20 text-success bg-surface'
                    }`}>
                        {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-semibold text-white/90">{t.msg}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background text-white font-sans selection:bg-white/20">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.05]" style={{ 
                backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
                backgroundSize: '50px 50px' 
            }}></div>

            <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
                {toasts.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md min-w-[300px] animate-fade-in pointer-events-auto ${
                        t.type === 'success' 
                            ? 'border-success/20 text-success bg-surface' 
                            : 'border-danger/20 text-danger bg-surface'
                    }`}>
                        {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span className="text-sm font-semibold text-white/90">{t.msg}</span>
                    </div>
                ))}
            </div>

            <aside className="w-64 border-r border-border bg-surface flex flex-col p-6 relative z-10">
                <div className="mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black font-black">
                        {reseller.panelName?.charAt(0) || 'R'}
                    </div>
                    <div className="overflow-hidden">
                        <div className="font-bold leading-none truncate text-white">{reseller.panelName || 'RESELLER'}</div>
                        <div className="text-[10px] text-muted font-mono truncate">{reseller.username}</div>
                    </div>
                </div>

                <div className="mb-8 space-y-2">
                    <label className="text-[10px] font-bold text-muted uppercase ml-2">Selected App</label>
                    <CustomSelect
                        value={currentApp?.name || ''}
                        onChange={val => {
                            const app = apps.find(a => a.name === val);
                            if (app) setCurrentApp(app);
                        }}
                        options={apps.map(a => ({ label: a.name, value: a.name }))}
                        placeholder="Select an app"
                    />
                </div>

                <nav className="space-y-1 flex-1">
                    <button 
                        onClick={() => setActiveTab('users')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'users' 
                                ? 'bg-white/10 text-white' 
                                : 'text-muted hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Users size={18} /> Users
                    </button>
                    <button 
                        onClick={() => setActiveTab('licenses')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'licenses' 
                                ? 'bg-white/10 text-white' 
                                : 'text-muted hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Key size={18} /> Licenses
                    </button>
                    <button 
                        onClick={() => setActiveTab('webhooks')} 
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'webhooks' 
                                ? 'bg-white/10 text-white' 
                                : 'text-muted hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Share2 size={18} /> Webhooks
                    </button>
                </nav>

                <button 
                    onClick={handleLogout} 
                    className="flex items-center gap-3 p-3 text-danger hover:bg-danger/10 text-sm font-bold mt-auto rounded-xl transition-colors"
                >
                    <LogOut size={18} /> Logout
                </button>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto bg-background relative z-10">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-black uppercase tracking-tight text-white">
                        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Manager
                    </h1>
                    <div className="flex gap-4">
                        <div className="px-4 py-2.5 bg-surfaceHighlight/50 border border-border rounded-xl">
                            <span className="text-[10px] text-muted uppercase font-bold block">Reseller Limit</span>
                            <span className="font-mono font-bold text-sm text-white">
                                {reseller.usersCreated} / {reseller.userLimit === -1 ? '∞' : reseller.userLimit}
                            </span>
                        </div>
                    </div>
                </header>

                {activeTab === 'users' && (
                    <div className="space-y-6">
                        <div className="bg-surface border border-border p-6 rounded-2xl">
                            <h3 className="font-bold mb-6 flex items-center gap-2 text-white">
                                <Plus size={18} /> Quick Create User
                            </h3>
                            <form onSubmit={handleCreateUser} className="flex gap-4 items-end flex-wrap">
                                <div className="flex-1 min-w-[150px] space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Username</label>
                                    <input 
                                        value={userForm.username}
                                        onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                                        className="w-full bg-surfaceHighlight border border-border p-3 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white placeholder:text-muted/50" 
                                        required 
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div className="flex-1 min-w-[150px] space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Password</label>
                                    <input 
                                        value={userForm.password}
                                        onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                                        type="password"
                                        className="w-full bg-surfaceHighlight border border-border p-3 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white placeholder:text-muted/50" 
                                        required 
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Duration</label>
                                    <input 
                                        type="number" 
                                        value={userForm.unit === 'lifetime' ? '' : userForm.duration}
                                        onChange={e => setUserForm(prev => ({ ...prev, duration: e.target.value }))}
                                        min="1"
                                        disabled={userForm.unit === 'lifetime'}
                                        className={`w-full bg-surfaceHighlight border border-border p-3 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white ${
                                            userForm.unit === 'lifetime' ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                        placeholder={userForm.unit === 'lifetime' ? 'Lifetime' : 'Duration'}
                                    />
                                </div>
                                <div className="w-32 space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Unit</label>
                                    <CustomSelect
                                        value={userForm.unit}
                                        onChange={(val) => setUserForm(prev => ({ ...prev, unit: val }))}
                                        options={unitOptions}
                                        placeholder="Select unit"
                                    />
                                </div>
                                <div className="pb-3 px-2">
                                    <CustomCheckbox
                                        checked={userForm.oneTime}
                                        onChange={(val) => setUserForm(prev => ({ ...prev, oneTime: val }))}
                                        label="One-Time"
                                    />
                                </div>
                                <button className="px-8 py-3 bg-white text-black font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors">
                                    Create
                                </button>
                            </form>
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
                                {(Object.entries(users) as [string, User][]).map(([name, user]) => (
                                    <div key={name} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors">
                                        <div className="col-span-4 font-bold truncate text-white">{name}</div>
                                        <div className="col-span-2">
                                            {user.isBanned ? (
                                                <span className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded font-bold uppercase">Banned</span>
                                            ) : (
                                                <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded font-bold uppercase">Active</span>
                                            )}
                                        </div>
                                        <div className="col-span-4 text-xs text-muted font-mono">
                                            {user.expiry === 'lifetime' ? 'Lifetime' : new Date(user.expiry).toLocaleDateString()}
                                        </div>
                                        <div className="col-span-2 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => setShowEditUser(name)} 
                                                className="p-2 text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Settings2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleBanUser(name)} 
                                                className="p-2 text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <ShieldAlert size={16} />
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (confirm('Delete user?')) {
                                                        await remove(ref(db, `applications/${currentApp?.secret}/${currentApp?.name}/users/${name}`));
                                                        addToast('User deleted');
                                                    }
                                                }} 
                                                className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(users).length === 0 && (
                                    <div className="p-8 text-center text-muted">
                                        No users found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'licenses' && (
                    <div className="space-y-6">
                        <div className="bg-surface border border-border p-6 rounded-2xl">
                            <h3 className="font-bold mb-6 flex items-center gap-2 text-white">
                                <Plus size={18} /> Generate License
                            </h3>
                            <form onSubmit={handleCreateLicense} className="flex gap-4 items-end flex-wrap">
                                <div className="w-32 space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Prefix</label>
                                    <input 
                                        value={licenseForm.prefix}
                                        onChange={e => setLicenseForm(prev => ({ ...prev, prefix: e.target.value }))}
                                        placeholder="TXA" 
                                        className="w-full bg-surfaceHighlight border border-border p-3 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white placeholder:text-muted/50" 
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Display Name</label>
                                    <input 
                                        value={licenseForm.displayName}
                                        onChange={e => setLicenseForm(prev => ({ ...prev, displayName: e.target.value }))}
                                        className="w-full bg-surfaceHighlight border border-border p-3 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white placeholder:text-muted/50" 
                                        placeholder="Optional display name"
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Duration</label>
                                    <input 
                                        type="number" 
                                        value={licenseForm.unit === 'lifetime' ? '' : licenseForm.duration}
                                        onChange={e => setLicenseForm(prev => ({ ...prev, duration: e.target.value }))}
                                        min="1"
                                        disabled={licenseForm.unit === 'lifetime'}
                                        className={`w-full bg-surfaceHighlight border border-border p-3 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white ${
                                            licenseForm.unit === 'lifetime' ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                        placeholder={licenseForm.unit === 'lifetime' ? 'Lifetime' : 'Duration'}
                                    />
                                </div>
                                <div className="w-32 space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Unit</label>
                                    <CustomSelect
                                        value={licenseForm.unit}
                                        onChange={(val) => setLicenseForm(prev => ({ ...prev, unit: val }))}
                                        options={unitOptions}
                                        placeholder="Select unit"
                                    />
                                </div>
                                <div className="w-24 space-y-1">
                                    <label className="text-[10px] font-bold text-muted uppercase ml-1">Amount</label>
                                    <input 
                                        type="number" 
                                        value={licenseForm.amount}
                                        onChange={e => setLicenseForm(prev => ({ ...prev, amount: e.target.value }))}
                                        min="1"
                                        max="100"
                                        className="w-full bg-surfaceHighlight border border-border p-3 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white"
                                    />
                                </div>
                                <button className="px-8 py-3 bg-white text-black font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors">
                                    Generate
                                </button>
                            </form>
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
                                {(Object.entries(licenses) as [string, License][]).map(([key, lic]) => (
                                    <div key={key} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors">
                                        <div className="col-span-3 font-mono text-[10px] text-blue-400 font-bold truncate select-all">{key}</div>
                                        <div className="col-span-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                                lic.used ? 'bg-gray-800 text-muted' : 'bg-success/10 text-success'
                                            }`}>
                                                {lic.used ? 'Used' : 'Unused'}
                                            </span>
                                        </div>
                                        <div className="col-span-3 text-xs text-muted truncate">{lic.displayName || '-'}</div>
                                        <div className="col-span-2 text-xs font-bold text-white/70 truncate">{lic.associatedUser || '-'}</div>
                                        <div className="col-span-2 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => setShowEditLicense(key)} 
                                                className="p-2 text-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <Settings2 size={16} />
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (confirm('Delete license?')) {
                                                        await remove(ref(db, `applications/${currentApp?.secret}/${currentApp?.name}/licenses/${key}`));
                                                        addToast('License deleted');
                                                    }
                                                }} 
                                                className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(licenses).length === 0 && (
                                    <div className="p-8 text-center text-muted">
                                        No licenses found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'webhooks' && (
                    <div className="max-w-xl space-y-6">
                        <div className="bg-surface border border-border p-8 rounded-2xl">
                            <h3 className="font-bold mb-6 text-white">Reseller Webhook Events</h3>
                            <div className="space-y-4">
                                <input
                                    value={webhookSettings.url}
                                    onChange={e => setWebhookSettings(p => ({ ...p, url: e.target.value }))}
                                    placeholder="Discord Webhook URL"
                                    className="w-full bg-surfaceHighlight border border-border p-4 rounded-xl text-sm focus:outline-none focus:border-white/30 font-mono text-white placeholder:text-muted/50"
                                />
                                <div className="space-y-3 bg-surfaceHighlight/30 p-4 rounded-xl border border-border">
                                    <CustomCheckbox 
                                        checked={webhookSettings.notifyAddUser} 
                                        onChange={v => setWebhookSettings(p => ({ ...p, notifyAddUser: v }))} 
                                        label="Notify on User Create" 
                                    />
                                    <CustomCheckbox 
                                        checked={webhookSettings.notifyDeleteUser} 
                                        onChange={v => setWebhookSettings(p => ({ ...p, notifyDeleteUser: v }))} 
                                        label="Notify on User Delete" 
                                    />
                                    <CustomCheckbox 
                                        checked={webhookSettings.notifyAddLicense} 
                                        onChange={v => setWebhookSettings(p => ({ ...p, notifyAddLicense: v }))} 
                                        label="Notify on License Create" 
                                    />
                                    <CustomCheckbox 
                                        checked={webhookSettings.notifyExpireLicense} 
                                        onChange={v => setWebhookSettings(p => ({ ...p, notifyExpireLicense: v }))} 
                                        label="Notify on License Expire" 
                                    />
                                    <CustomCheckbox 
                                        checked={webhookSettings.notifyLogin} 
                                        onChange={v => setWebhookSettings(p => ({ ...p, notifyLogin: v }))} 
                                        label="Notify on User Login" 
                                    />
                                    <CustomCheckbox 
                                        checked={webhookSettings.notifyPauseApp} 
                                        onChange={v => setWebhookSettings(p => ({ ...p, notifyPauseApp: v }))} 
                                        label="Notify on App Pause" 
                                    />
                                </div>
                                <button
                                    onClick={async () => {
                                        await set(ref(db, `resellerWebhooks/${hash}`), encrypt(webhookSettings));
                                        addToast('Webhook Settings Saved');
                                    }}
                                    className="w-full py-4 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-gray-200 transition-colors mt-4"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {showEditUser && users[showEditUser] && currentApp && (
                <Modal title={`Edit ${showEditUser}`} onClose={() => {
                    setShowEditUser(null);
                    setExtendUnit('days');
                    setExtendDuration('1');
                }}>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-muted">Extend Expiry</label>
                            <div className="flex gap-2">
                                {extendUnit !== 'lifetime' && (
                                    <input 
                                        id="extend-val"
                                        type="number" 
                                        value={extendDuration}
                                        onChange={(e) => setExtendDuration(e.target.value)}
                                        className="w-24 bg-surfaceHighlight border border-border rounded-xl px-4 py-2.5 focus:outline-none text-white"
                                        placeholder="1"
                                    />
                                )}
                                <CustomSelect 
                                    value={extendUnit} 
                                    options={unitOptions} 
                                    onChange={setExtendUnit} 
                                />
                                <button 
                                    onClick={handleExtendUserExpiry}
                                    className="px-4 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Extend
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <CustomCheckbox 
                                checked={users[showEditUser]?.hwidLock} 
                                onChange={(v) => handleUpdateHwidLock(showEditUser, v)} 
                                label="HWID Lock" 
                            />
                            
                            <div className="flex justify-between items-center p-3 border border-border rounded-xl bg-surfaceHighlight/50">
                                <span className="text-sm text-muted font-mono truncate">
                                    {users[showEditUser]?.sid || 'No HWID'}
                                </span>
                                <button 
                                    onClick={() => handleResetHwid(showEditUser)}
                                    className="text-xs bg-surfaceHighlight px-2 py-1 rounded text-white border border-border hover:bg-white/20 transition-colors"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => handleBanUser(showEditUser)}
                            className={`w-full border py-3 rounded-xl text-xs font-bold uppercase transition-colors duration-200 ${
                                users[showEditUser].isBanned 
                                    ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-400' 
                                    : 'border-danger/30 bg-danger/10 hover:bg-danger/20 text-danger'
                            }`}
                        >
                            {users[showEditUser].isBanned ? 'Unban User' : 'Ban User'}
                        </button>
                    </div>
                </Modal>
            )}

            {showEditLicense && licenses[showEditLicense] && currentApp && (
                <Modal title={`Edit License ${showEditLicense}`} onClose={() => {
                    setShowEditLicense(null);
                    setExtendUnit('days');
                    setExtendDuration('1');
                }}>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-muted">Update Expiry</label>
                            <div className="flex gap-2">
                                {extendUnit !== 'lifetime' && (
                                    <input 
                                        id="lic-extend-val"
                                        type="number" 
                                        value={extendDuration}
                                        onChange={(e) => setExtendDuration(e.target.value)}
                                        className="w-24 bg-surfaceHighlight border border-border rounded-xl px-4 py-2.5 focus:outline-none text-white"
                                        placeholder="1"
                                    />
                                )}
                                <CustomSelect 
                                    value={extendUnit} 
                                    options={unitOptions} 
                                    onChange={setExtendUnit} 
                                />
                                <button 
                                    onClick={handleExtendLicenseExpiry}
                                    className="px-4 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Update
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 border border-border rounded-xl bg-surfaceHighlight/50">
                                <span className="text-xs text-muted flex flex-col">
                                    <span className="font-bold flex items-center gap-1 uppercase tracking-tighter">
                                        <Monitor size={12} /> HWID Status
                                    </span>
                                    <span>
                                        {licenses[showEditLicense]?.associatedUser 
                                            ? `Linked to ${licenses[showEditLicense].associatedUser}` 
                                            : 'Unlinked'
                                        }
                                    </span>
                                </span>
                                <button 
                                    onClick={() => {
                                        if (licenses[showEditLicense]?.associatedUser) {
                                            handleResetUserHwidFromLicense(licenses[showEditLicense].associatedUser!);
                                        } else {
                                            addToast('No user linked to this license', 'error');
                                        }
                                    }} 
                                    className="text-[10px] bg-surfaceHighlight px-3 py-2 rounded text-white border border-border hover:bg-white/20 font-bold uppercase tracking-widest transition-colors"
                                >
                                    Reset User HWID
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {showGeneratedKeys && (
                <Modal title="Generated Licenses" onClose={() => setShowGeneratedKeys(false)}>
                    <div className="space-y-6">
                        <div className="bg-black/20 border border-border rounded-xl p-4 max-h-60 overflow-y-auto custom-scrollbar font-mono text-xs space-y-2">
                            {generatedKeys.map(k => (
                                <div key={k} className="flex justify-between items-center group">
                                    <span className="text-blue-400">{k}</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(k); addToast('Key copied'); }} 
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-white"
                                    >
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
                                className="flex items-center justify-center gap-2 bg-surfaceHighlight border border-border p-3 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors text-white"
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
                                className="flex items-center justify-center gap-2 bg-surfaceHighlight border border-border p-3 rounded-xl text-xs font-bold hover:bg-white/5 transition-colors text-white"
                            >
                                <Database size={16} /> Download JSON
                            </button>
                        </div>
                        <button 
                            onClick={() => setShowGeneratedKeys(false)} 
                            className="w-full bg-white text-black font-bold py-3 rounded-xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ResellerPortal;
