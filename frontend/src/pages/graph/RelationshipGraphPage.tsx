import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  GitFork, Building2, Receipt, FileText, X,
  ExternalLink, AlertTriangle, ShieldCheck, Search, ZoomIn, ZoomOut, Info
} from 'lucide-react';
import { api } from '../../services/api';
import { RiskBadge, StatusBadge } from '../../components/ui/Badges';

// Custom High-Craft Node Renderers
const InstitutionNode = ({ data }: any) => (
  <div className="px-4 py-3 rounded-2xl bg-[#0d1322] border-2 border-indigo-500/70 shadow-[0_8px_24px_rgba(0,0,0,0.6)] text-white min-w-[210px] backdrop-blur-md">
    <div className="flex items-center gap-2 mb-1">
      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
      <span className="font-mono text-[10px] text-indigo-300 font-bold uppercase">{data.code}</span>
    </div>
    <div className="font-bold text-xs truncate font-sans">{data.label}</div>
    <div className="text-[10px] text-slate-400 mt-0.5">{data.state}</div>
  </div>
);

const FDRNode = ({ data }: any) => {
  const isDanger = data.risk_band === 'critical' || data.risk_band === 'high';
  return (
    <div className={`px-4 py-3 rounded-2xl bg-[#0d1322] border-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] text-white min-w-[230px] transition-all backdrop-blur-md ${
      isDanger ? 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.25)]' : 'border-indigo-500/50'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-xs font-bold text-slate-100">{data.label}</span>
        </div>
        <RiskBadge band={data.risk_band} score={data.risk_score} />
      </div>
      <div className="text-[11px] text-slate-300 font-medium truncate font-sans">{data.bank}</div>
      <div className="text-[11px] font-mono font-bold text-emerald-400 mt-1">
        ₹{data.amount?.toLocaleString('en-IN')}
      </div>
    </div>
  );
};

const DocumentNode = ({ data }: any) => (
  <div className="px-3.5 py-2.5 rounded-xl bg-[#090e1a] border border-white/[0.1] text-slate-200 shadow-md min-w-[190px]">
    <div className="flex items-center gap-2">
      <FileText className="w-3.5 h-3.5 text-slate-400" />
      <span className="text-xs font-medium truncate font-sans">{data.label}</span>
    </div>
    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
      v{data.version} • {data.integrity_status?.toUpperCase()}
    </div>
  </div>
);

const nodeTypes = {
  institutionNode: InstitutionNode,
  fdrNode: FDRNode,
  documentNode: DocumentNode,
};

export const RelationshipGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fdrParam = searchParams.get('fdr_id');
  const instParam = searchParams.get('institution_id');

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState<any | null>(null);

  useEffect(() => {
    async function fetchGraph() {
      setLoading(true);
      try {
        const data = await api.getRelationshipGraph({
          institution_id: instParam || undefined,
          fdr_id: fdrParam || undefined,
        });

        const formattedEdges = data.edges.map((e: any) => ({
          ...e,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: e.style?.stroke || '#4f46e5',
            width: 14,
            height: 14,
          },
        }));

        setNodes(data.nodes);
        setEdges(formattedEdges);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [fdrParam, instParam]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedElement({ type: 'node', ...node });
  }, []);

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedElement({ type: 'edge', ...edge });
  }, []);

  return (
    <div className="space-y-4 h-[calc(100vh-130px)] flex flex-col">
      {/* Header with Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-400" />
            <span>Relationship Topology & Lineage Graph</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Trace entity networks, renewal lineages, and cross-institutional reference collisions
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400 rounded" />
            <span>Authorized Renewal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-rose-500 rounded animate-pulse" />
            <span className="text-rose-300">Reference Collision (R1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-indigo-500 rounded" />
            <span>Institution Link</span>
          </div>
        </div>
      </div>

      {/* Main Canvas + Detail Drawer */}
      <div className="flex-1 relative rounded-2xl border border-white/[0.08] bg-[#070b14] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-slate-400">
            Constructing graph topology from database...
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background color="#1e293b" gap={20} />
            <Controls className="!bg-[#0c1322] !border-white/[0.1] !text-white [&>button]:!fill-white [&>button]:!border-white/[0.1] !rounded-xl overflow-hidden" />
          </ReactFlow>
        )}

        {/* Selected Element Context Drawer */}
        {selectedElement && (
          <div className="absolute top-4 right-4 w-84 bg-[#0d1322]/95 border border-white/[0.1] rounded-2xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl z-20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                {selectedElement.type === 'node' ? 'Entity Details' : 'Relationship Rationale'}
              </span>
              <button
                onClick={() => setSelectedElement(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedElement.type === 'node' ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-mono block">Node Reference</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {selectedElement.data.label}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-200">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase mb-1">Attributes</span>
                  <p className="leading-relaxed">{selectedElement.data.details}</p>
                </div>

                {selectedElement.data.type === 'fdr' && (
                  <button
                    onClick={() => navigate(`/fdr/${selectedElement.data.id}`)}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(99,102,241,0.3)] transition-all"
                  >
                    <span>Open Record Dossier</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-mono block">Link Type</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {selectedElement.data.relationship_type}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <span className="text-slate-400 block text-[10px] font-mono uppercase mb-1">Evidence Explanation</span>
                  <p className="text-slate-200 leading-relaxed text-[11.5px]">{selectedElement.data.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
