from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import AuditChain, User
from app.schemas.schemas import AuditChainResponse, AuditVerifyResponse
from app.api.deps import get_current_user, require_roles
from app.services.audit.audit_service import verify_full_audit_chain

router = APIRouter(prefix="/audit", tags=["Hash-Chained Audit Trail"])

@router.get("/events", response_model=List[AuditChainResponse])
def get_audit_events(
    event_type: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditChain)
    if event_type:
        query = query.filter(AuditChain.event_type == event_type)
    if entity_type:
        query = query.filter(AuditChain.entity_type == entity_type)

    events = query.order_by(AuditChain.sequence_number.desc()).offset(offset).limit(limit).all()

    result = []
    for e in events:
        actor_name = e.actor.full_name if e.actor else "System"
        result.append(AuditChainResponse(
            id=e.id,
            sequence_number=e.sequence_number,
            event_id=e.event_id,
            actor_id=e.actor_id,
            actor_name=actor_name,
            event_type=e.event_type,
            entity_type=e.entity_type,
            entity_id=e.entity_id,
            payload=e.payload,
            previous_hash=e.previous_hash,
            current_hash=e.current_hash,
            timestamp=e.timestamp
        ))
    return result

@router.get("/verify-chain", response_model=AuditVerifyResponse)
def verify_audit_chain_endpoint(
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    is_valid, count, tampered_seq, message = verify_full_audit_chain(db)
    return AuditVerifyResponse(
        is_valid=is_valid,
        total_events=count,
        tampered_sequence=tampered_seq,
        message=message,
        verified_at=datetime.now(timezone.utc)
    )

