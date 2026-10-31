import React, { useState, useEffect } from 'react';
import {
  History, ShieldCheck, ShieldAlert, RefreshCw,
  Search, CheckCircle2, ChevronRight, X, Code
} from 'lucide-react';
import { api } from '../../services/api';
import { AuditEvent } from '../../types';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAuditEvents();
  }, []);

  async function loadAuditEvents() {
    setLoading(true);
    try {
      const data = await api.getAuditEvents(100, 0);
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyAuditChain();
      setVerifyResult(res);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const filtered = events.filter(e =>
    e.event_type.toLowerCase().includes(search.toLowerCase()) ||
    e.entity_type.toLowerCase().includes(search.toLowerCase()) ||
    (e.actor_name && e.actor_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Cryptographic Hash-Chained Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic SHA-256 sequential event ledger verifying state transitions and actor accountability
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-2 shadow-glow-primary transition-all disabled:opacity-50"
        >
          <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
          <span>{verifying ? "Verifying Hash Links..." : "Verify Full Chain Integrity"}</span>
        </button>
      </div>

      {/* Chain Verification Result Banner */}
      {verifyResult && (
        <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
          verifyResult.is_valid
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            {verifyResult.is_valid ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>LEDGER INTEGRITY VERIFIED (All {verifyResult.total_events} Sequential Hashes Intact)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>LEDGER TAMPERING DETECTED at Sequence #{verifyResult.tampered_sequence}</span>
              </>
            )}
          </div>
          <p className="text-slate-300">{verifyResult.message}</p>
          <p className="text-[10px] font-mono text-slate-400">
            Verified at {new Date(verifyResult.verified_at).toLocaleTimeString()} using strict SHA-256 canonical payload hashing.
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by event type, entity, or actor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-navy-900 border border-navy-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Seq #</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Previous Hash</th>
                <th className="py-3 px-4">Current Hash</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-center">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    Loading hash-chained event stream...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No audit events found.
                  </td>
                </tr>
              ) : (
                filtered.map((evt) => (
                  <tr key={evt.id} className="hover:bg-navy-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      #{evt.sequence_number}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-100">
                      {evt.event_type}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-mono text-[11px] bg-navy-950 px-1.5 py-0.5 rounded border border-navy-800">
                        {evt.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {evt.actor_name || 'System'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[100px]" title={evt.previous_hash}>
                      {evt.previous_hash.slice(0, 10)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-emerald-400 truncate max-w-[100px]" title={evt.current_hash}>
                      {evt.current_hash.slice(0, 10)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="p-1.5 rounded-lg border border-navy-700 text-slate-400 hover:text-white hover:bg-navy-800"
                        title="Inspect Canonical Payload"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 max-w-xl w-full shadow-elevated">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-4">
              <div>
                <span className="font-mono text-xs text-indigo-400 font-bold">
                  Event Sequence #{selectedEvent.sequence_number}
                </span>
                <h3 className="text-sm font-bold text-white">{selectedEvent.event_type}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Canonical Payload:</span>
                <pre className="mt-1 p-3 rounded-xl bg-navy-950 border border-navy-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                  {JSON.stringify(JSON.parse(selectedEvent.payload || '{}'), null, 2)}
                </pre>
              </div>

              <div className="pt-2 border-t border-navy-800 font-mono text-[10px] text-slate-400 space-y-1">
                <div className="truncate">Prev Hash: <span className="text-slate-200">{selectedEvent.previous_hash}</span></div>
                <div className="truncate">Curr Hash: <span className="text-indigo-300">{selectedEvent.current_hash}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

