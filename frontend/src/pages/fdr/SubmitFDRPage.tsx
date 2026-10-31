import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Upload, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft,
  Building2, ShieldCheck, Receipt, FileUp
} from 'lucide-react';
import { api } from '../../services/api';
import { Institution } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const SubmitFDRPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [institutionId, setInstitutionId] = useState('');
  const [fdrNumber, setFdrNumber] = useState('');
  const [bankName, setBankName] = useState('State Bank of India');
  const [branchName, setBranchName] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [renewalStatus, setRenewalStatus] = useState('original');
  const [beneficiary, setBeneficiary] = useState('Member Secretary, Statutory Regulatory Authority');

  // File Upload
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function loadInstitutions() {
      try {
        const insts = await api.getInstitutions();
        setInstitutions(insts);
        if (insts.length > 0) {
          setInstitutionId(insts[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInstitutions();
  }, []);

  const validateStep1 = () => {
    if (!institutionId) return 'Please select an authorized institution.';
    if (!fdrNumber.trim()) return 'FDR Reference Number is required.';
    if (!bankName.trim()) return 'Bank Name is required.';
    if (!branchName.trim()) return 'Branch Name is required.';
    if (!ifscCode.trim()) return 'IFSC Code is required.';
    const amt = parseFloat(principalAmount);
    if (isNaN(amt) || amt <= 0) return 'Principal amount must be a positive monetary figure.';
    if (!issueDate) return 'Issue Date is required.';
    if (!maturityDate) return 'Maturity Date is required.';
    if (new Date(maturityDate) <= new Date(issueDate)) {
      return 'Maturity Date must be strictly after the Issue Date.';
    }
    return null;
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!file) {
        setError('Please select or drag-and-drop the supporting PDF certificate.');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      // 1. Create FDR Record
      const createdFdr = await api.createFDR({
        institution_id: institutionId,
        display_fdr_number: fdrNumber.trim(),
        bank_name: bankName.trim(),
        branch_name: branchName.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        principal_amount: parseFloat(principalAmount),
        issue_date: issueDate,
        maturity_date: maturityDate,
        renewal_status: renewalStatus,
        beneficiary: beneficiary.trim() || undefined
      });

      // 2. Upload Document if attached
      if (file) {
        await api.uploadDocument(createdFdr.id, file);
      }

      // Redirect directly to the newly evaluated record
      navigate(`/fdr/${createdFdr.id}`);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check inputs.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-navy-800">
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Register Fixed Deposit Receipt
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Submit deposit certificate for cryptographic vaulting, extraction, and automated discrepancy checks.
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { num: 1, label: 'Deposit Details' },
          { num: 2, label: 'Document Evidence' },
          { num: 3, label: 'Review & Verify' },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
              step === s.num
                ? 'bg-primary-600/20 border-primary-500/40 text-white'
                : step > s.num
                ? 'bg-navy-900 border-emerald-500/30 text-emerald-400'
                : 'bg-navy-900 border-navy-800 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                step === s.num
                  ? 'bg-primary-500 text-white'
                  : step > s.num
                  ? 'bg-emerald-500 text-white'
                  : 'bg-navy-800 text-slate-400'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span className="text-xs font-semibold">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-navy-900/90 border border-navy-700/80 rounded-2xl p-6 sm:p-8 shadow-elevated">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Step 1: Institutional & Deposit Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Depositor Institution *
                </label>
                <select
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} - {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  FDR Reference Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. FDR-2024-90812"
                  value={fdrNumber}
                  onChange={(e) => setFdrNumber(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Issuing Bank Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. MG Road Branch"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Branch IFSC Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. SBIN0000813"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Principal Amount (INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 2500000"
                  value={principalAmount}
                  onChange={(e) => setPrincipalAmount(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Renewal Status
                </label>
                <select
                  value={renewalStatus}
                  onChange={(e) => setRenewalStatus(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="original">Original Deposit</option>
                  <option value="renewed">Renewed Deposit</option>
                  <option value="replacement">Replacement Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Issue Date *
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Maturity Date *
                </label>
                <input
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Step 2: Upload Supporting Evidence PDF
            </h3>
            <p className="text-xs text-slate-400">
              Upload the original fixed deposit receipt or scan. The platform computes an authoritative SHA-256 fingerprint and extracts structured attributes.
            </p>

            <div className="border-2 border-dashed border-navy-700 hover:border-primary-500 rounded-2xl p-8 text-center transition-all bg-navy-950/40">
              <input
                type="file"
                id="fdrPdfInput"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="fdrPdfInput" className="cursor-pointer flex flex-col items-center">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
                  <FileUp className="w-8 h-8" />
                </div>
                <span className="text-sm font-semibold text-slate-200">
                  {file ? file.name : "Click to select or drag PDF file here"}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Valid PDF document up to 25MB"}
                </span>
              </label>
            </div>

            {file && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Document staged for vaulting: {file.name}</span>
                </div>
                <span className="font-mono text-[11px]">Ready</span>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
              Step 3: Pre-submission Scrutiny
            </h3>
            <p className="text-xs text-slate-400">
              Verify submitted parameters prior to ledger anchoring and automated rule analysis.
            </p>

            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3 font-sans text-xs">
              <div className="flex justify-between border-b border-navy-800 pb-2">
                <span className="text-slate-400">FDR Reference:</span>
                <span className="font-mono font-bold text-white">{fdrNumber}</span>
              </div>
              <div className="flex justify-between border-b border-navy-800 pb-2">
                <span className="text-slate-400">Bank & Branch:</span>
                <span className="text-white">{bankName} ({branchName})</span>
              </div>
              <div className="flex justify-between border-b border-navy-800 pb-2">
                <span className="text-slate-400">IFSC Code:</span>
                <span className="font-mono text-white">{ifscCode}</span>
              </div>
              <div className="flex justify-between border-b border-navy-800 pb-2">
                <span className="text-slate-400">Principal Amount:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{parseFloat(principalAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b border-navy-800 pb-2">
                <span className="text-slate-400">Validity Period:</span>
                <span className="font-mono text-slate-200">{issueDate} → {maturityDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Attached Document:</span>
                <span className="font-mono text-indigo-300">{file ? file.name : "None"}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 pt-5 border-t border-navy-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl border border-navy-700 text-xs font-semibold text-slate-300 hover:bg-navy-800 flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-glow-primary transition-all"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-subtle transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? "Vaulting & Analyzing..." : "Confirm & Submit Deposit"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

