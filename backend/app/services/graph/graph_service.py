from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.entities import Institution, FDRRecord, Document, GraphEdge
import math

def build_relationship_graph(
    db: Session,
    institution_id: Optional[str] = None,
    fdr_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Constructs a deterministic, evidence-backed relationship graph
    of Institutions, FDR records, and Documents with typed edges.
    Calculates 2D layout positions so React Flow renders immediately and cleanly.
    """
    fdr_query = db.query(FDRRecord)
    if institution_id:
        fdr_query = fdr_query.filter(FDRRecord.institution_id == institution_id)
    if fdr_id:
        # Include target fdr and related fdrs
        target_fdr = db.query(FDRRecord).filter(FDRRecord.id == fdr_id).first()
        if target_fdr:
            fdr_query = fdr_query.filter(
                (FDRRecord.id == fdr_id) |
                (FDRRecord.normalized_fdr_number == target_fdr.normalized_fdr_number) |
                (FDRRecord.previous_fdr_id == fdr_id) |
                (FDRRecord.id == target_fdr.previous_fdr_id)
            )

    fdrs: List[FDRRecord] = fdr_query.all()
    institution_ids = {f.institution_id for f in fdrs}
    institutions = db.query(Institution).filter(Institution.id.in_(institution_ids)).all() if institution_ids else []
    fdr_ids = [f.id for f in fdrs]
    documents = db.query(Document).filter(Document.fdr_id.in_(fdr_ids)).all() if fdr_ids else []

    nodes = []
    edges = []

    # Position calculations (circular / layered)
    # 1. Institution Nodes (Center/Top)
    inst_count = max(1, len(institutions))
    for idx, inst in enumerate(institutions):
        x = 350 * (idx - (inst_count - 1) / 2) + 500
        y = 100
        nodes.append({
            "id": f"inst_{inst.id}",
            "type": "institutionNode",
            "position": {"x": x, "y": y},
            "data": {
                "id": inst.id,
                "label": inst.name,
                "code": inst.code,
                "state": inst.state,
                "type": "institution",
                "details": f"Institution Code: {inst.code} | State: {inst.state}"
            }
        })

    # 2. FDR Nodes (Middle layer)
    fdr_count = max(1, len(fdrs))
    for idx, fdr in enumerate(fdrs):
        x = 280 * (idx - (fdr_count - 1) / 2) + 500
        y = 320
        nodes.append({
            "id": f"fdr_{fdr.id}",
            "type": "fdrNode",
            "position": {"x": x, "y": y},
            "data": {
                "id": fdr.id,
                "label": fdr.display_fdr_number,
                "bank": fdr.bank_name,
                "amount": fdr.principal_amount,
                "risk_score": fdr.risk_score,
                "risk_band": fdr.risk_band,
                "workflow_status": fdr.workflow_status,
                "renewal_status": fdr.renewal_status,
                "type": "fdr",
                "details": f"Bank: {fdr.bank_name} | Amount: ₹{fdr.principal_amount:,.2f} | Status: {fdr.workflow_status}"
            }
        })

        # Connect Institution to FDR
        edges.append({
            "id": f"edge_inst_{fdr.institution_id}_fdr_{fdr.id}",
            "source": f"inst_{fdr.institution_id}",
            "target": f"fdr_{fdr.id}",
            "label": "issued_by",
            "type": "smoothstep",
            "animated": False,
            "data": {
                "relationship_type": "institution_ownership",
                "explanation": f"FDR {fdr.display_fdr_number} was officially submitted under {fdr.institution.name if fdr.institution else 'Institution'}.",
                "matched_fields": {"institution_id": fdr.institution_id}
            }
        })

    # 3. Document Nodes (Bottom layer)
    doc_count = max(1, len(documents))
    for idx, doc in enumerate(documents):
        x = 220 * (idx - (doc_count - 1) / 2) + 500
        y = 550
        nodes.append({
            "id": f"doc_{doc.id}",
            "type": "documentNode",
            "position": {"x": x, "y": y},
            "data": {
                "id": doc.id,
                "label": doc.filename,
                "version": doc.current_version,
                "integrity_status": doc.integrity_status,
                "type": "document",
                "details": f"Version: {doc.current_version} | Integrity: {doc.integrity_status}"
            }
        })

        # Connect FDR to Document
        edges.append({
            "id": f"edge_fdr_{doc.fdr_id}_doc_{doc.id}",
            "source": f"fdr_{doc.fdr_id}",
            "target": f"doc_{doc.id}",
            "label": "has_evidence",
            "type": "smoothstep",
            "animated": False,
            "data": {
                "relationship_type": "supporting_evidence",
                "explanation": f"Document '{doc.filename}' uploaded as primary proof for FDR record.",
                "matched_fields": {"document_id": doc.id, "integrity_status": doc.integrity_status}
            }
        })

    # 4. Cross-FDR Relationships (Duplicate reference, Renewal, Replacement)
    for i, f1 in enumerate(fdrs):
        for f2 in fdrs[i+1:]:
            # Duplicate / Identical Reference
            if f1.normalized_fdr_number == f2.normalized_fdr_number:
                is_renewal = (f1.previous_fdr_id == f2.id or f2.previous_fdr_id == f1.id)
                rel_type = "declared_renewal" if is_renewal else "duplicate_reference_collision"
                is_danger = not is_renewal

                edges.append({
                    "id": f"edge_rel_{f1.id}_{f2.id}",
                    "source": f"fdr_{f1.id}",
                    "target": f"fdr_{f2.id}",
                    "label": "Renewal Chain" if is_renewal else "Duplicate Collision",
                    "type": "bezier",
                    "animated": is_danger,
                    "style": {"stroke": "#ef4444" if is_danger else "#3b82f6", "strokeWidth": 2},
                    "data": {
                        "relationship_type": rel_type,
                        "explanation": (
                            f"Authorized renewal linkage between {f1.display_fdr_number} and {f2.display_fdr_number}."
                            if is_renewal else
                            f"CRITICAL DISCREPANCY: Exact normalized reference collision '{f1.normalized_fdr_number}' across separate records without declared renewal chain."
                        ),
                        "matched_fields": {
                            "normalized_fdr_number": f1.normalized_fdr_number,
                            "f1_institution": f1.institution_id,
                            "f2_institution": f2.institution_id
                        }
                    }
                })

            # Explicit previous_fdr_id link
            elif f1.previous_fdr_id == f2.id or f2.previous_fdr_id == f1.id:
                edges.append({
                    "id": f"edge_renewal_{f1.id}_{f2.id}",
                    "source": f"fdr_{f1.id}",
                    "target": f"fdr_{f2.id}",
                    "label": "Previous FDR Link",
                    "type": "bezier",
                    "animated": False,
                    "style": {"stroke": "#10b981", "strokeWidth": 2},
                    "data": {
                        "relationship_type": "declared_renewal",
                        "explanation": f"Record links to previous FDR identifier {f2.display_fdr_number if f1.previous_fdr_id == f2.id else f1.display_fdr_number}.",
                        "matched_fields": {"previous_fdr_id": f2.id if f1.previous_fdr_id == f2.id else f1.id}
                    }
                })

    return {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "fdr_count": len(fdrs),
            "institution_count": len(institutions),
            "document_count": len(documents)
        }
    }

