import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, AlertTriangle, Clock, ArrowUpRight,
  TrendingUp, Calculator, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';

export const MaturityPlannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [plannerData, setPlannerData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Scenario Simulator
  const [windowDays, setWindowDays] = useState(30);
  const [renewalRate, setRenewalRate] = useState(80);
  const [expectedRate, setExpectedRate] = useState(6.75);
  const [scenarioResult, setScenarioResult] = useState<any | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  useEffect(() => {
    loadPlanner();
  }, []);

  async function loadPlanner() {
    setLoading(true);
    try {
      const data = await api.getMaturityPlanner();
      setPlannerData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRunScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setScenarioLoading(true);
    try {
      const res = await api.runScenarioAnalysis(windowDays, renewalRate, expectedRate);
      setScenarioResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setScenarioLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading Maturity Commitments...</div>;
  }

  if (!plannerData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Maturity Timeline & Liquidity Planner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track statutory deposit expirations, rollover deadlines, and simulated liquidity projections
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30">
          <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">Overdue / Matured</span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {plannerData.counts.matured_past} Records
          </p>
          <span className="text-xs font-mono text-rose-400">
            ₹{(plannerData.totals.matured_past_amount / 100000).toFixed(1)}L
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
          <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Matures within 7 Days</span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {plannerData.counts.within_7_days} Records
          </p>
          <span className="text-xs font-mono text-amber-400">
            ₹{(plannerData.totals.within_7_days_amount / 100000).toFixed(1)}L
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30">
          <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Matures within 30 Days</span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {plannerData.counts.within_30_days} Records
          </p>
          <span className="text-xs font-mono text-indigo-400">
            ₹{(plannerData.totals.within_30_days_amount / 100000).toFixed(1)}L
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
          <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Total Portfolio</span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {plannerData.counts.total_records} Records
          </p>
          <span className="text-xs font-mono text-emerald-400">
            ₹{(plannerData.totals.grand_total / 10000000).toFixed(2)} Cr
          </span>
        </div>
      </div>

      {/* Scenario Analysis Simulation Widget */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-2xl p-6 shadow-subtle space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Deterministic Scenario & Liquidity Projection
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Mathematical simulation based on stored database balances
          </span>
        </div>

        <form onSubmit={handleRunScenario} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Maturity Window (Days)
            </label>
            <input
              type="number"
              min="7"
              max="180"
              value={windowDays}
              onChange={(e) => setWindowDays(parseInt(e.target.value) || 30)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Estimated Renewal Rollover (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={renewalRate}
              onChange={(e) => setRenewalRate(parseFloat(e.target.value) || 0)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
              Projected Bank Rate (%)
            </label>
            <input
              type="number"
              step="0.05"
              min="1"
              max="15"
              value={expectedRate}
              onChange={(e) => setExpectedRate(parseFloat(e.target.value) || 0)}
              className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={scenarioLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-all shadow-glow-primary"
          >
            {scenarioLoading ? "Computing..." : "Run Projection"}
          </button>
        </form>

        {scenarioResult && (
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 font-sans uppercase block">Maturing Deposits</span>
              <span className="text-white font-bold">{scenarioResult.results.fdr_records_maturing} Records</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans uppercase block">Total Maturing Volume</span>
              <span className="text-amber-400 font-bold">
                ₹{scenarioResult.results.total_maturing_principal.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans uppercase block">Projected Renewals</span>
              <span className="text-emerald-400 font-bold">
                ₹{scenarioResult.results.projected_renewals_amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans uppercase block">Liquidation Required</span>
              <span className="text-rose-400 font-bold">
                ₹{scenarioResult.results.projected_liquidation_required.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Critical Upcoming Deposit Tables */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Urgent Attention (Expiring within 30 Days)
        </h2>

        <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl shadow-subtle overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">FDR Number</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Bank</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">Days Left</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-sans">
              {[...plannerData.buckets.matured_past, ...plannerData.buckets.within_7_days, ...plannerData.buckets.within_30_days].map((item) => (
                <tr key={item.id} className="hover:bg-navy-850/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-100">
                    {item.fdr_number}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {item.institution_name}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {item.bank_name}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                    ₹{item.principal_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-200">
                    {item.maturity_date}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                      item.days_remaining < 0 ? 'bg-rose-500/10 text-rose-400' :
                      item.days_remaining <= 7 ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                      'bg-indigo-500/10 text-indigo-400'
                    }`}>
                      {item.days_remaining < 0 ? `${Math.abs(item.days_remaining)}d overdue` : `${item.days_remaining}d remaining`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => navigate(`/fdr/${item.id}`)}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                    >
                      Inspect
                    </button>
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

