import hashlib
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.entities import Document, DocumentVersion, AuditChain
from app.services.audit.audit_service import record_audit_event
from app.core.config import settings

def calculate_sha256(file_path: Path) -> str:
    """Computes SHA-256 hash of a file efficiently in chunks."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def verify_document_version_integrity(
    db: Session,
    version_id: str,
    actor_id: str = None
) -> Dict[str, Any]:
    """
    Verifies the cryptographic file hash of a stored document version.
    Returns status: 'intact', 'modified', 'missing', or 'error'.
    Records the audit event.
    """
    doc_version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not doc_version:
        return {
            "status": "error",
            "message": "Document version not found",
            "recorded_hash": "",
            "recomputed_hash": "",
            "verified_at": datetime.now(timezone.utc)
        }

    file_path = Path(doc_version.storage_path)
    now = datetime.now(timezone.utc)

    if not file_path.exists():
        status = "missing"
        explanation = f"Physical file missing at path: {file_path}"
        recomputed_hash = ""
    else:
        recomputed_hash = calculate_sha256(file_path)
        if recomputed_hash == doc_version.file_hash:
            status = "intact"
            explanation = "Cryptographic fingerprint matches recorded SHA-256 fingerprint exactly. File bytes are intact."
        else:
            status = "modified"
            explanation = f"Hash mismatch detected! Recorded: {doc_version.file_hash[:16]}... vs Recomputed: {recomputed_hash[:16]}..."

    # Update document model status
    if doc_version.document:
        doc_version.document.integrity_status = status
        db.commit()

    # Log audit event
    record_audit_event(
        db=db,
        event_type="DOCUMENT_INTEGRITY_VERIFIED",
        entity_type="DocumentVersion",
        entity_id=version_id,
        payload={
            "document_id": doc_version.document_id,
            "version_number": doc_version.version_number,
            "recorded_hash": doc_version.file_hash,
            "recomputed_hash": recomputed_hash,
            "status": status,
            "explanation": explanation
        },
        actor_id=actor_id
    )

    return {
        "document_id": doc_version.document_id,
        "version_id": doc_version.id,
        "original_filename": doc_version.original_filename,
        "recorded_hash": doc_version.file_hash,
        "recomputed_hash": recomputed_hash,
        "status": status,
        "file_size": doc_version.file_size,
        "verified_at": now,
        "explanation": explanation
    }

def create_tampered_test_copy(
    db: Session,
    version_id: str,
    actor_id: str = None
) -> Dict[str, Any]:
    """
    Controlled demonstration helper:
    Takes an existing document version, duplicates its file to a disposable test path,
    and alters bytes in the disposable copy to demonstrate hash mismatch detection
    WITHOUT corrupting the original document.
    """
    doc_version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not doc_version:
        raise ValueError("Document version not found")

    original_path = Path(doc_version.storage_path)
    if not original_path.exists():
        raise FileNotFoundError(f"Original file not found: {original_path}")

    disposable_filename = f"tampered_test_{doc_version.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.pdf"
    disposable_path = settings.TEMP_DIR / disposable_filename

    # Copy original file
    shutil.copyfile(original_path, disposable_path)

    # Intentionally append a modification marker
    with open(disposable_path, "ab") as f:
        f.write(b"\n%% TAMPER_SIMULATION_FLAG: MODIFIED_FOR_DEMONSTRATION %%\n")

    tampered_hash = calculate_sha256(disposable_path)

    record_audit_event(
        db=db,
        event_type="TAMPER_SIMULATION_EXECUTED",
        entity_type="DocumentVersion",
        entity_id=version_id,
        payload={
            "original_path": str(original_path),
            "disposable_path": str(disposable_path),
            "original_hash": doc_version.file_hash,
            "tampered_hash": tampered_hash,
            "note": "Controlled demonstration of file integrity mismatch without modifying original vault document"
        },
        actor_id=actor_id
    )

    return {
        "version_id": doc_version.id,
        "original_hash": doc_version.file_hash,
        "tampered_hash": tampered_hash,
        "disposable_file": str(disposable_path.name),
        "status": "modified",
        "mismatch_detected": True,
        "explanation": "Disposable test file successfully modified. Recomputed hash differs from recorded hash, confirming tamper detection."
    }

