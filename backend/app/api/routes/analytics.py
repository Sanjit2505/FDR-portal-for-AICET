from datetime import date, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.entities import (
    FDRRecord, Institution, RiskFlag, InvestigationCase,
    Document, AuditChain, User
)
from app.schemas.schemas import DashboardSummaryResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Dashboard Analytics"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    in_30_days = today + timedelta(days=30)

    # Scoping for institution user
    fdr_query = db.query(FDRRecord)
    if current_user.role == "institution_user":
        from app.models.entities import InstitutionMembership
        memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
        user_inst_ids = [m.institution_id for m in memberships]
        fdr_query = fdr_query.filter(FDRRecord.institution_id.in_(user_inst_ids))

    total_fdrs = fdr_query.count()
    total_inst = db.query(Institution).count() if current_user.role != "institution_user" else len(user_inst_ids)
    total_amount = fdr_query.with_entities(func.sum(FDRRecord.principal_amount)).scalar() or 0.0

    # Risk findings
    open_findings = db.query(RiskFlag).filter(RiskFlag.status == "open").count()
    high_findings = db.query(RiskFlag).filter(
        RiskFlag.status == "open",
        RiskFlag.severity.in_(["high", "critical"])
    ).count()

    # Cases
    open_cases = db.query(InvestigationCase).filter(InvestigationCase.status.in_(["new", "under_review", "awaiting_information", "escalated"])).count()

    # Upcoming maturities in 30 days
    upcoming_30 = fdr_query.filter(
        FDRRecord.maturity_date >= today,
        FDRRecord.maturity_date <= in_30_days
    ).count()

    # Overdue actions: past maturity without resolved status
    overdue_actions = fdr_query.filter(
        FDRRecord.maturity_date < today,
        FDRRecord.workflow_status.notin_(["resolved", "verified"])
    ).count()

    # Integrity failures
    integrity_failures = db.query(Document).filter(Document.integrity_status.in_(["modified", "missing"])).count()

    # Findings by rule distribution
    rule_counts = (
        db.query(RiskFlag.rule_id, RiskFlag.rule_name, func.count(RiskFlag.id))
        .filter(RiskFlag.status == "open")
        .group_by(RiskFlag.rule_id, RiskFlag.rule_name)
        .all()
    )
    findings_by_rule = [
        {"rule_id": r[0], "rule_name": r[1], "count": r[2]}
        for r in rule_counts
    ]

    # Maturity distribution buckets
    m_past = fdr_query.filter(FDRRecord.maturity_date < today).count()
    m_7d = fdr_query.filter(FDRRecord.maturity_date >= today, FDRRecord.maturity_date <= today + timedelta(days=7)).count()
    m_30d = fdr_query.filter(FDRRecord.maturity_date > today + timedelta(days=7), FDRRecord.maturity_date <= today + timedelta(days=30)).count()
    m_60d = fdr_query.filter(FDRRecord.maturity_date > today + timedelta(days=30), FDRRecord.maturity_date <= today + timedelta(days=60)).count()
    m_later = fdr_query.filter(FDRRecord.maturity_date > today + timedelta(days=60)).count()

    maturity_distribution = [
        {"bucket": "Overdue / Matured", "count": m_past, "fill": "#ef4444"},
        {"bucket": "Within 7 Days", "count": m_7d, "fill": "#f59e0b"},
        {"bucket": "8 to 30 Days", "count": m_30d, "fill": "#3b82f6"},
        {"bucket": "31 to 60 Days", "count": m_60d, "fill": "#6366f1"},
        {"bucket": "Beyond 60 Days", "count": m_later, "fill": "#10b981"},
    ]

    # Cases by status
    case_status_counts = (
        db.query(InvestigationCase.status, func.count(InvestigationCase.id))
        .group_by(InvestigationCase.status)
        .all()
    )
    cases_by_status = [
        {"status": s[0].replace("_", " ").title(), "count": s[1]}
        for s in case_status_counts
    ]

    # Recent activity from audit chain
    recent_audits = (
        db.query(AuditChain)
        .order_by(AuditChain.sequence_number.desc())
        .limit(10)
        .all()
    )
    recent_activity = [
        {
            "id": a.id,
            "sequence_number": a.sequence_number,
            "event_type": a.event_type,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "actor_name": a.actor.full_name if a.actor else "System",
            "timestamp": a.timestamp.isoformat() if a.timestamp else ""
        }
        for a in recent_audits
    ]

    return DashboardSummaryResponse(
        total_fdrs=total_fdrs,
        total_institutions=total_inst,
        total_principal_amount=float(total_amount),
        open_findings_count=open_findings,
        high_priority_findings=high_findings,
        open_cases_count=open_cases,
        upcoming_maturities_30d=upcoming_30,
        overdue_actions_count=overdue_actions,
        integrity_failures_count=integrity_failures,
        maturity_distribution=maturity_distribution,
        findings_by_rule=findings_by_rule,
        cases_by_status=cases_by_status,
        recent_activity=recent_activity
    )

