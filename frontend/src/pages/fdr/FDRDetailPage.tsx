import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Receipt, Building2, Calendar, FileText, AlertTriangle, ShieldCheck,
  RefreshCw, Briefcase, GitFork, ArrowLeft, Download, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import type { FDRRecord, DocumentRecord, RiskFlag } from '../../types';
import { RiskBadge, StatusBadge, IntegrityBadge } from '../../components/ui/Badges';
import { useAuth } from '../../context/AuthContext';

export const FDRDetailPage: React.FC = () => {
  const { fdrId } = useParams<{ fdrId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [fdr, setFdr] = useState<FDRRecord | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [findings, setFindings] = useState<RiskFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [reEvaluating, setReEvaluating] = useState(false);

  useEffect(() => {
    if (fdrId) {
      loadFDRData(fdrId);
    }
  }, [fdrId]);

  async function loadFDRData(id: string) {
    setLoading(true);
    try {
      const [fdrData, docsData, findingsData] = await Promise.all([
        api.getFDR(id),
        api.getDocumentsByFDR(id),
        api.getFindings({ fdr_id: id })
      ]);
      setFdr(fdrData);
      setDocuments(docsData);
      setFindings(findingsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleReEvaluate = async () => {
    if (!fdrId) return;
    setReEvaluating(true);
    try {
      await api.reEvaluateFDR(fdrId);
      await loadFDRData(fdrId);
    } catch (err) {
      console.error(err);
    } finally {
      setReEvaluating(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading FDR Evidence Dossier...</div>;
  }

  if (!fdr) {
    return <div className="p-12 text-center text-xs text-rose-400">FDR Record not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/fdr')}
            className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                {fdr.display_fdr_number}
              </h1>
              <RiskBadge band={fdr.risk_band} score={fdr.risk_score} />
              <StatusBadge status={fdr.workflow_status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Institution: {fdr.institution_name || 'N/A'} • Normalized Ref: {fdr.normalized_fdr_number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReEvaluate}
            disabled={reEvaluating}
            className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-xs font-medium text-slate-200 hover:bg-white/[0.04] flex items-center gap-1.5 transition-all"
            title="Re-run deterministic validation rule engine"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${reEvaluating ? 'animate-spin' : ''}`} />
            <span>{reEvaluating ? "Evaluating..." : "Re-evaluate"}</span>
          </button>
          <button
            onClick={() => navigate(`/graph?fdr_id=${fdr.id}`)}
            className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] text-xs font-medium text-slate-200 hover:bg-white/[0.04] flex items-center gap-1.5 transition-all"
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-400" />
            <span>Graph View</span>
          </button>
          {findings.length > 0 && user?.role !== 'institution_user' && (
            <button
              onClick={() => navigate(`/cases?fdr_id=${fdr.id}`)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_16px_rgba(244,63,94,0.3)] transition-all"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Investigation Cases</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Details & Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Findings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Attributes Card */}
          <div className="bg-[#0c1222]/80 border border-white/[0.08] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4">
              Registered Deposit Attributes
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-xs font-sans">
              <div>
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">Issuing Bank</span>
                <span className="font-semibold text-slate-100">{fdr.bank_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">Branch Name</span>
                <span className="font-semibold text-slate-100">{fdr.branch_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">IFSC Code</span>
                <span className="font-mono font-bold text-slate-100">{fdr.ifsc_code}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">Principal Amount</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  ₹{fdr.principal_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">Issue Date</span>
                <span className="font-mono text-slate-200">{fdr.issue_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">Maturity Date</span>
                <span className="font-mono text-slate-200">{fdr.maturity_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">Renewal Status</span>
                <span className="capitalize font-medium text-slate-200">{fdr.renewal_status}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10.5px] uppercase font-mono">Beneficiary / Lien Holder</span>
                <span className="text-slate-200 truncate">{fdr.beneficiary || 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Triggered Rule Findings */}
          <div className="bg-[#0c1222]/80 border border-white/[0.08] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Rule Discrepancy Findings ({findings.length})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Deterministic explainable findings linking to source evidence
                </p>
              </div>
            </div>

            {findings.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero discrepancies detected. Deposit record aligns with all validation rules.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {findings.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                          {f.rule_id}
                        </span>
                        <span className="text-xs font-bold text-white">{f.rule_name}</span>
                      </div>
                      <RiskBadge band={f.severity} />
                    </div>

                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                      {f.explanation}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg bg-[#080d1a] border border-white/[0.06] font-mono mb-2">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-sans">Expected</span>
                        <span className="text-slate-200 truncate block">{f.expected_value || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-sans">Observed</span>
                        <span className="text-rose-300 truncate block">{f.observed_value || 'N/A'}</span>
                      </div>
                    </div>

                    {f.suggested_action && (
                      <p className="text-[11px] text-indigo-300">
                        <span className="font-semibold text-slate-400 font-sans">Suggested Action: </span>
                        {f.suggested_action}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Vault & Attached Documents */}
        <div className="space-y-6">
          <div className="bg-[#0c1222]/80 border border-white/[0.08] rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4">
              Cryptographic Document Vault
            </h2>

            {documents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white/[0.02] rounded-xl font-mono">
                No supporting PDF certificate uploaded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-200 truncate">{doc.filename}</span>
                      </div>
                      <IntegrityBadge status={doc.integrity_status} />
                    </div>

                    {doc.versions.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.04] text-[10px] font-mono text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Version:</span>
                          <span className="text-slate-200">v{doc.versions[0].version_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SHA-256:</span>
                          <span className="text-indigo-300 truncate max-w-[140px]" title={doc.versions[0].file_hash}>
                            {doc.versions[0].file_hash.slice(0, 16)}...
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Size:</span>
                          <span>{(doc.versions[0].file_size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-[11px] font-semibold text-indigo-200 text-center transition-colors"
                      >
                        Inspect Dossier
                      </button>
                      <a
                        href={api.getDocumentDownloadUrl(doc.id)}
                        className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                        title="Download Source Document"
                        download
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
