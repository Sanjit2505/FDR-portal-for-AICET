import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ShieldCheck, ShieldAlert, RefreshCw, ArrowLeft,
  Download, Eye, CheckCircle2, AlertTriangle, Bug, Lock, FileSearch
} from 'lucide-react';
import { api } from '../../services/api';
import type { DocumentRecord } from '../../types';
import { IntegrityBadge } from '../../components/ui/Badges';

export const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [tampering, setTampering] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [tamperResult, setTamperResult] = useState<any | null>(null);

  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    }
  }, [documentId]);

  async function loadDocument(id: string) {
    setLoading(true);
    try {
      const doc = await api.getDocument(id);
      setDocument(doc);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = async () => {
    if (!document || !document.versions.length) return;
    setVerifying(true);
    setTamperResult(null);
    try {
      const res = await api.verifyDocumentVersion(document.versions[0].id);
      setVerifyResult(res);
      await loadDocument(document.id);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleTamperSimulation = async () => {
    if (!document || !document.versions.length) return;
    setTampering(true);
    setVerifyResult(null);
    try {
      const res = await api.simulateDocumentTampering(document.versions[0].id);
      setTamperResult(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setTampering(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading Document Dossier...</div>;
  }

  if (!document) {
    return <div className="p-12 text-center text-xs text-rose-400">Document record not found.</div>;
  }

  const activeVersion = document.versions.length > 0 ? document.versions[0] : null;
  const downloadUrl = api.getDocumentDownloadUrl(document.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="p-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">
                {document.filename}
              </h1>
              <IntegrityBadge status={document.integrity_status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Vault Record: {document.id} • Version v{document.current_version}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all disabled:opacity-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>{verifying ? "Hashing File..." : "Verify SHA-256 Hash"}</span>
          </button>
          <button
            onClick={handleTamperSimulation}
            disabled={tampering}
            className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.08] hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Controlled demonstration of tamper detection on a disposable copy"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>{tampering ? "Simulating..." : "Tamper Demonstration"}</span>
          </button>
          <a
            href={downloadUrl}
            download
            className="p-2 rounded-xl border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Download PDF File"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Verification / Tamper Banners */}
      {verifyResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/25 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cryptographic Integrity Check: INTACT</span>
          </div>
          <p className="text-slate-200">{verifyResult.explanation}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-emerald-500/20">
            <div>Recorded Vault Hash: <span className="text-slate-200">{verifyResult.recorded_hash}</span></div>
            <div>Recomputed Hash: <span className="text-emerald-300">{verifyResult.recomputed_hash}</span></div>
          </div>
        </div>
      )}

      {tamperResult && (
        <div className="p-4 rounded-2xl bg-rose-500/[0.08] border border-rose-500/25 text-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-300 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Controlled Tamper Demonstration: TAMPER DETECTED</span>
          </div>
          <p className="text-slate-200">{tamperResult.explanation}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-rose-500/20">
            <div>Vault Recorded Hash: <span className="text-slate-200">{tamperResult.original_hash}</span></div>
            <div>Altered File Hash: <span className="text-rose-400">{tamperResult.tampered_hash}</span></div>
          </div>
          <p className="text-[11px] text-amber-300">
            Notice: Original vault certificate remains secure, untouched, and quarantined from modification.
          </p>
        </div>
      )}

      {/* Split Pane View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* PDF Viewer Pane */}
        <div className="lg:col-span-7 bg-[#0c1222]/80 border border-white/[0.08] rounded-2xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.3)] flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
            <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
              Embedded Visual PDF Inspection
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {activeVersion ? `${(activeVersion.file_size / 1024).toFixed(1)} KB` : ''}
            </span>
          </div>
          <div className="flex-1 w-full bg-[#070b14] rounded-xl overflow-hidden border border-white/[0.06] min-h-[520px]">
            <iframe
              src={downloadUrl}
              title="PDF Preview"
              className="w-full h-full min-h-[540px] rounded-xl"
            />
          </div>
        </div>

        {/* Extracted Attributes Pane */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#0c1222]/80 border border-white/[0.08] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1">
              Traceable Attribute Extractions
            </h2>
            <p className="text-[11px] text-slate-400 mb-4">
              Structured parameters extracted with page coordinates and context evidence.
            </p>

            {(!activeVersion || !activeVersion.extractions || activeVersion.extractions.length === 0) ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-white/[0.02] rounded-xl">
                No attributes extracted for this version.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {activeVersion.extractions.map((ext) => (
                  <div
                    key={ext.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1 hover:border-white/[0.12] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-indigo-300 uppercase text-[10px] font-mono tracking-wider">
                        {ext.field_name.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        Page {ext.source_page} • {(ext.confidence * 100).toFixed(0)}% conf
                      </span>
                    </div>

                    <div className="font-mono text-slate-100 font-semibold text-sm">
                      {ext.extracted_value || 'None'}
                    </div>

                    {ext.raw_context && (
                      <p className="text-[10px] text-slate-400 italic pt-1 border-t border-white/[0.04]">
                        "{ext.raw_context}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cryptographic Footprint Info */}
          <div className="bg-[#0c1222]/80 border border-white/[0.08] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] text-xs space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Cryptographic Footprint
            </h2>
            {activeVersion && (
              <div className="space-y-2 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block font-sans text-[10px] uppercase">SHA-256 Digest</span>
                  <span className="text-indigo-300 break-all">{activeVersion.file_hash}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans text-[10px] uppercase">Uploaded At</span>
                  <span className="text-slate-200">{new Date(activeVersion.upload_timestamp).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
