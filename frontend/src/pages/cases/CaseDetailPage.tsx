import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase, ArrowLeft, UserCheck, MessageSquare, Clock,
  CheckCircle2, AlertTriangle, ShieldCheck, Send, ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';
import { InvestigationCase, User } from '../../types';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';
import { useAuth } from '../../context/AuthContext';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<InvestigationCase | null>(null);
  const [loading, setLoading] = useState(true);

  // Note form
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Decision form
  const [decision, setDecision] = useState('verified_compliant');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Status update
  const [statusVal, setStatusVal] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (caseId) {
      loadCase(caseId);
    }
  }, [caseId]);

  async function loadCase(id: string) {
    setLoading(true);
    try {
      const data = await api.getCase(id);
      setCaseData(data);
      setStatusVal(data.status);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const updated = await api.addCaseNote(caseId, newNote.trim());
      setCaseData(updated);
      setNewNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    try {
      const updated = await api.updateCaseStatus(caseId, statusVal, statusReason);
      setCaseData(updated);
      setShowStatusModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setDecisionError(null);
    setDecisionLoading(true);
    try {
      const updated = await api.recordCaseDecision(caseId, decision, decisionNotes);
      setCaseData(updated);
      setDecisionNotes('');
    } catch (err: any) {
      setDecisionError(err.message || 'Failed to record decision');
    } finally {
      setDecisionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading investigation file...</div>;
  }

  if (!caseData) {
    return <div className="p-12 text-center text-xs text-rose-400">Case not found.</div>;
  }

  const isOfficialOrAdmin = user?.role === 'authorized_official' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cases')}
            className="p-1.5 rounded-lg border border-navy-700 text-slate-400 hover:text-white hover:bg-navy-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                {caseData.case_number}
              </span>
              <RiskBadge band={caseData.priority} />
              <span className="text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded bg-navy-800 text-slate-300">
                {caseData.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-lg font-bold text-white mt-1">
              {caseData.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOfficialOrAdmin && caseData.status !== 'resolved' && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-3.5 py-1.5 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-medium text-slate-200 transition-colors"
            >
              Update Status
            </button>
          )}
          <button
            onClick={() => navigate(`/fdr/${caseData.fdr_id}`)}
            className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow-primary transition-all"
          >
            <span>View FDR Record</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid: Details & Notes vs Decision & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Case Info, Findings, Notes */}
        <div className="lg:col-span-7 space-y-6">
          {/* Summary Card */}
          <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl p-5 shadow-subtle space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Scrutiny Summary & Scope
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {caseData.summary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-navy-800 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 font-sans uppercase block">Target FDR</span>
                <span className="text-indigo-300 font-bold">{caseData.fdr_number}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans uppercase block">Institution</span>
                <span className="text-slate-200 truncate block">{caseData.institution_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-sans uppercase block">Assigned Official</span>
                <span className="text-slate-200 truncate block">{caseData.assignee_name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Triggering Findings */}
          <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl p-5 shadow-subtle">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Triggering Discrepancy Findings
            </h2>
            <div className="space-y-3">
              {caseData.risk_flags.map((f) => (
                <div key={f.id} className="p-3 rounded-xl bg-navy-950 border border-navy-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-300 font-bold">{f.rule_id}: {f.rule_name}</span>
                    <RiskBadge band={f.severity} />
                  </div>
                  <p className="text-slate-300">{f.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Review Notes Thread */}
          <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl p-5 shadow-subtle space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Investigative Notes Thread ({caseData.notes.length})
              </h2>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {caseData.notes.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-navy-950 rounded-xl">
                  No notes recorded yet.
                </div>
              ) : (
                caseData.notes.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-xl bg-navy-950 border border-navy-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{n.author_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">{n.note_text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add note input */}
            <form onSubmit={handleAddNote} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Add formal note or evidence observation..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 bg-navy-950 border border-navy-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={submittingNote || !newNote.trim()}
                className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right 5 cols: Official Verdict / Decision & Event History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Formal Decision Panel */}
          <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl p-5 shadow-subtle">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
              Formal Regulatory Decision
            </h2>

            {caseData.decision !== 'pending' ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verdict: {caseData.decision.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-sans">{caseData.decision_notes}</p>
                <span className="text-[10px] font-mono text-slate-400 block pt-1 border-t border-emerald-500/20">
                  Decided on {caseData.decided_at ? new Date(caseData.decided_at).toLocaleDateString() : ''}
                </span>
              </div>
            ) : isOfficialOrAdmin ? (
              <form onSubmit={handleRecordDecision} className="space-y-3">
                {decisionError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    {decisionError}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                    Decision Verdict *
                  </label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="verified_compliant">Verified Compliant (Discrepancy Explained)</option>
                    <option value="discrepancy_confirmed">Discrepancy Confirmed (Action Required)</option>
                    <option value="corrected_and_closed">Corrected and Closed</option>
                    <option value="dismissed_false_positive">Dismissed as False Positive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                    Official Decision Rationale * (min 10 characters)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Document the formal justification and conclusion of this inquiry..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={decisionLoading || decisionNotes.length < 10}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {decisionLoading ? "Recording Verdict..." : "Record Official Decision"}
                </button>
              </form>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-navy-950 rounded-xl">
                Official decision pending review by authorized officer.
              </div>
            )}
          </div>

          {/* Case Chronological Event Timeline */}
          <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl p-5 shadow-subtle space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Chronological Audit Log
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {caseData.events.map((evt) => (
                <div key={evt.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-slate-300 font-sans">{evt.details}</p>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {evt.actor_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 max-w-sm w-full shadow-elevated">
            <h2 className="text-sm font-bold text-white mb-2">Update Investigation Status</h2>
            <form onSubmit={handleStatusUpdate} className="space-y-3">
              <div>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="new">New</option>
                  <option value="under_review">Under Review</option>
                  <option value="awaiting_information">Awaiting Information</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div>
                <textarea
                  rows={2}
                  placeholder="Reason for status update..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

