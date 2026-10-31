import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Document, DocumentVersion, FDRRecord, User, Extraction
from app.schemas.schemas import DocumentResponse, DocumentVersionResponse, ExtractionResponse, IntegrityCheckResponse
from app.api.deps import get_current_user, verify_institution_access
from app.core.config import settings
from app.services.integrity.integrity_service import (
    calculate_sha256, verify_document_version_integrity, create_tampered_test_copy
)
from app.services.extraction.extraction_service import process_document_version
from app.services.risk.rule_engine import evaluate_fdr_rules
from app.services.audit.audit_service import record_audit_event

router = APIRouter(prefix="/documents", tags=["Document Vault"])

@router.post("/{fdr_id}/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    fdr_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRRecord).filter(FDRRecord.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")

    verify_institution_access(current_user, fdr.institution_id, db)

    # 1. Inspect file header signature (magic bytes: %PDF)
    contents = await file.read()
    if len(contents) < 5 or not contents.startswith(b"%PDF"):
        raise HTTPException(
            status_code=400,
            detail="File signature validation failed. Uploaded file must be a valid PDF document."
        )

    # Size limit (e.g. 25MB)
    if len(contents) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds maximum size limit of 25MB")

    # 2. Check if a document record already exists for this FDR (for versioning)
    existing_doc = db.query(Document).filter(Document.fdr_id == fdr.id).first()
    if existing_doc:
        doc = existing_doc
        new_version_num = doc.current_version + 1
        doc.current_version = new_version_num
    else:
        new_version_num = 1
        doc = Document(
            fdr_id=fdr.id,
            filename=file.filename or "fdr_certificate.pdf",
            current_version=new_version_num,
            mime_type="application/pdf",
            integrity_status="intact"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

    # 3. Store file securely outside public web root with randomized UUID
    storage_filename = f"{uuid.uuid4().hex}.pdf"
    storage_path = settings.DOCUMENTS_DIR / storage_filename
    with open(storage_path, "wb") as f_out:
        f_out.write(contents)

    # 4. Calculate SHA-256
    file_hash = calculate_sha256(storage_path)

    # 5. Create DocumentVersion record
    doc_version = DocumentVersion(
        document_id=doc.id,
        version_number=new_version_num,
        file_hash=file_hash,
        file_size=len(contents),
        storage_path=str(storage_path),
        original_filename=file.filename or "fdr_certificate.pdf",
        uploader_id=current_user.id,
        processing_status="pending"
    )
    db.add(doc_version)
    db.commit()
    db.refresh(doc_version)

    # 6. Record upload audit event
    record_audit_event(
        db=db,
        event_type="DOCUMENT_UPLOADED",
        entity_type="DocumentVersion",
        entity_id=doc_version.id,
        payload={
            "fdr_id": fdr.id,
            "document_id": doc.id,
            "version": new_version_num,
            "filename": doc_version.original_filename,
            "file_size": doc_version.file_size,
            "sha256_hash": file_hash
        },
        actor_id=current_user.id
    )

    # 7. Process extraction pipeline
    process_document_version(db=db, version_id=doc_version.id, actor_id=current_user.id)

    # 8. Run rule evaluation
    evaluate_fdr_rules(db=db, fdr_id=fdr.id, actor_id=current_user.id)
    db.refresh(doc)

    return get_document_response(doc, db)

def get_document_response(doc: Document, db: Session) -> DocumentResponse:
    versions_data = []
    versions = db.query(DocumentVersion).filter(DocumentVersion.document_id == doc.id).order_by(DocumentVersion.version_number.desc()).all()
    for v in versions:
        extractions = db.query(Extraction).filter(Extraction.document_version_id == v.id).all()
        ext_data = [
            ExtractionResponse(
                id=e.id,
                field_name=e.field_name,
                extracted_value=e.extracted_value,
                normalized_value=e.normalized_value,
                confidence=e.confidence,
                extraction_method=e.extraction_method,
                source_page=e.source_page,
                bounding_box=e.bounding_box,
                raw_context=e.raw_context,
                created_at=e.created_at
            ) for e in extractions
        ]
        versions_data.append(
            DocumentVersionResponse(
                id=v.id,
                version_number=v.version_number,
                file_hash=v.file_hash,
                file_size=v.file_size,
                original_filename=v.original_filename,
                upload_timestamp=v.upload_timestamp,
                processing_status=v.processing_status,
                extractions=ext_data
            )
        )

    return DocumentResponse(
        id=doc.id,
        fdr_id=doc.fdr_id,
        filename=doc.filename,
        current_version=doc.current_version,
        mime_type=doc.mime_type,
        integrity_status=doc.integrity_status,
        created_at=doc.created_at,
        versions=versions_data
    )

@router.get("/by-fdr/{fdr_id}", response_model=List[DocumentResponse])
def get_documents_by_fdr(
    fdr_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRRecord).filter(FDRRecord.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")
    verify_institution_access(current_user, fdr.institution_id, db)

    docs = db.query(Document).filter(Document.fdr_id == fdr_id).all()
    return [get_document_response(d, db) for d in docs]

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    fdr = db.query(FDRRecord).filter(FDRRecord.id == doc.fdr_id).first()
    if fdr:
        verify_institution_access(current_user, fdr.institution_id, db)

    return get_document_response(doc, db)

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    fdr = db.query(FDRRecord).filter(FDRRecord.id == doc.fdr_id).first()
    if fdr:
        verify_institution_access(current_user, fdr.institution_id, db)

    latest_version = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == doc.id
    ).order_by(DocumentVersion.version_number.desc()).first()

    if not latest_version or not Path(latest_version.storage_path).exists():
        raise HTTPException(status_code=404, detail="Physical document file missing on server")

    return FileResponse(
        path=latest_version.storage_path,
        media_type="application/pdf",
        filename=latest_version.original_filename
    )

@router.post("/versions/{version_id}/verify", response_model=IntegrityCheckResponse)
def verify_version(
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc_ver = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not doc_ver:
        raise HTTPException(status_code=404, detail="Document version not found")

    res = verify_document_version_integrity(db=db, version_id=version_id, actor_id=current_user.id)
    return IntegrityCheckResponse(**res)

@router.post("/versions/{version_id}/tamper-test")
def tamper_simulation(
    version_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Controlled live demonstration of tamper detection using a disposable copy."""
    try:
        res = create_tampered_test_copy(db=db, version_id=version_id, actor_id=current_user.id)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

