import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Shield, CheckCircle2, Sliders, ExternalLink,
  FileText, ArrowUpRight, Check, X, ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { RiskFlag, RuleConfig } from '../../types';
import { RiskBadge } from '../../components/ui/Badges';
import { useAuth } from '../../context/AuthContext';

export const RiskWorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'findings' | 'rules'>('findings');
  const [findings, setFindings] = useState<RiskFlag[]>([]);
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [ruleFilter, setRuleFilter] = useState(searchParams.get('rule_id') || '');
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || '');
  const [statusFilter, setStatusFilter] = useState('open');

  // Action Dialog State
  const [selectedFinding, setSelectedFinding] = useState<RiskFlag | null>(null);
  const [actionType, setActionType] = useState<'dismiss' | 'override' | 'resolve'>('dismiss');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [ruleFilter, severityFilter, statusFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [findingsData, rulesData] = await Promise.all([
        api.getFindings({
          rule_id: ruleFilter || undefined,
          severity: severityFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.getRules()
      ]);
      setFindings(findingsData);
      setRules(rulesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinding) return;
    setActionError(null);
    setActionLoading(true);
    try {
      await api.takeFindingAction(selectedFinding.id, actionType, actionReason);
      setSelectedFinding(null);
      setActionReason('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRuleWeightChange = async (ruleId: string, newWeight: number) => {
    try {
      await api.updateRule(ruleId, { weight: newWeight });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRuleToggle = async (ruleId: string, isEnabled: boolean) => {
    try {
      await api.updateRule(ruleId, { is_enabled: isEnabled });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Explainable Risk & Discrepancy Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic rule validation with verifiable evidence rationales and official audit decisions
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-navy-900 border border-navy-800">
          <button
            onClick={() => setActiveTab('findings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'findings' ? 'bg-primary-600 text-white shadow-subtle' : 'text-slate-400 hover:text-white'
            }`}
          >
            Review Findings ({findings.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'rules' ? 'bg-primary-600 text-white shadow-subtle' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Rule Configuration</span>
          </button>
        </div>
      </div>

      {activeTab === 'findings' ? (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-navy-900/80 border border-navy-700/70 shadow-subtle grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Rule ID</label>
              <select
                value={ruleFilter}
                onChange={(e) => setRuleFilter(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Rules (R1 - R8)</option>
                {rules.map((r) => (
                  <option key={r.rule_id} value={r.rule_id}>
                    {r.rule_id}: {r.rule_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical Priority</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Finding Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
              >
                <option value="">All Statuses</option>
                <option value="open">Active Open Findings</option>
                <option value="dismissed">Dismissed (Recorded Reason)</option>
                <option value="overridden">Overridden (Override Reason)</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Findings List */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading rule findings...</div>
          ) : findings.length === 0 ? (
            <div className="p-8 text-center bg-navy-900 border border-navy-800 rounded-2xl text-xs text-slate-400">
              No findings matching the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {findings.map((f) => (
                <div
                  key={f.id}
                  className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700/70 hover:border-slate-600 transition-all shadow-subtle space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-primary-500/20 text-primary-300 font-bold border border-primary-500/30">
                        {f.rule_id}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight">{f.rule_name}</h3>
                        <p className="text-[11px] text-slate-400 font-mono">
                          FDR: <span className="text-slate-200 font-semibold">{f.fdr_number}</span> • Institution: {f.institution_name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiskBadge band={f.severity} />
                      <span className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded uppercase ${
                        f.status === 'open' ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 bg-navy-800'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {f.explanation}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-navy-950/70 border border-navy-800 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-sans block">Expected Rule Value</span>
                      <span className="text-slate-200 truncate block">{f.expected_value || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-sans block">Observed Evidence Value</span>
                      <span className="text-rose-300 truncate block">{f.observed_value || 'N/A'}</span>
                    </div>
                  </div>

                  {f.dismissed_reason && (
                    <div className="p-3 rounded-xl bg-navy-800/60 border border-navy-700 text-xs">
                      <span className="font-semibold text-slate-300 block text-[11px]">Recorded Reviewer Note:</span>
                      <p className="text-slate-400 mt-0.5">{f.dismissed_reason}</p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-navy-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => navigate(`/fdr/${f.fdr_id}`)}
                      className="text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
                    >
                      <span>Open FDR Record</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {user?.role !== 'institution_user' && f.status === 'open' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedFinding(f);
                            setActionType('dismiss');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-navy-700 text-slate-300 hover:text-white hover:bg-navy-800 transition-colors"
                        >
                          Dismiss Finding
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFinding(f);
                            setActionType('override');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition-colors"
                        >
                          Override Signal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Rule Configurations Tab */
        <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl shadow-subtle overflow-hidden">
          <div className="p-5 border-b border-navy-800">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Configurable Deterministic Rules (R1 - R8)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure weights and active status for review priority scoring (0-100).
            </p>
          </div>

          <div className="divide-y divide-navy-800">
            {rules.map((rule) => (
              <div key={rule.rule_id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 max-w-xl">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    {rule.rule_id}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{rule.rule_name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{rule.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">Weight:</span>
                    {user?.role === 'admin' ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rule.weight}
                        onChange={(e) => handleRuleWeightChange(rule.rule_id, parseFloat(e.target.value) || 0)}
                        className="w-16 bg-navy-950 border border-navy-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-right"
                      />
                    ) : (
                      <span className="font-mono font-bold text-slate-200">{rule.weight}</span>
                    )}
                  </div>

                  {user?.role === 'admin' ? (
                    <button
                      onClick={() => handleRuleToggle(rule.rule_id, !rule.is_enabled)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        rule.is_enabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rule.is_enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  ) : (
                    <span className={`text-xs font-mono ${rule.is_enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {rule.is_enabled ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Dialog Modal */}
      {selectedFinding && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 max-w-md w-full shadow-elevated">
            <h2 className="text-base font-bold text-white mb-1">
              Record Official Action ({actionType.toUpperCase()})
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Rule: {selectedFinding.rule_id} - {selectedFinding.rule_name}
            </p>

            {actionError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {actionError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Recorded Official Rationale *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="State the justification for this status modification (minimum 5 characters)..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedFinding(null)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Confirm Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

