
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, GithubAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { Mail, Lock, Loader2, ArrowLeft, Github, CheckCircle2 } from 'lucide-react';
import { ref, get, set } from 'firebase/database';
import { auth, db } from '../services/firebase';
import { encrypt, decrypt } from '../services/encryption';
import Turnstile from '../components/Turnstile';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { discordId } = useParams<{ discordId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const linkDiscord = async (email: string, dId: string) => {
    try {
      const emailKey = email.replace(/\./g, ',');
      const snap = await get(ref(db, `customers/${emailKey}`));
      if (snap.exists()) {
        const current = decrypt(snap.val());
        if (current && typeof current === 'object') {
          await set(ref(db, `customers/${emailKey}`), encrypt({
            ...current,
            discordId: dId
          }));
        }
      }
    } catch (err) {
      console.error("Failed to link Discord:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (discordId && user.email) {
          await linkDiscord(user.email, discordId);
          setShowSuccess(true);
          return;
        }
        navigate('/dashboard');
      }
    });
    return unsubscribe;
  }, [navigate, discordId]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = data.get('email') as string;
    const password = data.get('password') as string;

    setLoading(true);
    setError('');

    if (!turnstileToken) {
      setError("Please complete the security check.");
      setLoading(false);
      return;
    }

    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      if (discordId && res.user.email) {
        await linkDiscord(res.user.email, discordId);
        setShowSuccess(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      let msg = "Failed to login.";
      if (err.code === "auth/invalid-credential") msg = "Invalid email or password.";
      setError(msg);
    }
    setLoading(false);
  };

  const socialLogin = async (provider: any) => {
    if (!turnstileToken) {
      setError("Please complete the security check first.");
      return;
    }

    try {
      const res = await signInWithPopup(auth, provider);

      if (res.user && res.user.email) {
        const emailKey = res.user.email.replace(/\./g, ',');
        const snap = await get(ref(db, `customers/${emailKey}`));

        if (!snap.exists()) {
          const secret = 'TXA-' + Math.random().toString(36).substring(2, 15).toUpperCase();
          const customer = {
            email: res.user.email,
            secret,
            plan: 'Free Plan',
            credits: 0,
            discordId: discordId || '',
            createdAt: new Date().toISOString()
          };
          await set(ref(db, `customers/${emailKey}`), encrypt(customer));
        } else if (discordId && res.user.email) {
          await linkDiscord(res.user.email, discordId);
        }
      }

      if (discordId) {
        setShowSuccess(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError("Social sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-x-hidden overflow-y-auto bg-background selection:bg-white/20">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white opacity-[0.02] blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500 opacity-[0.03] blur-[100px] rounded-full animate-pulse-slow delay-1000"></div>
      </div>

      <div className="w-full max-w-md px-4 py-12 relative z-20 animate-fade-in-up my-auto">
        <Link to="/" className="inline-flex items-center text-sm text-muted hover:text-white mb-8 transition-colors">
          <ArrowLeft className="mr-2" size={16} /> Back to Home
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted text-sm">Login to continue managing your apps.</p>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6 text-center animate-fade-in">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted block ml-1">Email</label>
              <div className="relative group">
                <input name="email" type="email" required placeholder="name@example.com" className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3.5 text-white placeholder-muted/50 focus:outline-none focus:border-white/50 focus:bg-surface transition-all duration-300 pl-11" />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-white transition-colors" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted block ml-1">Password</label>
              <div className="relative group">
                <input name="password" type="password" required placeholder="••••••••" className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3.5 text-white placeholder-muted/50 focus:outline-none focus:border-white/50 focus:bg-surface transition-all duration-300 pl-11" />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-white transition-colors" size={18} />
              </div>
              <div className="flex justify-end text-xs mt-4">
                <Link to="/forgot-password" size={10} className="text-muted hover:text-white transition-colors">Forgot Password?</Link>
              </div>
            </div>

            <Turnstile onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

            <button disabled={loading || !turnstileToken} type="submit" className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] flex justify-center items-center">
              {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-muted">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => socialLogin(new GoogleAuthProvider())} className="bg-surfaceHighlight border border-border text-white font-medium py-3 rounded-xl hover:bg-surfaceHighlight/80 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button onClick={() => socialLogin(new GithubAuthProvider())} className="bg-surfaceHighlight border border-border text-white font-medium py-3 rounded-xl hover:bg-surfaceHighlight/80 transition-all flex items-center justify-center gap-2">
              <Github size={20} /> GitHub
            </button>
          </div>

          <p className="text-center mt-8 text-sm text-muted">
            Don't have an account? <Link to="/signup" className="text-white font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm glass rounded-2xl p-8 text-center animate-slide-up relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-success" size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Linking Successful!</h2>
            <p className="text-muted mb-8 leading-relaxed">Your Discord account has been successfully linked to your TXA profile.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98]"
            >
              Enter Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
