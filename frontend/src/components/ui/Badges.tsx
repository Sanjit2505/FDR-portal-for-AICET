import React from 'react';
import type { RiskBand, WorkflowStatus } from '../../types';
import { CheckCircle2, AlertOctagon, AlertTriangle, ShieldAlert, Clock, FileCheck } from 'lucide-react';

export const RiskBadge: React.FC<{ band: RiskBand; score?: number }> = ({ band, score }) => {
  const styles = {
    low: 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/25',
    medium: 'bg-amber-500/[0.08] text-amber-400 border-amber-500/25',
    high: 'bg-orange-500/[0.08] text-orange-400 border-orange-500/25',
    critical: 'bg-rose-500/[0.08] text-rose-400 border-rose-500/25',
  }[band] || 'bg-slate-500/[0.08] text-slate-400 border-slate-500/25';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-semibold uppercase tracking-wider border ${styles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{band}</span>
      {score !== undefined && <span className="tabular-nums font-bold">({score.toFixed(0)})</span>}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: WorkflowStatus }> = ({ status }) => {
  const config = {
    submitted: { label: 'Submitted', color: 'bg-blue-500/[0.08] text-blue-400 border-blue-500/20', icon: Clock },
    under_review: { label: 'Under Review', color: 'bg-indigo-500/[0.08] text-indigo-400 border-indigo-500/20', icon: Clock },
    verified: { label: 'Verified', color: 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    discrepant: { label: 'Discrepancy', color: 'bg-rose-500/[0.08] text-rose-400 border-rose-500/20', icon: AlertOctagon },
    investigating: { label: 'Investigating', color: 'bg-amber-500/[0.08] text-amber-400 border-amber-500/20', icon: AlertTriangle },
    resolved: { label: 'Resolved', color: 'bg-teal-500/[0.08] text-teal-400 border-teal-500/20', icon: FileCheck },
  }[status] || { label: status, color: 'bg-slate-500/[0.08] text-slate-400 border-slate-500/20', icon: Clock };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-sans font-medium border ${config.color}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export const IntegrityBadge: React.FC<{ status: 'intact' | 'modified' | 'missing' | 'unverified' }> = ({ status }) => {
  const config = {
    intact: { label: 'SHA-256 Intact', color: 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/25', icon: CheckCircle2 },
    modified: { label: 'Hash Mismatch', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse', icon: ShieldAlert },
    missing: { label: 'File Missing', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: AlertOctagon },
    unverified: { label: 'Unverified', color: 'bg-slate-500/[0.08] text-slate-400 border-slate-500/20', icon: Clock },
  }[status] || { label: status, color: 'bg-slate-500/[0.08] text-slate-400 border-slate-500/20', icon: Clock };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-medium border ${config.color}`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
