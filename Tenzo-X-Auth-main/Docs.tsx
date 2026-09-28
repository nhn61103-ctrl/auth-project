import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { SDK } from '../types';
import {
    ArrowLeft, Shield, Key, Share2,
    Code, ChevronRight, Copy, Check, Github,
    Lock, Users, Box, Database, Zap, BookOpen,
    Terminal, ChevronDown, ChevronUp, Globe
} from 'lucide-react';

const BASE_URL = 'https://tenxoxauthentication.qzz.io';
const SDK_PUBLIC_KEY_SNIPPET = `-----BEGIN PUBLIC KEY-----
<your-response-signing-public-key>
-----END PUBLIC KEY-----`;

const CATEGORIES = [
    { id: 'quickstart', name: 'Quick Start', icon: <Zap size={16} />, badge: 'Start Here' },
    { id: 'auth', name: 'Authentication', icon: <Lock size={16} /> },
    { id: 'users', name: 'User Management', icon: <Users size={16} /> },
    { id: 'licenses', name: 'License Management', icon: <Key size={16} /> },
    { id: 'apps', name: 'App Management', icon: <Box size={16} /> },
    { id: 'vars', name: 'Remote Variables', icon: <Database size={16} /> },
];

interface Param { name: string; type: string; required?: boolean; desc: string; example?: string; }
interface Endpoint {
    category: string; title: string; method: string; path: string;
    desc: string; beginner?: string; params: Param[];
    example?: string; responses: { code: string; desc: string; success: boolean }[];
}

const endpoints: Endpoint[] = [
    {
        category: 'auth', title: 'Login', method: 'POST', path: '/login',
        desc: 'Authenticate a user into your application. Handles version checks, HWID locking, bans, and expiry automatically.',
        beginner: 'This is the most important endpoint. Call it when your user clicks "Login" in your app.',
        params: [
            { name: 'username', type: 'string', required: true, desc: 'The user\'s username', example: '"john_doe"' },
            { name: 'password', type: 'string', required: true, desc: 'The user\'s password', example: '"MyPass123"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret key (from Dashboard)', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'The name of your application', example: '"MyApp"' },
            { name: 'appVersion', type: 'string', required: true, desc: 'Your current app version', example: '"1.0.0"' },
            { name: 'hwid', type: 'string', required: false, desc: 'Hardware ID to lock user to a device', example: '"HWID-XYZ"' },
        ],
        example: `fetch('${BASE_URL}/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john_doe',
    password: 'MyPass123',
    secret: 'txa-abc123',
    appName: 'MyApp',
    appVersion: '1.0.0'
  })
})`,
        responses: [
            { code: 'LOGIN_SUCCESS', desc: 'User authenticated. Returns subscription info and expiry.', success: true },
            { code: 'INVALID_CREDENTIALS', desc: 'Wrong username or password.', success: false },
            { code: 'USER_BANNED', desc: 'This user has been banned from your application.', success: false },
            { code: 'HWID_MISMATCH', desc: 'User is logging in from a different device.', success: false },
            { code: 'LICENSE_EXPIRED', desc: 'The user\'s subscription has expired.', success: false },
            { code: 'APP_PAUSED', desc: 'Your application is temporarily paused.', success: false },
        ]
    },
    {
        category: 'auth', title: 'Register', method: 'POST', path: '/register',
        desc: 'Create a new user account using a license key. The license key is consumed on success.',
        beginner: 'Call this when a new user wants to create an account. They need a license key you generated from the Dashboard.',
        params: [
            { name: 'username', type: 'string', required: true, desc: 'Desired username', example: '"new_user"' },
            { name: 'password', type: 'string', required: true, desc: 'Desired password', example: '"SecurePass"' },
            { name: 'licenseKey', type: 'string', required: true, desc: 'A valid unused license key', example: '"TXA-ABCD-EFGH"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret key', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'appVersion', type: 'string', required: true, desc: 'App version', example: '"1.0.0"' },
        ],
        example: `fetch('${BASE_URL}/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'new_user',
    password: 'SecurePass',
    licenseKey: 'TXA-ABCD-EFGH',
    secret: 'txa-abc123',
    appName: 'MyApp',
    appVersion: '1.0.0'
  })
})`,
        responses: [
            { code: 'REGISTER_SUCCESS', desc: 'Account created. License key marked as used.', success: true },
            { code: 'USERNAME_TAKEN', desc: 'That username is already registered.', success: false },
            { code: 'INVALID_LICENSE', desc: 'The license key does not exist.', success: false },
            { code: 'LICENSE_USED', desc: 'The license key has already been redeemed.', success: false },
        ]
    },
    {
        category: 'auth', title: 'Version Check', method: 'POST', path: '/versioncheck',
        desc: 'Verify that the client is running an approved version before doing anything else. Use this to force updates.',
        beginner: 'Run this check first in your app startup before showing a login screen. It prevents old versions from connecting.',
        params: [
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret key', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'appVersion', type: 'string', required: true, desc: 'Version to verify', example: '"1.0.0"' },
        ],
        example: `fetch('${BASE_URL}/versioncheck', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    secret: 'txa-abc123',
    appName: 'MyApp',
    appVersion: '1.0.0'
  })
})`,
        responses: [
            { code: 'VERSION_OK', desc: 'Version matches. Safe to proceed.', success: true },
            { code: 'VERSION_MISMATCH', desc: 'Client is outdated. Block access and prompt update.', success: false },
            { code: 'APP_NOT_FOUND', desc: 'Application not found with given credentials.', success: false },
        ]
    },
    {
        category: 'users', title: 'Create User', method: 'POST', path: '/create_user',
        desc: 'Create a user account directly without needing a license key. Useful for manual provisioning.',
        params: [
            { name: 'ownerEmailKey', type: 'string', required: true, desc: 'Your account email (dots replaced with commas)', example: '"user,example,com"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret key', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'appVersion', type: 'string', required: true, desc: 'App version', example: '"1.0.0"' },
            { name: 'username', type: 'string', required: true, desc: 'New username', example: '"admin_user"' },
            { name: 'password', type: 'string', required: true, desc: 'New password', example: '"AdminPass"' },
            { name: 'expiry', type: 'string', required: false, desc: 'Expiry date or "lifetime"', example: '"lifetime"' },
            { name: 'hwid', type: 'string', required: false, desc: 'Optional HWID to bind', example: '""' },
        ],
        responses: [
            { code: 'USER_CREATED', desc: 'Account created successfully.', success: true },
            { code: 'USERNAME_TAKEN', desc: 'Username already in use.', success: false },
            { code: 'Unauthorized', desc: 'Your ownerEmailKey/secret is invalid.', success: false },
        ]
    },
    {
        category: 'users', title: 'Delete User', method: 'POST', path: '/delete_user',
        desc: 'Permanently delete a user account and free up their bound license.',
        params: [
            { name: 'ownerEmailKey', type: 'string', required: true, desc: 'Your account email key', example: '"user,example,com"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'username', type: 'string', required: true, desc: 'User to delete', example: '"john_doe"' },
        ],
        responses: [
            { code: 'USER_DELETED', desc: 'User removed successfully.', success: true },
            { code: 'Unauthorized', desc: 'Invalid ownership credentials.', success: false },
        ]
    },
    {
        category: 'users', title: 'Reset HWID', method: 'POST', path: '/reset_hwid',
        desc: 'Clear the Hardware ID binding for a user, allowing them to log in from a new device.',
        params: [
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'username', type: 'string', required: true, desc: 'Target username', example: '"john_doe"' },
        ],
        responses: [
            { code: 'HWID_RESET', desc: 'HWID cleared. User can log in from any device.', success: true },
            { code: 'USER_NOT_FOUND', desc: 'Username does not exist.', success: false },
        ]
    },
    {
        category: 'licenses', title: 'Create License', method: 'POST', path: '/create_license',
        desc: 'Generate a new license key programmatically. Use this for automated license delivery.',
        params: [
            { name: 'ownerEmailKey', type: 'string', required: true, desc: 'Your account email key', example: '"user,example,com"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'licenseKey', type: 'string', required: true, desc: 'The license key string', example: '"TXA-XXXX-YYYY"' },
            { name: 'rank', type: 'string', required: false, desc: 'Access level/rank', example: '"premium"' },
            { name: 'expiry', type: 'string', required: false, desc: 'Expiry or "lifetime"', example: '"2025-12-31"' },
            { name: 'note', type: 'string', required: false, desc: 'Internal note for this key', example: '"Sold via Discord"' },
        ],
        responses: [
            { code: 'LICENSE_CREATED', desc: 'License key active and ready for use.', success: true },
            { code: 'LICENSE_EXISTS', desc: 'A key with this name already exists.', success: false },
            { code: 'Unauthorized', desc: 'Invalid ownership credentials.', success: false },
        ]
    },
    {
        category: 'licenses', title: 'Delete License', method: 'POST', path: '/delete_license',
        desc: 'Remove a license key. If the key was claimed by a user, that account remains intact.',
        params: [
            { name: 'ownerEmailKey', type: 'string', required: true, desc: 'Your account email key', example: '"user,example,com"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'licenseKey', type: 'string', required: true, desc: 'License to delete', example: '"TXA-XXXX-YYYY"' },
        ],
        responses: [
            { code: 'LICENSE_DELETED', desc: 'License removed from the system.', success: true },
            { code: 'Unauthorized', desc: 'Invalid ownership credentials.', success: false },
        ]
    },
    {
        category: 'apps', title: 'Create Application', method: 'POST', path: '/create_app',
        desc: 'Programmatically initialize a new application container under your account.',
        params: [
            { name: 'ownerEmailKey', type: 'string', required: true, desc: 'Your account email key', example: '"user,example,com"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your master secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'New application name', example: '"MyNewApp"' },
        ],
        responses: [
            { code: 'APP_CREATED', desc: 'Application provisioned and ready.', success: true },
            { code: 'APP_EXISTS', desc: 'An app with this name already exists.', success: false },
            { code: 'Unauthorized', desc: 'Invalid ownership credentials.', success: false },
        ]
    },
    {
        category: 'apps', title: 'Delete Application', method: 'POST', path: '/delete_app',
        desc: 'Permanently delete an entire application including all its users, licenses, and variables.',
        params: [
            { name: 'ownerEmailKey', type: 'string', required: true, desc: 'Your account email key', example: '"user,example,com"' },
            { name: 'secret', type: 'string', required: true, desc: 'Your master secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application to delete', example: '"MyApp"' },
        ],
        responses: [
            { code: 'APP_DELETED', desc: 'Application and all data permanently deleted.', success: true },
            { code: 'Unauthorized', desc: 'Invalid ownership credentials.', success: false },
        ]
    },
    {
        category: 'vars', title: 'Get Variable', method: 'POST', path: '/getvariable',
        desc: 'Fetch a single remote variable value from your app. Great for pushing config updates without patching.',
        beginner: 'Store things like "download_link", "discord_invite", or "announcement" in your dashboard and fetch them here. Update anytime without recompiling your app.',
        params: [
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
            { name: 'varName', type: 'string', required: true, desc: 'Variable name to fetch', example: '"download_link"' },
            { name: 'appVersion', type: 'string', required: true, desc: 'App version', example: '"1.0.0"' },
        ],
        responses: [
            { code: 'VARIABLE_FOUND', desc: 'Returns the variable value.', success: true },
            { code: 'VARIABLE_NOT_FOUND', desc: 'Variable does not exist.', success: false },
        ]
    },
    {
        category: 'vars', title: 'Get All Variables', method: 'POST', path: '/getvariables',
        desc: 'Fetch all remote variables for your application in a single request.',
        params: [
            { name: 'secret', type: 'string', required: true, desc: 'Your app secret', example: '"txa-abc123..."' },
            { name: 'appName', type: 'string', required: true, desc: 'Application name', example: '"MyApp"' },
        ],
        responses: [
            { code: 'VARIABLES_FOUND', desc: 'Returns a map of all variable names to values.', success: true },
            { code: 'NO_VARIABLES', desc: 'No variables have been defined yet.', success: false },
        ]
    },
];

const EndpointCard: React.FC<{ ep: Endpoint; baseUrl: string }> = ({ ep, baseUrl }) => {
    const [copied, setCopied] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const copy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="group border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02] hover:border-white/20 transition-all duration-300">
            
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.03] transition-colors"
            >
                <span className="shrink-0 px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {ep.method}
                </span>
                <code className="text-sm font-mono text-white/70 bg-white/5 px-3 py-1 rounded-lg">{ep.path}</code>
                <span className="font-bold text-white text-sm">{ep.title}</span>
                <span className="ml-auto text-muted shrink-0">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
            </button>

            
            {open && (
                <div className="border-t border-white/[0.06] p-6 space-y-6 animate-fade-in">
                    <p className="text-muted text-sm leading-relaxed">{ep.desc}</p>

                    {ep.beginner && (
                        <div className="flex gap-3 p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                            <BookOpen size={16} className="text-blue-400 mt-0.5 shrink-0" />
                            <p className="text-blue-300/80 text-sm leading-relaxed">{ep.beginner}</p>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted/60 mb-3 flex items-center gap-2">
                                <Terminal size={12} /> Request Body Parameters
                            </h4>
                            <div className="space-y-2">
                                {ep.params.map((p, i) => (
                                    <div key={i} className="flex items-start justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <code className="text-xs font-mono font-bold text-white">{p.name}</code>
                                                {p.required && <span className="text-[9px] font-black text-danger/70 uppercase tracking-widest">required</span>}
                                            </div>
                                            <p className="text-[11px] text-muted/70 leading-relaxed">{p.desc}</p>
                                        </div>
                                        <span className="text-[10px] bg-white/5 text-muted px-2 py-0.5 rounded-md font-mono shrink-0">{p.type}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted/60 mb-3 flex items-center gap-2">
                                <Code size={12} /> Response Codes
                            </h4>
                            <div className="space-y-2">
                                {ep.responses.map((r, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${r.success ? 'bg-emerald-400' : 'bg-red-400/70'}`} />
                                        <div>
                                            <code className="text-xs font-mono text-white font-bold">{r.code}</code>
                                            <p className="text-[11px] text-muted/70 mt-0.5">{r.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    
                    {ep.example && (
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted/60 mb-3 flex items-center gap-2">
                                <Globe size={12} /> Example Request (JavaScript)
                            </h4>
                            <div className="relative group/code">
                                <pre className="bg-[#0d0d0f] border border-white/[0.06] rounded-xl p-4 text-xs font-mono text-white/80 overflow-x-auto leading-relaxed">
                                    <code>{ep.example}</code>
                                </pre>
                                <button
                                    onClick={() => copy(ep.example!, `ex-${ep.path}`)}
                                    className="absolute top-3 right-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover/code:opacity-100"
                                >
                                    {copied === `ex-${ep.path}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-muted" />}
                                </button>
                            </div>
                        </div>
                    )}

                    
                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                        <Globe size={14} className="text-muted shrink-0" />
                        <code className="text-xs font-mono text-white/60 flex-1 truncate">{baseUrl}{ep.path}</code>
                        <button onClick={() => copy(`${baseUrl}${ep.path}`, `url-${ep.path}`)} className="text-muted hover:text-white transition-colors shrink-0">
                            {copied === `url-${ep.path}` ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const QuickStart: React.FC = () => (
    <div className="space-y-8">
        <div>
            <h1 className="text-4xl font-black tracking-tight mb-3">Quick Start</h1>
            <p className="text-muted text-base leading-relaxed max-w-2xl">
                Get up and running with TXA in 3 steps. No complex setup — just a secret key and a few HTTP requests.
            </p>
        </div>

        <div className="space-y-4">
            {[
                {
                    step: '01', title: 'Get Your Secret Key',
                    desc: 'Go to your Dashboard → select your application → copy the Secret Key shown at the top. It looks like txa-xxxxxxxx...',
                    code: `
const SECRET = "txa-abc123..."
const APP    = "MyApp"
const VERSION = "1.0.0"`
                },
                {
                    step: '02', title: 'Check Version First',
                    desc: 'Always call this when your app starts. If it returns VERSION_MISMATCH, block the user and tell them to update.',
                    code: `const res = await fetch('${BASE_URL}/versioncheck', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: SECRET, appName: APP, appVersion: VERSION })
})
const data = await res.json()
if (data.message !== 'VERSION_OK') { alert('Please update!'); return; }`
                },
                {
                    step: '03', title: 'Login Your User',
                    desc: 'Call /login with their credentials. If successful, you\'ll get their subscription info back.',
                    code: `const login = await fetch('${BASE_URL}/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john_doe', password: 'pass123',
    secret: SECRET, appName: APP, appVersion: VERSION
  })
})
const { success, message, data } = await login.json()
if (success) {
  console.log('Logged in! Sub:', data.subscription)
}`
                }
            ].map((item, i) => (
                <div key={i} className="flex gap-5 p-6 bg-white/[0.02] border border-white/[0.07] rounded-2xl hover:border-white/15 transition-all">
                    <div className="text-4xl font-black text-white/10 font-mono shrink-0 select-none">{item.step}</div>
                    <div className="flex-1 min-w-0 space-y-3">
                        <h3 className="font-black text-white">{item.title}</h3>
                        <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
                        <pre className="bg-[#0d0d0f] border border-white/[0.06] rounded-xl p-4 text-xs font-mono text-white/70 overflow-x-auto leading-relaxed">
                            <code>{item.code}</code>
                        </pre>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex gap-4">
            <Shield className="text-blue-300 shrink-0 mt-0.5" size={18} />
            <div>
                <p className="font-bold text-blue-200 text-sm mb-2">SDK security note</p>
                <p className="text-muted text-sm leading-relaxed mb-3">
                    Hardened SDK builds send <code className="bg-white/5 px-1 rounded text-white/80">clientNonce</code> and <code className="bg-white/5 px-1 rounded text-white/80">clientTimestamp</code>.
                    SDK auth endpoints return <code className="bg-white/5 px-1 rounded text-white/80">requestNonce</code>, <code className="bg-white/5 px-1 rounded text-white/80">serverTimestamp</code>, and <code className="bg-white/5 px-1 rounded text-white/80">signature</code>.
                </p>
                <p className="text-muted text-sm leading-relaxed mb-3">
                    Embed this verification key in your client SDK:
                </p>
                <pre className="bg-[#0d0d0f] border border-white/[0.06] rounded-xl p-4 text-xs font-mono text-white/70 overflow-x-auto leading-relaxed">
                    <code>{SDK_PUBLIC_KEY_SNIPPET}</code>
                </pre>
            </div>
        </div>

        <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
            <div>
                <p className="font-bold text-emerald-300 text-sm mb-1">All set!</p>
                <p className="text-muted text-sm leading-relaxed">
                    All API requests return JSON with <code className="bg-white/5 px-1 rounded text-white/80">success</code> (boolean) and <code className="bg-white/5 px-1 rounded text-white/80">message</code> (status code string). Check the specific endpoint docs for all possible message values.
                </p>
            </div>
        </div>
    </div>
);

const Docs: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState('quickstart');
    const [sdks, setSdks] = useState<SDK[]>([]);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        return onValue(ref(db, 'system/config/sdks'), (snap) => {
            setSdks(Object.values(snap.val() || {}));
        });
    }, []);

    const activeEndpoints = endpoints.filter(ep => ep.category === activeCategory);
    const activeCatInfo = CATEGORIES.find(c => c.id === activeCategory);

    return (
        <div className="min-h-screen bg-background text-white flex flex-col selection:bg-white/10">
            
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]"
                style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

            
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-background/80">
                <div className="max-w-[88rem] mx-auto px-6 h-16 flex items-center justify-between gap-4">
                    <Link to="/" className="flex items-center gap-2.5 group shrink-0">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:rotate-12 transition-all shadow-lg shadow-white/10">
                            <Shield className="text-black" size={18} />
                        </div>
                        <span className="font-black tracking-tight text-lg">TXA <span className="text-muted font-light">Docs</span></span>
                    </Link>

                    
                    <button onClick={() => setMobileSidebarOpen(o => !o)} className="lg:hidden text-muted hover:text-white transition-colors p-2 bg-white/5 rounded-lg">
                        <BookOpen size={18} />
                    </button>

                    <div className="hidden lg:flex items-center gap-4">
                        <span className="text-xs font-mono text-muted/60 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06]">{BASE_URL}</span>
                        <Link to="/" className="text-sm font-bold text-muted hover:text-white transition-colors flex items-center gap-1.5">
                            <ArrowLeft size={14} /> Dashboard
                        </Link>
                    </div>
                </div>
            </nav>

            
            <div className="flex-1 flex max-w-[88rem] mx-auto w-full pt-16 relative z-10">

                
                <aside className={`
                    ${mobileSidebarOpen ? 'flex' : 'hidden'} lg:flex
                    fixed lg:sticky top-16 left-0 lg:left-auto
                    z-40 lg:z-auto
                    w-64 h-[calc(100vh-4rem)]
                    flex-col border-r border-white/[0.06]
                    bg-background lg:bg-transparent
                    p-5 overflow-y-auto custom-scrollbar shrink-0
                `}>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted/40 mb-4 ml-1 px-1">Navigation</p>
                    <nav className="space-y-0.5 flex-1">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setMobileSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm text-left
                                    ${activeCategory === cat.id
                                        ? 'bg-white text-black font-bold shadow-lg shadow-white/5'
                                        : 'text-muted hover:text-white hover:bg-white/[0.05] font-medium'
                                    }`}
                            >
                                <span className={activeCategory === cat.id ? 'text-black' : 'text-muted/50'}>{cat.icon}</span>
                                <span className="flex-1">{cat.name}</span>
                                {cat.badge && (
                                    <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                        {cat.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>

                    {sdks.length > 0 && (
                        <div className="mt-6 pt-5 border-t border-white/[0.06] space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted/40 mb-3 ml-1 px-1">SDKs</p>
                            {sdks.map(sdk => (
                                <a key={sdk.name} href={sdk.link} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-muted hover:text-white hover:bg-white/5 transition-all text-sm group">
                                    <span className="flex items-center gap-2.5 font-medium"><Github size={14} />{sdk.name}</span>
                                    <Share2 size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                                </a>
                            ))}
                        </div>
                    )}
                </aside>

                
                {mobileSidebarOpen && (
                    <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
                )}

                
                <main className="flex-1 p-6 lg:p-10 min-w-0">
                    {activeCategory === 'quickstart' ? (
                        <QuickStart />
                    ) : (
                        <div className="space-y-6">
                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-muted/50">{activeCatInfo?.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted/50">REST API</span>
                                </div>
                                <h1 className="text-3xl font-black tracking-tight mb-2">{activeCatInfo?.name}</h1>
                                <p className="text-muted text-sm">
                                    All endpoints accept <code className="bg-white/5 px-1.5 py-0.5 rounded-md text-white/70">Content-Type: application/json</code> and return JSON.
                                    Click an endpoint to expand it.
                                </p>
                            </div>
                            <div className="space-y-3">
                                {activeEndpoints.map((ep, i) => (
                                    <EndpointCard key={i} ep={ep} baseUrl={BASE_URL} />
                                ))}
                            </div>
                        </div>
                    )}

                    
                    <div className="mt-16 pt-8 border-t border-white/[0.05] text-center">
                        <p className="text-muted/40 text-xs">TXA Authentication · All endpoints use HTTPS</p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Docs;
