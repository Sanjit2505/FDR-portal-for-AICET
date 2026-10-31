import csv
import io
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import FDRRecord, RiskFlag, AuditChain, User
from app.api.deps import get_current_user, require_roles
from app.services.audit.audit_service import record_audit_event

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

@router.get("/fdr/csv")
def export_fdrs_csv(
    institution_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(FDRRecord)
    if current_user.role == "institution_user":
        from app.models.entities import InstitutionMembership
        memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
        user_inst_ids = [m.institution_id for m in memberships]
        query = query.filter(FDRRecord.institution_id.in_(user_inst_ids))
    elif institution_id:
        query = query.filter(FDRRecord.institution_id == institution_id)

    records = query.order_by(FDRRecord.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Record ID", "Institution", "FDR Reference", "Normalized Reference",
        "Bank Name", "Branch", "IFSC Code", "Principal Amount", "Currency",
        "Issue Date", "Maturity Date", "Renewal Status", "Workflow Status",
        "Risk Score", "Risk Band", "Created At"
    ])

    for r in records:
        writer.writerow([
            r.id,
            r.institution.name if r.institution else "N/A",
            r.display_fdr_number,
            r.normalized_fdr_number,
            r.bank_name,
            r.branch_name,
            r.ifsc_code,
            f"{r.principal_amount:.2f}",
            r.currency,
            str(r.issue_date),
            str(r.maturity_date),
            r.renewal_status,
            r.workflow_status,
            f"{r.risk_score:.1f}",
            r.risk_band,
            str(r.created_at)
        ])

    record_audit_event(
        db=db,
        event_type="REPORT_EXPORTED_CSV",
        entity_type="FDRRecord",
        entity_id="ALL",
        payload={"report_type": "fdr_registry_csv", "records_count": len(records)},
        actor_id=current_user.id
    )

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=fdr_registry_{date.today()}.csv"}
    )

@router.get("/findings/csv")
def export_findings_csv(
    current_user: User = Depends(require_roles(["authorized_official", "admin"])),
    db: Session = Depends(get_db)
):
    findings = db.query(RiskFlag).order_by(RiskFlag.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Finding ID", "FDR Reference", "Institution", "Rule ID", "Rule Name",
        "Severity", "Status", "Explanation", "Expected Value", "Observed Value",
        "Suggested Action", "Created At"
    ])

    for f in findings:
        fdr = f.fdr_record
        inst = fdr.institution if fdr else None
        writer.writerow([
            f.id,
            fdr.display_fdr_number if fdr else "N/A",
            inst.name if inst else "N/A",
            f.rule_id,
            f.rule_name,
            f.severity,
            f.status,
            f.explanation,
            f.expected_value or "",
            f.observed_value or "",
            f.suggested_action or "",
            str(f.created_at)
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=risk_findings_{date.today()}.csv"}
    )

