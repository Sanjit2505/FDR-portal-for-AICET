import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Lock, Mail, ArrowRight, AlertCircle,
  Building2, UserCheck, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('official@aicet.gov.in');
  const [password, setPassword] = useState('Official@Review2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/overview');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (role: 'admin' | 'official' | 'institution') => {
    setError(null);
    if (role === 'admin') {
      setEmail('admin@fdrguardian.internal');
      setPassword('Admin@Guardian2026');
    } else if (role === 'official') {
      setEmail('official@aicet.gov.in');
      setPassword('Official@Review2026');
    } else {
      setEmail('apex.finance@aiet.ac.in');
      setPassword('Apex@User2026');
    }
  };

  return (
    <div className="min-h-screen bg-[#060911] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-grid-pattern">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[420px] z-10 space-y-6"
      >
        {/* Emblem & Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-700 shadow-[0_0_24px_rgba(99,102,241,0.4)] border border-indigo-400/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              FDR Guardian
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
              Fixed Deposit Receipt Intelligence Platform
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#0b101e]/90 border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/[0.08] border border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Official Identifier / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@authority.gov.in"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white/[0.05] transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white/[0.05] transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Authenticate to Secure Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider block mb-2.5 text-center">
              Quick Role Demonstration Access
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoAccount('official')}
                className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-indigo-500/40 text-[11px] text-slate-200 flex flex-col items-center gap-1 transition-all group"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Official</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('admin')}
                className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-rose-500/40 text-[11px] text-slate-200 flex flex-col items-center gap-1 transition-all group"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('institution')}
                className="p-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-emerald-500/40 text-[11px] text-slate-200 flex flex-col items-center gap-1 transition-all group"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-medium">Institute</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>PBKDF2-SHA256 • Sequential Hash Ledger Active</span>
        </div>
      </motion.div>
    </div>
  );
};
