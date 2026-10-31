import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import (
    InvestigationCase, CaseAssignment, CaseNote, CaseEvent,
    FDRRecord, RiskFlag, User
)
from app.schemas.schemas import (
    CaseResponse, CaseCreate, CaseNoteCreate, CaseNoteResponse,
    CaseDecision, CaseStatusUpdate, CaseAssignmentUpdate, CaseEventResponse,
    RiskFlagResponse
)
from app.api.deps import get_current_user, require_roles
from app.services.audit.audit_service import record_audit_event

router = APIRouter(prefix="/cases", tags=["Investigation Cases"])

def format_case_response(case: InvestigationCase, db: Session) -> CaseResponse:
    fdr = case.fdr_record
    inst = case.institution
    assignee = case.assignee

    notes = [
        CaseNoteResponse(
            id=n.id,
            author_id=n.author_id,
            author_name=n.author.full_name if n.author else "Official",
            note_text=n.note_text,
            created_at=n.created_at
        ) for n in case.notes
    ]

    events = [
        CaseEventResponse(
            id=e.id,
            event_type=e.event_type,
            actor_id=e.actor_id,
            actor_name=e.actor.full_name if e.actor else "System",
            details=e.details,
            created_at=e.created_at
        ) for e in case.events
    ]

    flags = []
    if fdr:
        flags = [
            RiskFlagResponse(
                id=f.id,
                fdr_id=f.fdr_id,
                rule_id=f.rule_id,
                rule_name=f.rule_name,
                severity=f.severity,
                explanation=f.explanation,
                expected_value=f.expected_value,
                observed_value=f.observed_value,
                suggested_action=f.suggested_action,
                status=f.status,
                dismissed_reason=f.dismissed_reason,
                reviewed_by=f.reviewed_by,
                source_page=f.source_page,
                supporting_evidence=f.supporting_evidence,
                created_at=f.created_at,
                updated_at=f.updated_at,
                fdr_number=fdr.display_fdr_number,
                institution_name=inst.name if inst else None
            ) for f in fdr.risk_flags
        ]

    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        fdr_id=case.fdr_id,
        institution_id=case.institution_id,
        title=case.title,
        summary=case.summary,
        priority=case.priority,
        status=case.status,
        assigned_to=case.assigned_to,
        assignee_name=assignee.full_name if assignee else None,
        created_by=case.created_by,
        decision=case.decision,
        decision_notes=case.decision_notes,
        decided_at=case.decided_at,
        decided_by=case.decided_by,
        created_at=case.created_at,
        updated_at=case.updated_at,
        institution_name=inst.name if inst else None,
        fdr_number=fdr.display_fdr_number if fdr else None,
        notes=notes,
        events=events,
        risk_flags=flags
    )

@router.get("", response_model=List[CaseResponse])
def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(InvestigationCase)

    if current_user.role == "institution_user":
        from app.models.entities import InstitutionMembership
        memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
        user_inst_ids = [m.institution_id for m in memberships]
        query = query.filter(InvestigationCase.institution_id.in_(user_inst_ids))

    if status_filter:
        query = query.filter(InvestigationCase.status == status_filter)
    if priority_filter:
        query = query.filter(InvestigationCase.priority == priority_filter)

    cases = query.order_by(InvestigationCase.created_at.desc()).all()
    return [format_case_response(c, db) for c in cases]

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    data: CaseCreate,
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    fdr = db.query(FDRRecord).filter(FDRRecord.id == data.fdr_id).first()
    if not fdr:
        raise HTTPException(status_code=404, detail="FDR record not found")

    case_count = db.query(InvestigationCase).count()
    case_number = f"CASE-2026-{(case_count + 1):04d}"

    case = InvestigationCase(
        case_number=case_number,
        fdr_id=fdr.id,
        institution_id=fdr.institution_id,
        title=data.title.strip(),
        summary=data.summary.strip(),
        priority=data.priority,
        status="new",
        created_by=current_user.id,
        assigned_to=current_user.id
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    # Initial event
    event = CaseEvent(
        case_id=case.id,
        event_type="case_created",
        actor_id=current_user.id,
        details=f"Case opened by {current_user.full_name} with priority '{case.priority}'."
    )
    db.add(event)
    
    # Update FDR workflow status
    fdr.workflow_status = "investigating"
    db.commit()

    record_audit_event(
        db=db,
        event_type="INVESTIGATION_CASE_CREATED",
        entity_type="InvestigationCase",
        entity_id=case.id,
        payload={
            "case_number": case.case_number,
            "fdr_id": case.fdr_id,
            "priority": case.priority
        },
        actor_id=current_user.id
    )

    return format_case_response(case, db)

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return format_case_response(case, db)

@router.post("/{case_id}/notes", response_model=CaseResponse)
def add_note(
    case_id: str,
    note_in: CaseNoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not note_in.note_text.strip():
        raise HTTPException(status_code=400, detail="Note text cannot be empty")

    note = CaseNote(
        case_id=case.id,
        author_id=current_user.id,
        note_text=note_in.note_text.strip()
    )
    db.add(note)

    event = CaseEvent(
        case_id=case.id,
        event_type="note_added",
        actor_id=current_user.id,
        details=f"New note added by {current_user.full_name}."
    )
    db.add(event)
    db.commit()

    record_audit_event(
        db=db,
        event_type="CASE_NOTE_ADDED",
        entity_type="InvestigationCase",
        entity_id=case.id,
        payload={"note_preview": note.note_text[:80]},
        actor_id=current_user.id
    )

    return format_case_response(case, db)

@router.post("/{case_id}/status", response_model=CaseResponse)
def update_status(
    case_id: str,
    status_in: CaseStatusUpdate,
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    allowed_statuses = ["new", "under_review", "awaiting_information", "escalated", "resolved", "dismissed"]
    if status_in.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {allowed_statuses}")

    old_status = case.status
    case.status = status_in.status
    db.commit()

    event = CaseEvent(
        case_id=case.id,
        event_type="status_changed",
        actor_id=current_user.id,
        details=f"Status changed from '{old_status}' to '{case.status}'. Reason: {status_in.reason or 'None provided'}."
    )
    db.add(event)
    db.commit()

    record_audit_event(
        db=db,
        event_type="CASE_STATUS_UPDATED",
        entity_type="InvestigationCase",
        entity_id=case.id,
        payload={"from_status": old_status, "to_status": case.status, "reason": status_in.reason},
        actor_id=current_user.id
    )

    return format_case_response(case, db)

@router.post("/{case_id}/assign", response_model=CaseResponse)
def assign_case(
    case_id: str,
    assignment_in: CaseAssignmentUpdate,
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    assignee = db.query(User).filter(User.id == assignment_in.assigned_to).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")

    case.assigned_to = assignee.id
    db.commit()

    assignment_rec = CaseAssignment(
        case_id=case.id,
        assigned_to=assignee.id,
        assigned_by=current_user.id,
        notes=assignment_in.notes
    )
    db.add(assignment_rec)

    event = CaseEvent(
        case_id=case.id,
        event_type="case_assigned",
        actor_id=current_user.id,
        details=f"Case reassigned to {assignee.full_name} ({assignee.role})."
    )
    db.add(event)
    db.commit()

    record_audit_event(
        db=db,
        event_type="CASE_ASSIGNED",
        entity_type="InvestigationCase",
        entity_id=case.id,
        payload={"assignee_id": assignee.id, "assignee_name": assignee.full_name},
        actor_id=current_user.id
    )

    return format_case_response(case, db)

@router.post("/{case_id}/decision", response_model=CaseResponse)
def record_decision(
    case_id: str,
    decision_in: CaseDecision,
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    case = db.query(InvestigationCase).filter(InvestigationCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if not decision_in.decision_notes or len(decision_in.decision_notes.strip()) < 10:
        raise HTTPException(status_code=400, detail="Formal decision requires comprehensive notes (minimum 10 characters)")

    valid_decisions = [
        "verified_compliant",
        "discrepancy_confirmed",
        "corrected_and_closed",
        "dismissed_false_positive"
    ]
    if decision_in.decision not in valid_decisions:
        raise HTTPException(status_code=400, detail=f"Decision must be one of {valid_decisions}")

    case.decision = decision_in.decision
    case.decision_notes = decision_in.decision_notes.strip()
    case.decided_at = datetime.now(timezone.utc)
    case.decided_by = current_user.id
    case.status = "resolved"

    # If compliant or corrected, update FDR status
    if case.fdr_record:
        if decision_in.decision in ["verified_compliant", "corrected_and_closed"]:
            case.fdr_record.workflow_status = "resolved"
        elif decision_in.decision == "discrepancy_confirmed":
            case.fdr_record.workflow_status = "discrepant"

    event = CaseEvent(
        case_id=case.id,
        event_type="official_decision_recorded",
        actor_id=current_user.id,
        details=f"Official decision '{case.decision}' recorded by {current_user.full_name}. Verdict: {case.decision_notes}"
    )
    db.add(event)
    db.commit()

    record_audit_event(
        db=db,
        event_type="OFFICIAL_DECISION_RECORDED",
        entity_type="InvestigationCase",
        entity_id=case.id,
        payload={
            "decision": case.decision,
            "decision_notes": case.decision_notes,
            "decided_by": current_user.full_name
        },
        actor_id=current_user.id
    )

    return format_case_response(case, db)

