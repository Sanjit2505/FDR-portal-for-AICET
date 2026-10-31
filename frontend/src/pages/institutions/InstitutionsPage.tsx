import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, ExternalLink, MapPin, Receipt, Shield } from 'lucide-react';
import { api } from '../../services/api';
import { Institution } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const InstitutionsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState('');
  const [regNo, setRegNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadInstitutions();
  }, []);

  async function loadInstitutions() {
    setLoading(true);
    try {
      const data = await api.getInstitutions();
      setInstitutions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.createInstitution({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        state: state.trim(),
        registration_number: regNo.trim() || undefined,
        email: email.trim() || undefined,
        contact_phone: phone.trim() || undefined
      });
      setShowModal(false);
      setCode('');
      setName('');
      setState('');
      setRegNo('');
      setEmail('');
      setPhone('');
      loadInstitutions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create institution');
    }
  };

  const filtered = institutions.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase()) ||
    i.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Registered Institutions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Multitenant institutional directory and security deposit portfolios
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-glow-primary transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Institution</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by institution name, code, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-navy-900 border border-navy-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono">Loading institutions...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-navy-900 border border-navy-800 rounded-2xl text-xs text-slate-400">
          No matching institutions found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((inst) => (
            <div
              key={inst.id}
              className="p-5 rounded-2xl bg-navy-900/80 border border-navy-700/70 hover:border-slate-600 transition-all shadow-subtle flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                    {inst.code}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{inst.state}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight mb-2 line-clamp-2">
                  {inst.name}
                </h3>

                {inst.registration_number && (
                  <p className="text-[11px] font-mono text-slate-400 mb-4">
                    Reg: {inst.registration_number}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-navy-950/60 border border-navy-800 mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total FDRs</span>
                    <p className="text-base font-bold text-white font-mono">{inst.total_fdrs}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Deposit Volume</span>
                    <p className="text-base font-bold text-emerald-400 font-mono">
                      ₹{(inst.total_amount / 100000).toFixed(1)}L
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-navy-800/80 flex items-center justify-between">
                <button
                  onClick={() => navigate(`/fdr?institution_id=${inst.id}`)}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>View FDR Records</span>
                </button>
                <button
                  onClick={() => navigate(`/graph?institution_id=${inst.id}`)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  title="View Relationship Graph"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl p-6 max-w-md w-full shadow-elevated">
            <h2 className="text-base font-bold text-white mb-1">Add New Institution</h2>
            <p className="text-xs text-slate-400 mb-4">Register a new institution entity for FDR compliance management.</p>

            {formError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIET-001"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Institution Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Official Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">State *</label>
                <input
                  type="text"
                  required
                  placeholder="State / Region"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Registration Number</label>
                <input
                  type="text"
                  placeholder="Official Reg No"
                  value={regNo}
                  onChange={e => setRegNo(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold"
                >
                  Create Institution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

