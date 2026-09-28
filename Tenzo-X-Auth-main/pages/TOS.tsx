
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TOS: React.FC = () => {
  return (
    <div className="min-h-screen py-32 px-6">
      <div className="max-w-3xl mx-auto space-y-12 animate-slide-up">
        <Link to="/" className="inline-flex items-center text-sm text-muted hover:text-white transition-colors">
          <ArrowLeft className="mr-2" size={16} /> Back to Home
        </Link>
        
        <header>
          <h1 className="text-5xl font-black mb-4 uppercase tracking-tighter">Terms of Service</h1>
          <p className="text-muted font-bold">Last updated: December 2025</p>
        </header>

        <div className="bg-surface border border-border p-10 rounded-[40px] shadow-2xl space-y-8 text-muted leading-relaxed font-medium">
          <section>
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-widest text-sm">1. Acceptance of Terms</h2>
            <p>By using TXA (TenzoxAuthentication), you agree to these terms. Our software utilizes AES-256 encryption for data security. We do not claim "military-grade" encryption, but industry-standard cryptographic methods.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-widest text-sm">2. Use License</h2>
            <p>Permission is granted to use TXA for software licensing management. You may not reverse engineer our authentication protocols or attempt to exploit our database infrastructure.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-widest text-sm">3. Disclaimer</h2>
            <p>TXA Security is a new platform under active development. While we strive for 99.9% uptime, we are not responsible for any data loss during the early access phase.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-white mb-4 uppercase tracking-widest text-sm">4. Limitations</h2>
            <p>In no event shall TXA or its developers be liable for damages arising out of the use or inability to use the platform. Use at your own risk during this work-in-progress period.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TOS;
