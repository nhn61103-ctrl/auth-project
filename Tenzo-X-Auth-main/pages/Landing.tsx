
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Lock, Zap, Code, Cloud, BarChart3,
  ChevronRight, Menu, X, Github, ArrowRight,
  ShieldCheck, Activity, Cpu, Globe, Users,
  Terminal, Layers, MessageSquare, ExternalLink,
  ChevronDown, Monitor, CheckCircle2
} from 'lucide-react';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebase';

const Landing: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    const fetchUserCount = async () => {
      try {
        const statsRef = ref(db, 'system/stats');
        const snapshot = await get(statsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setTotalUsers(data.totalUsers || 0);
        }
      } catch (err) {
        console.error('Failed to fetch user count:', err);
      }
    };
    fetchUserCount();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20 font-sans overflow-x-hidden scroll-smooth">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[5%] w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px]" />
        <div className="grid-bg opacity-5" />
      </div>

      
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <nav className={`w-full max-w-5xl transition-all duration-500 rounded-2xl border ${isScrolled ? 'bg-black/60 backdrop-blur-xl border-white/10 py-3 px-6 shadow-2xl' : 'bg-transparent border-transparent py-5 px-8'}`}>
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-white text-black w-9 h-9 flex items-center justify-center rounded-xl font-black text-xs transition-transform group-hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]">TXA</div>
              <span className="font-bold text-[11px] uppercase tracking-[0.25em] text-white group-hover:text-white transition-colors">Tenzo X Authentication</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {['Shop', 'TOS', 'Docs'].map((item) => (
                <Link
                  key={item}
                  to={`/${item.toLowerCase()}`}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-all hover:translate-y-[-1px]"
                >
                  {item === 'TOS' ? 'Terms' : item === 'Docs' ? 'Documentation' : item}
                </Link>
              ))}
              <div className="h-4 w-px bg-white/10 mx-2" />
              <Link to="/login" className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors">Log In</Link>
              <Link to="/signup" className="bg-white text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                Sign Up
              </Link>
            </div>

            <button className="md:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 mt-4 bg-surface border border-white/10 p-8 flex flex-col gap-6 animate-fade-in rounded-3xl shadow-2xl">
              {['Shop', 'TOS', 'Docs'].map((item) => (
                <Link key={item} to={`/${item.toLowerCase()}`} className="text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white" onClick={() => setIsMenuOpen(false)}>
                  {item === 'TOS' ? 'Terms' : item === 'Docs' ? 'Documentation' : item}
                </Link>
              ))}
              <hr className="border-white/5" />
              <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-white" onClick={() => setIsMenuOpen(false)}>Log In</Link>
              <Link to="/signup" className="bg-white text-black text-center py-4 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
            </div>
          )}
        </nav>
      </div>

      <main className="relative z-10">
        
        <section className="min-h-screen flex flex-col justify-center pt-20 px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center gap-2 py-2 px-4 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-[0.2em] text-white/60 mb-8 mx-auto lg:mx-0">
                <span className="flex h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Authentication v2.0 is live
              </div>
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85] text-white uppercase">
                Auth made <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30">for everyone!</span>
              </h1>
              <p className="text-white/50 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-12 leading-relaxed font-medium">
                Secure, scalable, and game-changing authentication for your applications. Get started in minutes with our powerful APIs and SDKs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                <Link to="/signup" className="h-14 px-10 rounded-2xl bg-white text-black font-black flex items-center gap-3 hover:bg-white/90 active:scale-95 transition-all uppercase tracking-widest text-[10px] shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                  Start Building <ArrowRight size={14} />
                </Link>
                <a href="#features" className="h-14 px-10 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-[10px] flex items-center">
                  Learn More
                </a>
              </div>
            </div>

            
            <div className="relative animate-fade-in hidden lg:block" style={{ animationDelay: '0.2s', perspective: '2000px' }}>
              <div className="absolute inset-0 bg-white/10 blur-[100px] opacity-20 -z-10" />
              <div
                className="relative bg-gradient-to-br from-white/10 to-transparent p-[1px] rounded-[2rem] shadow-2xl transition-all duration-700 hover:rotate-0"
                style={{
                  transform: 'rotateY(-20deg) rotateX(10deg)',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="bg-[#0a0a0a] rounded-[2rem] overflow-hidden">
                  <img
                    src="/dashboard.png"
                    alt="Dashboard Preview"
                    className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
                
                <div className="absolute -bottom-6 -right-6 h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-black font-black shadow-2xl transform translate-z-10" style={{ transform: 'translateZ(50px)' }}>
                  <ShieldCheck size={28} />
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="text-white/20" />
          </div>
        </section>

        
        <section className="py-24 border-y border-white/5 bg-black/40">
          <div className="max-w-7xl mx-auto px-8">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 mb-12">Integrate into any programming language</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
              {['C++', 'C#', 'Python', 'Go', 'Rust', 'JS', 'Java'].map((lang) => (
                <div key={lang} className="text-xl font-black italic tracking-tighter">{lang}</div>
              ))}
            </div>
          </div>
        </section>

        
        <section className="py-32 px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Cloud Users', val: totalUsers > 0 ? totalUsers.toLocaleString() : '10,000+', icon: <Users size={12} /> },
              { label: 'Uptime', val: '99.9%', icon: <Activity size={12} />, color: 'text-success' },
              { label: 'Edge Ops', val: '50ms', icon: <Cpu size={12} /> },
              { label: 'Protection', val: 'AES-256', icon: <ShieldCheck size={12} /> },
            ].map((stat, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl hover:border-white/10 transition-all group overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 text-white/[0.02] transform -rotate-12 transition-transform group-hover:scale-110">
                  {React.cloneElement(stat.icon as React.ReactElement, { size: 100 })}
                </div>
                <div className={`flex items-center gap-2 mb-4 text-[9px] font-bold uppercase tracking-[0.2em] ${stat.color || 'text-white/40'}`}>
                  {stat.icon} {stat.label}
                </div>
                <div className="text-3xl font-black tracking-tight">{stat.val}</div>
              </div>
            ))}
          </div>
        </section>

        
        <section id="features" className="py-32 px-8 max-w-7xl mx-auto">
          <div className="text-center mb-32">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white mb-6">Features</div>
            <h2 className="text-5xl md:text-7xl font-black mb-8 uppercase tracking-tighter">Everything you need <br /> <span className="text-white/40">to succeed.</span></h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto font-medium leading-relaxed">A comprehensive suite of integrated tools for authentication, monetization, and user engagement.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Lock className="w-5 h-5" />, title: 'HWID Lock', desc: 'Secure hardware-bound licensing prevents account sharing and unauthorized access.' },
              { icon: <Monitor className="w-5 h-5" />, title: 'Admin Controls', desc: 'Powerful dashboard to manage users, licenses, and application settings in real-time.' },
              { icon: <MessageSquare className="w-5 h-5" />, title: 'Logs & Alerts', desc: 'Real-time notifications and audit logs for every system event and security breach.' },
              { icon: <Shield className="w-5 h-5" />, title: 'Server Validation', desc: 'All critical checks occur in our secure cloud environment, immune to client-side manipulation.' },
              { icon: <Terminal className="w-5 h-5" />, title: 'Native SDKs', desc: 'One-line integration for all major languages with our high-perfomance, lightweight libraries.' },
              { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Easy API', desc: 'Simple yet powerful REST API for custom integrations and automated workflows.' },
            ].map((f, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[2.5rem] hover:border-white/10 transition-all group relative overflow-hidden">
                <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center mb-10 text-white group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-500">
                  {f.icon}
                </div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{f.title}</h3>
                <p className="text-white/30 text-sm leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        
        <section className="py-24 px-8">
          <div className="max-w-5xl mx-auto bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-8 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-10 w-px h-full bg-white/5" />
            <div className="flex flex-col md:flex-row gap-12 relative z-10">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Shield className="text-white w-8 h-8" />
                </div>
              </div>
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white text-black px-3 py-1 rounded-md">Important</span>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">We are an authentication service</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">What TXA Provides</p>
                    <ul className="space-y-3 text-sm text-white/50 font-medium">
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5" /> License & Key Management</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5" /> HWID Device Binding</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5" /> Server-side Validation</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Your Responsibilities</p>
                    <ul className="space-y-3 text-sm text-white/50 font-medium">
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5" /> Integrate Server Checks</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5" /> Use Obfuscation if needed</li>
                      <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-1.5" /> Handle Client-side Anti-tamper</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        
        <section className="py-48 px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
            <h2 className="text-[20vw] font-black uppercase tracking-tighter">SECURE</h2>
          </div>
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-6xl md:text-8xl font-black mb-10 uppercase tracking-tighter leading-[0.85]">
              Modernize Your <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/20 italic">Authentication.</span>
            </h2>
            <p className="text-white/40 text-lg md:text-xl font-medium mb-16 max-w-lg mx-auto leading-relaxed">
              Ready to take your software security to the next level? Join the industry standard.
            </p>
            <Link to="/signup" className="inline-flex h-20 px-16 rounded-[2.5rem] bg-white text-black font-black items-center justify-center gap-4 hover:bg-white/90 hover:scale-105 transition-all uppercase tracking-[0.25em] text-[10px] shadow-2xl">
              Get Started Now <ChevronRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      
      <footer className="border-t border-white/5 bg-[#050505] py-32 px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-20 mb-32">
            <div className="col-span-2">
              <Link to="/" className="flex items-center gap-4 mb-10 group">
                <div className="bg-white text-black w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs">TXA</div>
                <span className="font-bold text-xs uppercase tracking-[0.4em] text-white">Tenzo X Authentication</span>
              </Link>
              <p className="text-white/40 text-base font-medium mb-12 max-w-md leading-relaxed">
                Empowering developers with world-class software protection and licensing architectures. Built for the modern threat landscape.
              </p>
              <div className="flex gap-4">
                <a href="https://github.com/tenzoxcode" target="_blank" className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                  <Github size={18} />
                </a>
                <a href="https://dsc.gg/tenzoxcode" target="_blank" className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                  <MessageSquare size={18} />
                </a>
                <a href="#" className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                  <Globe size={18} />
                </a>
              </div>
            </div>

            <div className="space-y-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Navigation</p>
              <div className="flex flex-col gap-6">
                {['Shop', 'TOS', 'Docs'].map((item) => (
                  <Link key={item} to={`/${item.toLowerCase()}`} className="text-sm font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">
                    {item === 'TOS' ? 'Terms of Service' : item === 'Docs' ? 'Documentation' : item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Company</p>
              <div className="flex flex-col gap-6">
                <a href="#" className="text-sm font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">About Us</a>
                <a href="#" className="text-sm font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">Status Page</a>
                <a href="https://dsc.gg/tenzoxcode" target="_blank" className="text-sm font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">Support</a>
              </div>
            </div>
          </div>

          <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">© 2025 TENZO X AUTHENTICATION. OPERATED BY TENZO.</p>
            <div className="flex items-center gap-10">
              <Link to="/tos" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/tos" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
