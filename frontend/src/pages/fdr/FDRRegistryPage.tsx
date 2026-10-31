import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt, PlusCircle, Search, Filter, ArrowUpRight,
  ShieldCheck, AlertTriangle, FileSpreadsheet, Eye, ChevronRight
} from 'lucide-react';
import { api } from '../../services/api';
import type { FDRRecord, Institution } from '../../types';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';

export const FDRRegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [institutionId, setInstitutionId] = useState(searchParams.get('institution_id') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [riskBand, setRiskBand] = useState(searchParams.get('risk_band') || '');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fdrData, instData] = await Promise.all([
          api.getFDRs({
            search: search || undefined,
            institution_id: institutionId || undefined,
            workflow_status: status || undefined,
            risk_band: riskBand || undefined,
          }),
          api.getInstitutions()
        ]);
        setFdrs(fdrData);
        setInstitutions(instData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [search, institutionId, status, riskBand]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Fixed Deposit Receipt Registry
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional deposit records with explainable review priority signals and evidence audit trails
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href={api.getFDRsCSVUrl(institutionId || undefined)}
            className="px-3.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all"
            download
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => navigate('/fdr/new')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit FDR</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0c1222]/80 border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.25)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search FDR, Bank, IFSC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Institution filter */}
        <div>
          <select
            value={institutionId}
            onChange={(e) => setInstitutionId(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="" className="bg-[#0c1322]">All Institutions</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id} className="bg-[#0c1322]">
                {i.code} — {i.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="" className="bg-[#0c1322]">All Workflow Statuses</option>
            <option value="submitted" className="bg-[#0c1322]">Submitted</option>
            <option value="verified" className="bg-[#0c1322]">Verified</option>
            <option value="discrepant" className="bg-[#0c1322]">Discrepancy Detected</option>
            <option value="investigating" className="bg-[#0c1322]">Under Investigation</option>
            <option value="resolved" className="bg-[#0c1322]">Resolved</option>
          </select>
        </div>

        {/* Risk Band filter */}
        <div>
          <select
            value={riskBand}
            onChange={(e) => setRiskBand(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="" className="bg-[#0c1322]">All Priority Bands</option>
            <option value="low" className="bg-[#0c1322]">Low Priority</option>
            <option value="medium" className="bg-[#0c1322]">Medium Priority</option>
            <option value="high" className="bg-[#0c1322]">High Priority</option>
            <option value="critical" className="bg-[#0c1322]">Critical Priority</option>
          </select>
        </div>
      </div>

      {/* Modern High-Density Table */}
      <div className="bg-[#0c1222]/80 border border-white/[0.08] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                <th className="py-3 px-4">FDR Identifier</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Issuing Bank & Branch</th>
                <th className="py-3 px-4 text-right">Principal Amount</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">Review Priority</th>
                <th className="py-3 px-4">Workflow Status</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-mono">
                    Querying canonical deposit ledger...
                  </td>
                </tr>
              ) : fdrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching FDR records found.
                  </td>
                </tr>
              ) : (
                fdrs.map((fdr) => (
                  <tr
                    key={fdr.id}
                    className="hover:bg-white/[0.025] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/fdr/${fdr.id}`)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {fdr.display_fdr_number}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {fdr.normalized_fdr_number}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">
                      {fdr.institution_name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{fdr.bank_name}</div>
                      <div className="text-[10.5px] text-slate-400 font-mono">{fdr.branch_name} • {fdr.ifsc_code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                      ₹{fdr.principal_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {fdr.maturity_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <RiskBadge band={fdr.risk_band} score={fdr.risk_score} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={fdr.workflow_status} />
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/fdr/${fdr.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title="View FDR Evidence Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
