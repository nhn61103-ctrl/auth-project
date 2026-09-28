
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { auth } from '../services/firebase';

const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = data.get('email') as string;

    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError('Failed to send reset email.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        <Link to="/login" className="inline-flex items-center text-sm text-muted hover:text-white transition-colors">
          <ArrowLeft className="mr-2" size={16} /> Back to Login
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {sent ? (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Check your email</h2>
              <p className="text-muted text-sm mb-6">If an account exists, you will receive reset instructions shortly.</p>
              <Link to="/login" className="text-white hover:underline font-bold">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black mb-2 uppercase tracking-tight">Reset Password</h1>
                <p className="text-muted text-sm">Enter your email to receive recovery instructions.</p>
              </div>

              {error && <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg mb-6 text-center font-bold">{error}</div>}

              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-muted uppercase tracking-widest ml-1">Email</label>
                  <div className="relative group">
                    <input name="email" type="email" required placeholder="name@example.com" className="w-full bg-surfaceHighlight border border-border rounded-xl px-4 py-3.5 text-white placeholder-muted/50 focus:outline-none focus:border-white/50 focus:bg-surface transition-all pl-11 text-sm" />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-white transition-colors" size={18} />
                  </div>
                </div>

                <button disabled={loading} type="submit" className="w-full bg-white text-black font-black py-3.5 rounded-xl hover:bg-gray-200 transition-all flex justify-center items-center uppercase text-xs tracking-widest">
                  {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
