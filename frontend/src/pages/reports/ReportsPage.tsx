import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { Institution } from '../../types';

export const ReportsPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInst, setSelectedInst] = useState('');

  useEffect(() => {
    async function loadInsts() {
      try {
        const data = await api.getInstitutions();
        setInstitutions(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadInsts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-navy-800">
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          <span>Statutory Reports & Data Exports</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export verified institutional deposit registries, discrepancy audits, and maturity forecasts as canonical CSV spreadsheets
        </p>
      </div>

      {/* Scope Selector */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-navy-700/70 max-w-md">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1.5">
          Select Institutional Scope
        </label>
        <select
          value={selectedInst}
          onChange={(e) => setSelectedInst(e.target.value)}
          className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary-500"
        >
          <option value="">All Authorized Institutions (Consolidated)</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.code} - {i.name}
            </option>
          ))}
        </select>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Report 1: FDR Registry */}
        <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-700/70 shadow-subtle flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Full FDR Register (CSV)
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Export all fixed deposit receipt particulars including normalized identifiers, bank & branch details, IFSC codes, amounts, validities, renewal linkages, and current workflow states.
            </p>
          </div>

          <div className="pt-5 mt-4 border-t border-navy-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Escaped CSV Format</span>
            <a
              href={api.getFDRsCSVUrl(selectedInst || undefined)}
              download
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-glow-primary"
            >
              <Download className="w-4 h-4" />
              <span>Download Registry CSV</span>
            </a>
          </div>
        </div>

        {/* Report 2: Discrepancy Findings */}
        <div className="p-6 rounded-2xl bg-navy-900/80 border border-navy-700/70 shadow-subtle flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Discrepancy Findings Dossier (CSV)
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Complete breakdown of all flagged rule violations (R1-R8), observed vs expected values, severity levels, reviewer recorded justifications, and resolution statuses.
            </p>
          </div>

          <div className="pt-5 mt-4 border-t border-navy-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Escaped CSV Format</span>
            <a
              href={api.getFindingsCSVUrl()}
              download
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-subtle"
            >
              <Download className="w-4 h-4" />
              <span>Download Findings CSV</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

