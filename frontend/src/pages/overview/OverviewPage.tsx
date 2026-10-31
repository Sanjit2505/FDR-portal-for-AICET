import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  AlertTriangle,
  Briefcase,
  CalendarDays,
  ShieldCheck,
  ArrowUpRight,
  PlusCircle,
  GitFork,
  ArrowRight,
  Activity,
  Zap,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { api } from '../../services/api';
import type { DashboardSummary } from '../../types';
import { StatCard } from '../../components/ui/StatCard';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getDashboardSummary();
        setSummary(data);
      } catch (err) {
        console.error("Failed to load dashboard summary:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono tracking-wider">CALCULATING EVIDENCE METRICS...</span>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const formatCurrency = (amt: number) => {
    if (amt >= 10000000) {
      return `₹${(amt / 10000000).toFixed(2)} Cr`;
    }
    if (amt >= 100000) {
      return `₹${(amt / 100000).toFixed(2)} L`;
    }
    return `₹${amt.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0c1222]/90 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Live Production Scrutiny
            </span>
            <span className="text-xs text-slate-400 font-mono">
              3 Institutions Synchronized
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Institutional Evidence Command Center
          </h1>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Automated scrutiny of statutory Fixed Deposit Receipts, SHA-256 verification checkpoints, and explainable rule evaluations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <button
            onClick={() => navigate('/fdr/new')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit FDR</span>
          </button>
          <button
            onClick={() => navigate('/graph')}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <GitFork className="w-4 h-4 text-indigo-400" />
            <span>Relationship Graph</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total FDR Portfolio"
          value={summary.total_fdrs}
          subtitle={`Total Volume: ${formatCurrency(summary.total_principal_amount)}`}
          icon={Receipt}
          variant="indigo"
          onClick={() => navigate('/fdr')}
        />
        <StatCard
          title="Open Discrepancies"
          value={summary.open_findings_count}
          subtitle={`${summary.high_priority_findings} Critical / High Priority`}
          icon={AlertTriangle}
          variant={summary.high_priority_findings > 0 ? "danger" : "warning"}
          onClick={() => navigate('/risk')}
        />
        <StatCard
          title="Investigation Cases"
          value={summary.open_cases_count}
          subtitle="Formal Inquiry Dossiers"
          icon={Briefcase}
          variant="default"
          onClick={() => navigate('/cases')}
        />
        <StatCard
          title="Upcoming Maturities (30d)"
          value={summary.upcoming_maturities_30d}
          subtitle={`${summary.overdue_actions_count} Deposits Past Due`}
          icon={CalendarDays}
          variant={summary.overdue_actions_count > 0 ? "warning" : "default"}
          onClick={() => navigate('/maturity')}
        />
      </div>

      {/* Critical Findings Ticker / Alert if discrepancies exist */}
      {summary.high_priority_findings > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/[0.15] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-200 flex items-center gap-2">
                <span>Critical Evidence Discrepancies Require Scrutiny</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  {summary.high_priority_findings} Flagged
                </span>
              </div>
              <p className="text-[11.5px] text-slate-300 mt-0.5">
                Mathematical variance detected between submitted deposit metadata and extracted certificate text.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/risk?severity=high')}
            className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <span>Review Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Maturity Horizon Distribution */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0c1222]/80 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Maturity Horizon Schedule
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deposit expirations categorized by statutory renewal deadlines
                </p>
              </div>
              <button
                onClick={() => navigate('/maturity')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>Planner</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.maturity_distribution}>
                  <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f8fafc'
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {summary.maturity_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Deterministic Date Ordering</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active Calendar
            </span>
          </div>
        </div>

        {/* Findings by Rule Breakdown */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0c1222]/80 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Discrepancy Rule Triggers
              </h2>
              <button
                onClick={() => navigate('/risk')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>Rule Matrix</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Deterministic rule detections from R1 to R8
            </p>

            <div className="space-y-2">
              {summary.findings_by_rule.length === 0 ? (
                <div className="p-4 text-center text-xs text-emerald-400 bg-emerald-500/10 rounded-xl">
                  All active FDR deposits verified compliant.
                </div>
              ) : (
                summary.findings_by_rule.map((r) => (
                  <div
                    key={r.rule_id}
                    onClick={() => navigate(`/risk?rule_id=${r.rule_id}`)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-bold border border-indigo-500/25">
                        {r.rule_id}
                      </span>
                      <span className="text-xs text-slate-200 font-medium group-hover:text-white transition-colors">
                        {r.rule_name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10">
                      {r.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Score: 0 - 100 Priority</span>
            <span className="text-indigo-300">Deterministic Engine</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Audit Stream */}
      <div className="p-6 rounded-2xl bg-[#0c1222]/80 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Cryptographic Audit Log Stream
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic sequential hash chain ($H_n$) with cryptographic proof of provenance
            </p>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>Verify Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                <th className="py-2.5 px-3">Sequence</th>
                <th className="py-2.5 px-3">Action Event</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] font-sans">
              {summary.recent_activity.map((act) => (
                <tr key={act.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">
                    #{act.sequence_number}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-200">
                    {act.event_type}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {act.entity_type}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {act.actor_name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
