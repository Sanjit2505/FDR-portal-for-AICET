import sys
from pathlib import Path
from datetime import date

sys.path.append(str(Path(__file__).resolve().parent.parent))
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.db.session import SessionLocal
from app.models.entities import (
    User, Institution, FDRRecord, Document, DocumentVersion,
    RiskFlag, InvestigationCase, AuditChain
)
from app.core.security import verify_password
from app.services.audit.audit_service import verify_full_audit_chain
from app.services.integrity.integrity_service import verify_document_version_integrity, create_tampered_test_copy
from app.services.graph.graph_service import build_relationship_graph

def run_verification():
    print("=" * 65)
    print("FDR GUARDIAN - AUTOMATED END-TO-END VERIFICATION SUITE")
    print("=" * 65)

    db = SessionLocal()
    try:
        # 1. Users and Credentials
        print("\n[1/7] Testing Authentication and User Accounts...")
        users = db.query(User).all()
        assert len(users) >= 3, f"Expected at least 3 users, found {len(users)}"
        admin = db.query(User).filter(User.email == "admin@fdrguardian.internal").first()
        assert admin is not None, "Admin user missing"
        assert verify_password("Admin@Guardian2026", admin.hashed_password), "Admin password verification failed"
        print(f"  ✓ {len(users)} user accounts verified with PBKDF2-SHA256 password security.")

        # 2. Institutions
        print("\n[2/7] Testing Institutional Multitenancy...")
        institutions = db.query(Institution).all()
        assert len(institutions) >= 3, f"Expected 3 institutions, found {len(institutions)}"
        for inst in institutions:
            fdr_count = db.query(FDRRecord).filter(FDRRecord.institution_id == inst.id).count()
            print(f"  ✓ Institution: {inst.name} ({inst.code}) -> {fdr_count} FDR records")

        # 3. FDR Records & Discrepancy Detection
        print("\n[3/7] Testing FDR Records & Deterministic Rule Engine...")
        fdrs = db.query(FDRRecord).all()
        assert len(fdrs) >= 20, f"Expected >= 20 FDRs, found {len(fdrs)}"
        print(f"  ✓ Total FDR records stored: {len(fdrs)}")

        findings = db.query(RiskFlag).all()
        print(f"  ✓ Total risk findings generated: {len(findings)}")

        # Verify specific rule triggers
        rules_triggered = {f.rule_id for f in findings}
        expected_rules = {"R1", "R2", "R3", "R4", "R5", "R6"}
        for r in expected_rules:
            assert r in rules_triggered, f"Expected rule {r} to be triggered in synthetic dataset!"
            rule_flags = [f for f in findings if f.rule_id == r]
            print(f"  ✓ Rule {r} ({rule_flags[0].rule_name}): {len(rule_flags)} finding(s) detected.")

        # 4. Document Vault & SHA-256 Storage
        print("\n[4/7] Testing Document Vault & Extraction Traceability...")
        docs = db.query(Document).all()
        doc_vers = db.query(DocumentVersion).all()
        assert len(docs) > 0, "No documents found"
        print(f"  ✓ Stored {len(docs)} documents across {len(doc_vers)} version(s).")
        first_ver = doc_vers[0]
        intact_res = verify_document_version_integrity(db, first_ver.id)
        assert intact_res["status"] == "intact", f"Expected intact file, got: {intact_res['status']}"
        print(f"  ✓ Document '{first_ver.original_filename}' SHA-256 verified: {first_ver.file_hash[:16]}... (Status: INTACT)")

        # 5. Tamper Detection Controlled Simulation
        print("\n[5/7] Testing Cryptographic Tamper Detection...")
        tamper_res = create_tampered_test_copy(db, first_ver.id)
        assert tamper_res["mismatch_detected"] is True, "Tamper simulation failed to detect altered bytes"
        assert tamper_res["original_hash"] != tamper_res["tampered_hash"], "Hashes must differ for tampered copy"
        print(f"  ✓ Original Hash: {tamper_res['original_hash'][:16]}...")
        print(f"  ✓ Tampered Copy: {tamper_res['tampered_hash'][:16]}... (MISMATCH DETECTED - Quarantined)")

        # 6. Hash-Chained Audit Trail Integrity
        print("\n[6/7] Testing Cryptographic Hash-Chained Audit Trail...")
        audit_events = db.query(AuditChain).order_by(AuditChain.sequence_number.asc()).all()
        print(f"  ✓ Total sequential audit events recorded: {len(audit_events)}")
        is_valid, count, tampered_seq, msg = verify_full_audit_chain(db)
        assert is_valid is True, f"Audit chain verification failed: {msg}"
        print(f"  ✓ Full chain cryptographic verification passed: {msg}")

        # 7. Relationship Graph & Cases
        print("\n[7/7] Testing Relationship Graph & Investigation Cases...")
        graph = build_relationship_graph(db)
        assert graph["summary"]["total_nodes"] > 0, "Graph has no nodes"
        assert graph["summary"]["total_edges"] > 0, "Graph has no edges"
        print(f"  ✓ Graph Nodes: {graph['summary']['total_nodes']} | Graph Edges: {graph['summary']['total_edges']}")
        
        cases = db.query(InvestigationCase).all()
        assert len(cases) > 0, "No investigation cases found"
        print(f"  ✓ Investigation cases active: {len(cases)} (e.g. {cases[0].case_number} - Priority: {cases[0].priority})")

        print("\n" + "=" * 65)
        print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (7/7)")
        print("=" * 65)

    finally:
        db.close()

if __name__ == "__main__":
    run_verification()

