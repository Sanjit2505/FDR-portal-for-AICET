import re
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.db.session import get_db
from app.models.entities import FDRRecord, Institution, Document, RiskFlag, User
from app.schemas.schemas import FDRResponse, FDRCreate, FDRUpdate
from app.api.deps import get_current_user, verify_institution_access
from app.services.risk.rule_engine import evaluate_fdr_rules
from app.services.audit.audit_service import record_audit_event

router = APIRouter(prefix="/fdr", tags=["FDR Registry"])

def normalize_ref(ref: str) -> str:
    """Canonical alphanumeric normalization of FDR reference."""
    return re.sub(r'[^A-Z0-9]', '', ref.upper().strip())

@router.get("", response_model=List[FDRResponse])
def list_fdrs(
    institution_id: Optional[str] = Query(None),
    bank_name: Optional[str] = Query(None),
    workflow_status: Optional[str] = Query(None),
    risk_band: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FDRRecord)

    # Institution user scope restriction
    if current_user.role == "institution_user":
        from app.models.entities import InstitutionMembership
        memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
        user_inst_ids = [m.institution_id for m in memberships]
        query = query.filter(FDRRecord.institution_id.in_(user_inst_ids))
    elif institution_id:
        query = query.filter(FDRRecord.institution_id == institution_id)

    if bank_name:
        query = query.filter(FDRRecord.bank_name.ilike(f"%{bank_name}%"))
    if workflow_status:
        query = query.filter(FDRRecord.workflow_status == workflow_status)
    if risk_band:
        query = query.filter(FDRRecord.risk_band == risk_band)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                FDRRecord.display_fdr_number.ilike(search_filter),
                FDRRecord.bank_name.ilike(search_filter),
                FDRRecord.branch_name.ilike(search_filter),
                FDRRecord.ifsc_code.ilike(search_filter)
            )
        )

    records = query.order_by(FDRRecord.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for r in records:
        doc_count = db.query(func.count(Document.id)).filter(Document.fdr_id == r.id).scalar() or 0
        open_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.fdr_id == r.id, RiskFlag.status == "open").scalar() or 0
        inst_name = r.institution.name if r.institution else None
        
        result.append(FDRResponse(
            id=r.id,
            institution_id=r.institution_id,
            institution_name=inst_name,
            normalized_fdr_number=r.normalized_fdr_number,
            display_fdr_number=r.display_fdr_number,
            bank_name=r.bank_name,
            branch_name=r.branch_name,
            ifsc_code=r.ifsc_code,
            principal_amount=r.principal_amount,
            currency=r.currency,
            issue_date=r.issue_date,
            maturity_date=r.maturity_date,
            renewal_status=r.renewal_status,
            previous_fdr_id=r.previous_fdr_id,
            replacement_fdr_id=r.replacement_fdr_id,
            beneficiary=r.beneficiary,
            workflow_status=r.workflow_status,
            risk_score=r.risk_score,
            risk_band=r.risk_band,
            created_by=r.created_by,
            created_at=r.created_at,
            updated_at=r.updated_at,
            documents_count=doc_count,
            open_findings_count=open_flags
        ))
    return result

@router.post("", response_model=FDRResponse, status_code=status.HTTP_201_CREATED)
def create_fdr(
    data: FDRCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_institution_access(current_user, data.institution_id, db)

    # Validations
    if data.maturity_date <= data.issue_date:
        raise HTTPException(status_code=400, detail="Maturity date must be strictly after the issue date")
    if data.principal_amount <= 0:
        raise HTTPException(status_code=400, detail="Principal amount must be greater than zero")

    normalized = normalize_ref(data.display_fdr_number)
    if not normalized:
        raise HTTPException(status_code=400, detail="FDR reference must contain valid alphanumeric characters")

    fdr = FDRRecord(
        institution_id=data.institution_id,
        normalized_fdr_number=normalized,
        display_fdr_number=data.display_fdr_number.strip(),
        bank_name=data.bank_name.strip(),
        branch_name=data.branch_name.strip(),
        ifsc_code=data.ifsc_code.strip().upper(),
        principal_amount=data.principal_amount,
        currency=data.currency or "INR",
        issue_date=data.issue_date,
        maturity_date=data.maturity_date,
        renewal_status=data.renewal_status or "original",
        previous_fdr_id=data.previous_fdr_id,
        replacement_fdr_id=data.replacement_fdr_id,
        beneficiary=data.beneficiary,
        workflow_status="submitted",
        created_by=current_user.id
    )

    db.add(fdr)
    db.commit()
    db.refresh(fdr)

    # Run immediate rule evaluation
    evaluate_fdr_rules(db=db, fdr_id=fdr.id, actor_id=current_user.id)
    db.refresh(fdr)

    # Record in audit trail
    record_audit_event(
        db=db,
        event_type="FDR_RECORD_CREATED",
        entity_type="FDRRecord",
        entity_id=fdr.id,
        payload={
            "fdr_number": fdr.display_fdr_number,
            "normalized_fdr_number": fdr.normalized_fdr_number,
            "institution_id": fdr.institution_id,
            "amount": fdr.principal_amount,
            "bank": fdr.bank_name,
            "issue_date": str(fdr.issue_date),
            "maturity_date": str(fdr.maturity_date)
        },
        actor_id=current_user.id
    )

    inst = db.query(Institution).filter(Institution.id == fdr.institution_id).first()
    return FDRResponse(
        id=fdr.id,
        institution_id=fdr.institution_id,
        institution_name=inst.name if inst else None,
        normalized_fdr_number=fdr.normalized_fdr_number,
        display_fdr_number=fdr.display_fdr_number,
        bank_name=fdr.bank_name,
        branch_name=fdr.branch_name,
        ifsc_code=fdr.ifsc_code,
        principal_amount=fdr.principal_amount,
        currency=fdr.currency,
        issue_date=fdr.issue_date,
        maturity_date=fdr.maturity_date,
        renewal_status=fdr.renewal_status,
        previous_fdr_id=fdr.previous_fdr_id,
        replacement_fdr_id=fdr.replacement_fdr_id,
        beneficiary=fdr.beneficiary,
        workflow_status=fdr.workflow_status,
        risk_score=fdr.risk_score,
        risk_band=fdr.risk_band,
        created_by=fdr.created_by,
        created_at=fdr.created_at,
        updated_at=fdr.updated_at,
        documents_count=0,
        open_findings_count=len([f for f in fdr.risk_flags if f.status == "open"])
    )

@router.get("/{fdr_id}", response_model=FDRResponse)
def get_fdr(
    fdr_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRRecord).filter(FDRRecord.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")

    verify_institution_access(current_user, fdr.institution_id, db)

    doc_count = db.query(func.count(Document.id)).filter(Document.fdr_id == fdr.id).scalar() or 0
    open_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.fdr_id == fdr.id, RiskFlag.status == "open").scalar() or 0
    inst_name = fdr.institution.name if fdr.institution else None

    return FDRResponse(
        id=fdr.id,
        institution_id=fdr.institution_id,
        institution_name=inst_name,
        normalized_fdr_number=fdr.normalized_fdr_number,
        display_fdr_number=fdr.display_fdr_number,
        bank_name=fdr.bank_name,
        branch_name=fdr.branch_name,
        ifsc_code=fdr.ifsc_code,
        principal_amount=fdr.principal_amount,
        currency=fdr.currency,
        issue_date=fdr.issue_date,
        maturity_date=fdr.maturity_date,
        renewal_status=fdr.renewal_status,
        previous_fdr_id=fdr.previous_fdr_id,
        replacement_fdr_id=fdr.replacement_fdr_id,
        beneficiary=fdr.beneficiary,
        workflow_status=fdr.workflow_status,
        risk_score=fdr.risk_score,
        risk_band=fdr.risk_band,
        created_by=fdr.created_by,
        created_at=fdr.created_at,
        updated_at=fdr.updated_at,
        documents_count=doc_count,
        open_findings_count=open_flags
    )

@router.put("/{fdr_id}", response_model=FDRResponse)
def update_fdr(
    fdr_id: str,
    data: FDRUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRRecord).filter(FDRRecord.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")

    verify_institution_access(current_user, fdr.institution_id, db)

    changes = {}
    if data.display_fdr_number:
        fdr.display_fdr_number = data.display_fdr_number.strip()
        fdr.normalized_fdr_number = normalize_ref(data.display_fdr_number)
        changes["fdr_number"] = fdr.display_fdr_number
    if data.bank_name:
        fdr.bank_name = data.bank_name.strip()
        changes["bank_name"] = fdr.bank_name
    if data.branch_name:
        fdr.branch_name = data.branch_name.strip()
        changes["branch_name"] = fdr.branch_name
    if data.ifsc_code:
        fdr.ifsc_code = data.ifsc_code.strip().upper()
        changes["ifsc_code"] = fdr.ifsc_code
    if data.principal_amount is not None:
        fdr.principal_amount = data.principal_amount
        changes["principal_amount"] = fdr.principal_amount
    if data.issue_date:
        fdr.issue_date = data.issue_date
        changes["issue_date"] = str(fdr.issue_date)
    if data.maturity_date:
        fdr.maturity_date = data.maturity_date
        changes["maturity_date"] = str(fdr.maturity_date)
    if data.renewal_status:
        fdr.renewal_status = data.renewal_status
        changes["renewal_status"] = fdr.renewal_status
    if data.workflow_status and current_user.role in ["admin", "authorized_official"]:
        fdr.workflow_status = data.workflow_status
        changes["workflow_status"] = fdr.workflow_status

    db.commit()
    evaluate_fdr_rules(db=db, fdr_id=fdr.id, actor_id=current_user.id)
    db.refresh(fdr)

    record_audit_event(
        db=db,
        event_type="FDR_RECORD_UPDATED",
        entity_type="FDRRecord",
        entity_id=fdr.id,
        payload={"changes": changes},
        actor_id=current_user.id
    )

    doc_count = db.query(func.count(Document.id)).filter(Document.fdr_id == fdr.id).scalar() or 0
    open_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.fdr_id == fdr.id, RiskFlag.status == "open").scalar() or 0

    return FDRResponse(
        id=fdr.id,
        institution_id=fdr.institution_id,
        institution_name=fdr.institution.name if fdr.institution else None,
        normalized_fdr_number=fdr.normalized_fdr_number,
        display_fdr_number=fdr.display_fdr_number,
        bank_name=fdr.bank_name,
        branch_name=fdr.branch_name,
        ifsc_code=fdr.ifsc_code,
        principal_amount=fdr.principal_amount,
        currency=fdr.currency,
        issue_date=fdr.issue_date,
        maturity_date=fdr.maturity_date,
        renewal_status=fdr.renewal_status,
        previous_fdr_id=fdr.previous_fdr_id,
        replacement_fdr_id=fdr.replacement_fdr_id,
        beneficiary=fdr.beneficiary,
        workflow_status=fdr.workflow_status,
        risk_score=fdr.risk_score,
        risk_band=fdr.risk_band,
        created_by=fdr.created_by,
        created_at=fdr.created_at,
        updated_at=fdr.updated_at,
        documents_count=doc_count,
        open_findings_count=open_flags
    )

@router.post("/{fdr_id}/re-evaluate", response_model=FDRResponse)
def re_evaluate_fdr(
    fdr_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRRecord).filter(FDRRecord.id == fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")

    verify_institution_access(current_user, fdr.institution_id, db)
    evaluate_fdr_rules(db=db, fdr_id=fdr.id, actor_id=current_user.id)
    db.refresh(fdr)

    doc_count = db.query(func.count(Document.id)).filter(Document.fdr_id == fdr.id).scalar() or 0
    open_flags = db.query(func.count(RiskFlag.id)).filter(RiskFlag.fdr_id == fdr.id, RiskFlag.status == "open").scalar() or 0

    return FDRResponse(
        id=fdr.id,
        institution_id=fdr.institution_id,
        institution_name=fdr.institution.name if fdr.institution else None,
        normalized_fdr_number=fdr.normalized_fdr_number,
        display_fdr_number=fdr.display_fdr_number,
        bank_name=fdr.bank_name,
        branch_name=fdr.branch_name,
        ifsc_code=fdr.ifsc_code,
        principal_amount=fdr.principal_amount,
        currency=fdr.currency,
        issue_date=fdr.issue_date,
        maturity_date=fdr.maturity_date,
        renewal_status=fdr.renewal_status,
        previous_fdr_id=fdr.previous_fdr_id,
        replacement_fdr_id=fdr.replacement_fdr_id,
        beneficiary=fdr.beneficiary,
        workflow_status=fdr.workflow_status,
        risk_score=fdr.risk_score,
        risk_band=fdr.risk_band,
        created_by=fdr.created_by,
        created_at=fdr.created_at,
        updated_at=fdr.updated_at,
        documents_count=doc_count,
        open_findings_count=open_flags
    )

