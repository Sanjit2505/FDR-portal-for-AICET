import React from 'react';
import { Settings, ShieldCheck, Database, HardDrive, Key, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-navy-800">
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>System Administration & Governance</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Platform configurations, multitenant security boundaries, and authorization matrix
        </p>
      </div>

      {/* System Status Card */}
      <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-700/70 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Platform Architecture Status
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ONLINE • SECURE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-sans mb-1">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Database Architecture</span>
            </div>
            <p className="text-slate-100 font-bold">PostgreSQL / SQLite Dual Engine</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Strict Foreign Keys & Alembic Migrations</p>
          </div>

          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-sans mb-1">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cryptographic Storage</span>
            </div>
            <p className="text-slate-100 font-bold">SHA-256 Vault</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Isolated Storage with Hash Checkpoints</p>
          </div>

          <div className="p-3 rounded-xl bg-navy-950 border border-navy-800">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-sans mb-1">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Authentication Token</span>
            </div>
            <p className="text-slate-100 font-bold">JWT (HS256) + PBKDF2</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Role Scoping & Strict Tenant Isolation</p>
          </div>
        </div>
      </div>

      {/* Role Authorization Matrix */}
      <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-700/70 shadow-subtle space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-navy-800">
          <Users className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Role-Based Access Control (RBAC) Enforcement
          </h2>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Permitted Operations</th>
                <th className="py-2.5 px-3">System Restrictions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 font-sans">
              <tr>
                <td className="py-3 px-3 font-semibold text-emerald-400">Institution User</td>
                <td className="py-3 px-3 text-slate-300">
                  Register FDRs, upload supporting documents, submit renewal linkages, view institution discrepancies & reminders.
                </td>
                <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                  Isolated to assigned institution. Cannot view other institutions or record official verdicts.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-indigo-400">Authorized Official</td>
                <td className="py-3 px-3 text-slate-300">
                  Cross-institution scrutiny, examine evidence, initiate & assign investigation cases, dismiss/override findings with justification, record formal verdicts.
                </td>
                <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                  Cannot alter system rule weights or user account credentials.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-rose-400">Administrator</td>
                <td className="py-3 px-3 text-slate-300">
                  Full system administration, institution management, configure validation rule weights & parameters, verify cryptographic audit ledger.
                </td>
                <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                  Governed by append-only hash-chained audit logging.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Demo Credentials Reference */}
      <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-700/70 shadow-subtle space-y-3 font-mono text-xs">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
          Demonstration Accounts Reference
        </h2>
        <div className="space-y-2 text-slate-300">
          <div className="p-2.5 rounded-xl bg-navy-950 border border-navy-800 flex justify-between items-center">
            <span>Admin: <strong className="text-white">admin@fdrguardian.internal</strong></span>
            <span className="text-slate-400">Admin@Guardian2026</span>
          </div>
          <div className="p-2.5 rounded-xl bg-navy-950 border border-navy-800 flex justify-between items-center">
            <span>Official: <strong className="text-white">official@aicet.gov.in</strong></span>
            <span className="text-slate-400">Official@Review2026</span>
          </div>
          <div className="p-2.5 rounded-xl bg-navy-950 border border-navy-800 flex justify-between items-center">
            <span>Institute: <strong className="text-white">apex.finance@aiet.ac.in</strong></span>
            <span className="text-slate-400">Apex@User2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

