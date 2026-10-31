import pytest
from datetime import date, timedelta
from app.db.session import SessionLocal
from app.models.entities import User, FDRRecord, DocumentVersion, AuditChain, RiskFlag
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.services.audit.audit_service import (
    verify_full_audit_chain, record_audit_event, compute_event_hash, canonicalize_payload
)
from app.services.integrity.integrity_service import verify_document_version_integrity, create_tampered_test_copy
from app.services.risk.rule_engine import evaluate_fdr_rules

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_password_hashing():
    pwd = "SecureTestPassword123!"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    token = create_access_token(subject="user-uuid-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "user-uuid-123"

def test_audit_chain_integrity(db):
    is_valid, count, tampered_seq, msg = verify_full_audit_chain(db)
    assert is_valid is True
    assert count > 0
    assert tampered_seq is None

def test_audit_chain_tamper_detection(db):
    """Verifies that if an event payload is altered, verify_full_audit_chain flags it immediately."""
    # Find any event
    event = db.query(AuditChain).first()
    if event:
        original_payload = event.payload
        # Tamper payload in memory
        event.payload = '{"tampered":true}'
        db.commit()

        is_valid, count, tampered_seq, msg = verify_full_audit_chain(db)
        assert is_valid is False
        assert tampered_seq == event.sequence_number

        # Revert tampering
        event.payload = original_payload
        db.commit()

def test_document_integrity_and_tamper_simulation(db):
    ver = db.query(DocumentVersion).first()
    assert ver is not None
    # Check original
    res = verify_document_version_integrity(db, ver.id)
    assert res["status"] == "intact"
    assert res["recorded_hash"] == ver.file_hash

    # Check disposable tampered copy
    tamper_res = create_tampered_test_copy(db, ver.id)
    assert tamper_res["mismatch_detected"] is True
    assert tamper_res["status"] == "modified"

def test_fdr_discrepancy_detection(db):
    # Verify AIET-FDR-2024-MISMATCH has R2
    mismatch_fdr = db.query(FDRRecord).filter(FDRRecord.display_fdr_number == "AIET-FDR-2024-MISMATCH").first()
    assert mismatch_fdr is not None
    flags = [f.rule_id for f in mismatch_fdr.risk_flags]
    assert "R2" in flags # Amount mismatch

    # Verify duplicate reference has R1
    collision_fdr = db.query(FDRRecord).filter(FDRRecord.display_fdr_number == "AIET-COLLISION-99").all()
    assert len(collision_fdr) >= 2
    r1_found = any("R1" in [f.rule_id for f in fdr.risk_flags] for fdr in collision_fdr)
    assert r1_found is True

