import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderLock, FileText, Search, ExternalLink, Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { FDRRecord, DocumentRecord } from '../../types';
import { IntegrityBadge } from '../../components/ui/Badges';

export const DocumentVaultPage: React.FC = () => {
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState<FDRRecord[]>([]);
  const [documents, setDocuments] = useState<Array<DocumentRecord & { fdr_number?: string; institution_name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const fdrList = await api.getFDRs();
        setFdrs(fdrList);

        const allDocs: any[] = [];
        for (const f of fdrList) {
          const docs = await api.getDocumentsByFDR(f.id);
          docs.forEach(d => {
            allDocs.push({
              ...d,
              fdr_number: f.display_fdr_number,
              institution_name: f.institution_name
            });
          });
        }
        setDocuments(allDocs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = documents.filter(d =>
    d.filename.toLowerCase().includes(search.toLowerCase()) ||
    (d.fdr_number && d.fdr_number.toLowerCase().includes(search.toLowerCase())) ||
    (d.institution_name && d.institution_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
            Cryptographic Document Vault
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable file repository with SHA-256 fingerprint verification and attribute extraction traces
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search document name, FDR reference, institution..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-navy-900 border border-navy-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Table */}
      <div className="bg-navy-900/80 border border-navy-700/70 rounded-2xl shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-800 bg-navy-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Document Name</th>
                <th className="py-3 px-4">Associated FDR</th>
                <th className="py-3 px-4">Institution</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">SHA-256 Fingerprint</th>
                <th className="py-3 px-4">Integrity Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-mono">
                    Loading cryptographic vault records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No documents stored in vault matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => {
                  const latestVer = doc.versions && doc.versions.length > 0 ? doc.versions[0] : null;
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-navy-850/60 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span className="font-medium text-slate-100 group-hover:text-primary-300 transition-colors truncate max-w-[200px]">
                            {doc.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">
                        {doc.fdr_number || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[180px] truncate">
                        {doc.institution_name || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        v{doc.current_version}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-300">
                        {latestVer ? `${latestVer.file_hash.slice(0, 16)}...` : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <IntegrityBadge status={doc.integrity_status} />
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                            title="Inspect Extraction & Hash"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={api.getDocumentDownloadUrl(doc.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
                            download
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

