import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Search, Filter, ArrowUpRight, UserCheck, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { InvestigationCase } from '../../types';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';
import { useAuth } from '../../context/AuthContext';

export const CasesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    async function loadCases() {
      setLoading(true);
      try {
        const data = await api.getCases({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
        });
        setCases(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, [statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Investigation Cases
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Formal inquiry workspace for discrepancy resolution, reviewer assignment, and recorded decisions
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-navy-700/70 shadow-subtle grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="under_review">Under Review</option>
            <option value="awaiting_information">Awaiting Information</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Priority</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading active cases...</div>
      ) : cases.length === 0 ? (
        <div className="p-8 text-center bg-navy-900 border border-navy-800 rounded-2xl text-xs text-slate-400">
          No investigation cases matching filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/70 hover:border-slate-600 transition-all shadow-subtle cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {c.case_number}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors">
                    {c.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge band={c.priority} />
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-300 uppercase">
                    {c.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                {c.summary}
              </p>

              <div className="pt-3 border-t border-navy-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="font-mono">FDR: <strong className="text-slate-200">{c.fdr_number}</strong></span>
                  <span>Institution: <strong className="text-slate-200">{c.institution_name}</strong></span>
                  {c.assignee_name && (
                    <span className="flex items-center gap-1 text-indigo-300">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{c.assignee_name}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

