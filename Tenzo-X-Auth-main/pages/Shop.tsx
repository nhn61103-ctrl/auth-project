
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, set, get } from 'firebase/database';
import { Crown, Coins, MessageSquare, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { encrypt, decrypt } from '../services/encryption';
import { Customer, SystemPlan } from '../types';

const Shop: React.FC = () => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [plans, setPlans] = useState<Record<string, SystemPlan>>({});
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser?.email) return;
    const emailKey = auth.currentUser.email.replace(/\./g, ',');

    onValue(ref(db, `customers/${emailKey}`), (snap) => {
      setCustomer(decrypt(snap.val()));
    });

    onValue(ref(db, `system/plans`), (snap) => {
      const raw = snap.val() || {};
      const dec: Record<string, SystemPlan> = {};
      Object.keys(raw).forEach(k => {
        const p = decrypt(raw[k]);
        if (p.onSale) dec[k] = p;
      });
      setPlans(dec);
    });
  }, []);

  const buyPlan = async (name: string, plan: SystemPlan) => {
    if (!customer || !auth.currentUser?.email) return;
    if (customer.credits < plan.creditPrice) {
      alert(`Insufficient credits. You need ${plan.creditPrice} but have ${customer.credits}.`);
      return;
    }

    if (!confirm(`Confirm purchase of ${name} for ${plan.creditPrice} credits?`)) return;

    setBuying(name);
    try {
      const emailKey = auth.currentUser.email.replace(/\./g, ',');
      const updatedCustomer = {
        ...customer,
        credits: customer.credits - plan.creditPrice,
        plan: name
      };
      await set(ref(db, `customers/${emailKey}`), encrypt(updatedCustomer));
      alert('Plan upgraded successfully!');
    } catch (err) {
      alert('Purchase failed.');
    }
    setBuying(null);
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-white/20">
      <nav className="fixed top-0 left-0 right-0 z-50 py-6 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-white text-black font-black px-2 py-0.5 rounded text-sm tracking-tighter">TXA</div>
            <span className="font-black text-sm uppercase tracking-widest">Shop</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-black">{customer?.credits || 0}</span>
            </div>
            <Link to="/dashboard" className="text-xs font-black uppercase tracking-widest text-muted hover:text-white">Dashboard</Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto animate-slide-up">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">Upgrade Your Infrastructure.</h1>
          <p className="text-muted text-lg">Use your credits to unlock premium capacities and features.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {(Object.entries(plans) as [string, SystemPlan][])
            .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
            .map(([name, plan]) => (
              <div key={name} className="bg-surface border border-border p-8 rounded-[32px] hover:border-white/20 transition-all flex flex-col group relative overflow-hidden">
                {customer?.plan === name && (
                  <div className="absolute top-4 right-4 bg-success/20 text-success text-[10px] font-black uppercase px-2 py-1 rounded-full">Active</div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-black mb-1">{name}</h3>
                  <div className="text-3xl font-black flex items-center gap-2">
                    {plan.creditPrice} <span className="text-[10px] text-muted font-black uppercase tracking-widest">Credits</span>
                  </div>
                </div>
                <ul className="space-y-4 mb-8 text-sm text-muted flex-grow">
                  <li className="flex items-center gap-2 font-bold"><Check size={16} className="text-white" /> Max Apps: {plan.maxApps}</li>
                  <li className="flex items-center gap-2 font-bold"><Check size={16} className="text-white" /> Max Users: {plan.maxUsers}</li>
                  {plan.features?.map(feature => (
                    <li key={feature} className="flex items-center gap-2 font-bold">
                      <Check size={16} className="text-white" />
                      {feature === 'webhooks' && 'Webhooks Support'}
                      {feature === 'multi_app' && 'Multiple Applications'}
                      {feature === 'reseller' && 'Reseller Portal Access'}
                      {feature === 'cloud_vars' && 'Cloud Variables'}
                      {feature === 'user_data' && 'User Data Export'}
                      {!['webhooks', 'multi_app', 'reseller', 'cloud_vars', 'user_data'].includes(feature) && feature}
                    </li>
                  ))}
                  {(!plan.features || plan.features.length === 0) && <li className="text-muted/50 italic text-xs">No extra perks</li>}
                </ul>
                <button
                  onClick={() => buyPlan(name, plan)}
                  disabled={customer?.plan === name || buying === name}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${customer?.plan === name ? 'bg-white/5 text-muted' : 'bg-white text-black hover:scale-[1.02] active:scale-95'}`}
                >
                  {buying === name ? <Loader2 className="animate-spin mx-auto" /> : customer?.plan === name ? 'Current Plan' : 'Purchase with Credits'}
                </button>
              </div>
            ))}
          {Object.keys(plans).length === 0 && (
            <div className="col-span-full py-20 text-center text-muted font-bold opacity-50">No plans currently on sale.</div>
          )}
        </div>

        <div className="mt-20 bg-surface border border-border p-10 rounded-[40px] text-center max-w-3xl mx-auto shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <h2 className="text-2xl font-black mb-4 uppercase tracking-tight relative z-10">Free Credits Await!</h2>
          <p className="text-muted mb-8 text-sm leading-relaxed font-bold relative z-10">Please join our Discord server to earn free credits through daily rewards and community events.</p>
          <a href="https://dsc.gg/tenzoxcode" target="_blank" className="inline-flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-white/5 relative z-10">
            <MessageSquare size={16} /> Join Community & Claim Credits
          </a>
        </div>
      </main>
    </div>
  );
};

export default Shop;
