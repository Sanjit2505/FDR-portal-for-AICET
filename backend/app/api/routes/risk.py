from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import RiskFlag, FDRRecord, RuleConfiguration, User
from app.schemas.schemas import RiskFlagResponse, RiskFindingAction, RuleConfigResponse, RuleConfigUpdate
from app.api.deps import get_current_user, require_roles
from app.services.risk.rule_engine import evaluate_fdr_rules
from app.services.audit.audit_service import record_audit_event

router = APIRouter(prefix="/risk", tags=["Risk & Discrepancies"])

@router.get("/findings", response_model=List[RiskFlagResponse])
def list_findings(
    rule_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    fdr_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(RiskFlag).join(FDRRecord)

    if current_user.role == "institution_user":
        from app.models.entities import InstitutionMembership
        memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
        user_inst_ids = [m.institution_id for m in memberships]
        query = query.filter(FDRRecord.institution_id.in_(user_inst_ids))

    if rule_id:
        query = query.filter(RiskFlag.rule_id == rule_id)
    if severity:
        query = query.filter(RiskFlag.severity == severity)
    if status:
        query = query.filter(RiskFlag.status == status)
    if fdr_id:
        query = query.filter(RiskFlag.fdr_id == fdr_id)

    findings = query.order_by(RiskFlag.created_at.desc()).limit(limit).all()

    result = []
    for f in findings:
        fdr = f.fdr_record
        result.append(RiskFlagResponse(
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
            fdr_number=fdr.display_fdr_number if fdr else None,
            institution_name=fdr.institution.name if fdr and fdr.institution else None
        ))
    return result

@router.get("/findings/{finding_id}", response_model=RiskFlagResponse)
def get_finding(
    finding_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    f = db.query(RiskFlag).filter(RiskFlag.id == finding_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    fdr = f.fdr_record
    return RiskFlagResponse(
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
        fdr_number=fdr.display_fdr_number if fdr else None,
        institution_name=fdr.institution.name if fdr and fdr.institution else None
    )

@router.post("/findings/{finding_id}/action", response_model=RiskFlagResponse)
def take_finding_action(
    finding_id: str,
    payload: RiskFindingAction,
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(status_code=400, detail="A recorded reason (minimum 5 characters) is required to modify finding status")

    flag = db.query(RiskFlag).filter(RiskFlag.id == finding_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Finding not found")

    action = payload.action.lower()
    if action not in ["dismiss", "override", "resolve"]:
        raise HTTPException(status_code=400, detail="Action must be 'dismiss', 'override', or 'resolve'")

    new_status = "dismissed" if action == "dismiss" else ("overridden" if action == "override" else "resolved")
    flag.status = new_status
    flag.dismissed_reason = payload.reason.strip()
    flag.reviewed_by = current_user.id
    db.commit()

    # Re-evaluate fdr score
    evaluate_fdr_rules(db=db, fdr_id=flag.fdr_id, actor_id=current_user.id)
    db.refresh(flag)

    record_audit_event(
        db=db,
        event_type=f"FINDING_{action.upper()}ED",
        entity_type="RiskFlag",
        entity_id=flag.id,
        payload={
            "fdr_id": flag.fdr_id,
            "rule_id": flag.rule_id,
            "action": action,
            "reason": payload.reason
        },
        actor_id=current_user.id
    )

    fdr = flag.fdr_record
    return RiskFlagResponse(
        id=flag.id,
        fdr_id=flag.fdr_id,
        rule_id=flag.rule_id,
        rule_name=flag.rule_name,
        severity=flag.severity,
        explanation=flag.explanation,
        expected_value=flag.expected_value,
        observed_value=flag.observed_value,
        suggested_action=flag.suggested_action,
        status=flag.status,
        dismissed_reason=flag.dismissed_reason,
        reviewed_by=flag.reviewed_by,
        source_page=flag.source_page,
        supporting_evidence=flag.supporting_evidence,
        created_at=flag.created_at,
        updated_at=flag.updated_at,
        fdr_number=fdr.display_fdr_number if fdr else None,
        institution_name=fdr.institution.name if fdr and fdr.institution else None
    )

@router.get("/rules", response_model=List[RuleConfigResponse])
def get_rules(db: Session = Depends(get_db)):
    from app.services.risk.rule_engine import init_rule_configurations
    init_rule_configurations(db)
    rules = db.query(RuleConfiguration).all()
    return rules

@router.put("/rules/{rule_id}", response_model=RuleConfigResponse)
def update_rule(
    rule_id: str,
    data: RuleConfigUpdate,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    rule = db.query(RuleConfiguration).filter(RuleConfiguration.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule configuration not found")

    if data.weight is not None:
        rule.weight = data.weight
    if data.is_enabled is not None:
        rule.is_enabled = data.is_enabled
    if data.parameters is not None:
        rule.parameters = data.parameters

    db.commit()
    db.refresh(rule)

    record_audit_event(
        db=db,
        event_type="RULE_CONFIG_UPDATED",
        entity_type="RuleConfiguration",
        entity_id=rule.id,
        payload={"rule_id": rule_id, "weight": rule.weight, "is_enabled": rule.is_enabled},
        actor_id=current_user.id
    )

    return rule

