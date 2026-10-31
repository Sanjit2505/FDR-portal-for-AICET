from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.entities import Institution, FDRRecord, InstitutionMembership, User
from app.schemas.schemas import InstitutionResponse, InstitutionCreate
from app.api.deps import get_current_user, require_roles, verify_institution_access
from app.services.audit.audit_service import record_audit_event

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("", response_model=List[InstitutionResponse])
def get_institutions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["admin", "authorized_official"]:
        institutions = db.query(Institution).all()
    else:
        # User's memberships
        memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
        inst_ids = [m.institution_id for m in memberships]
        institutions = db.query(Institution).filter(Institution.id.in_(inst_ids)).all()

    result = []
    for inst in institutions:
        total_fdrs = db.query(func.count(FDRRecord.id)).filter(FDRRecord.institution_id == inst.id).scalar() or 0
        total_amount = db.query(func.sum(FDRRecord.principal_amount)).filter(FDRRecord.institution_id == inst.id).scalar() or 0.0
        
        result.append(InstitutionResponse(
            id=inst.id,
            code=inst.code,
            name=inst.name,
            state=inst.state,
            registration_number=inst.registration_number,
            email=inst.email,
            contact_phone=inst.contact_phone,
            created_at=inst.created_at,
            updated_at=inst.updated_at,
            total_fdrs=total_fdrs,
            total_amount=float(total_amount)
        ))
    return result

@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution(
    institution_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_institution_access(current_user, institution_id, db)
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    total_fdrs = db.query(func.count(FDRRecord.id)).filter(FDRRecord.institution_id == inst.id).scalar() or 0
    total_amount = db.query(func.sum(FDRRecord.principal_amount)).filter(FDRRecord.institution_id == inst.id).scalar() or 0.0

    return InstitutionResponse(
        id=inst.id,
        code=inst.code,
        name=inst.name,
        state=inst.state,
        registration_number=inst.registration_number,
        email=inst.email,
        contact_phone=inst.contact_phone,
        created_at=inst.created_at,
        updated_at=inst.updated_at,
        total_fdrs=total_fdrs,
        total_amount=float(total_amount)
    )

@router.post("", response_model=InstitutionResponse)
def create_institution(
    data: InstitutionCreate,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(Institution).filter(Institution.code == data.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Institution with code '{data.code}' already exists")

    inst = Institution(
        code=data.code.strip().upper(),
        name=data.name.strip(),
        state=data.state.strip(),
        registration_number=data.registration_number,
        email=data.email,
        contact_phone=data.contact_phone
    )
    db.add(inst)
    db.commit()
    db.refresh(inst)

    record_audit_event(
        db=db,
        event_type="INSTITUTION_CREATED",
        entity_type="Institution",
        entity_id=inst.id,
        payload={"code": inst.code, "name": inst.name, "state": inst.state},
        actor_id=current_user.id
    )

    return InstitutionResponse(
        id=inst.id,
        code=inst.code,
        name=inst.name,
        state=inst.state,
        registration_number=inst.registration_number,
        email=inst.email,
        contact_phone=inst.contact_phone,
        created_at=inst.created_at,
        updated_at=inst.updated_at,
        total_fdrs=0,
        total_amount=0.0
    )

