from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import FDRRecord, Notification, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/maturity", tags=["Maturity Planner"])

class ScenarioRequest(BaseModel):
    window_days: int = 30
    renewal_rate_pct: float = 80.0 # assumption % that will renew
    expected_interest_rate_pct: float = 6.5

@router.get("/planner")
def get_maturity_planner(
    institution_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = date.today()
    query = db.query(FDRRecord)

    if current_user.role == "institution_user":
        from app.models.entities import InstitutionMembership
        memberships = db.query(InstitutionMembership).filter(InstitutionMembership.user_id == current_user.id).all()
        user_inst_ids = [m.institution_id for m in memberships]
        query = query.filter(FDRRecord.institution_id.in_(user_inst_ids))
    elif institution_id:
        query = query.filter(FDRRecord.institution_id == institution_id)

    records = query.all()

    buckets = {
        "matured_past": [],
        "within_7_days": [],
        "within_30_days": [],
        "within_60_days": [],
        "future": []
    }

    totals = {
        "matured_past_amount": 0.0,
        "within_7_days_amount": 0.0,
        "within_30_days_amount": 0.0,
        "within_60_days_amount": 0.0,
        "future_amount": 0.0,
        "grand_total": 0.0
    }

    for r in records:
        days_remaining = (r.maturity_date - today).days
        item = {
            "id": r.id,
            "fdr_number": r.display_fdr_number,
            "institution_name": r.institution.name if r.institution else "N/A",
            "bank_name": r.bank_name,
            "principal_amount": r.principal_amount,
            "issue_date": str(r.issue_date),
            "maturity_date": str(r.maturity_date),
            "days_remaining": days_remaining,
            "workflow_status": r.workflow_status,
            "renewal_status": r.renewal_status,
            "risk_band": r.risk_band
        }

        totals["grand_total"] += r.principal_amount

        if days_remaining < 0:
            buckets["matured_past"].append(item)
            totals["matured_past_amount"] += r.principal_amount
        elif days_remaining <= 7:
            buckets["within_7_days"].append(item)
            totals["within_7_days_amount"] += r.principal_amount
        elif days_remaining <= 30:
            buckets["within_30_days"].append(item)
            totals["within_30_days_amount"] += r.principal_amount
        elif days_remaining <= 60:
            buckets["within_60_days"].append(item)
            totals["within_60_days_amount"] += r.principal_amount
        else:
            buckets["future"].append(item)
            totals["future_amount"] += r.principal_amount

    # Sort each bucket by maturity date
    for k in buckets:
        buckets[k].sort(key=lambda x: x["maturity_date"])

    return {
        "as_of_date": str(today),
        "totals": totals,
        "counts": {
            "matured_past": len(buckets["matured_past"]),
            "within_7_days": len(buckets["within_7_days"]),
            "within_30_days": len(buckets["within_30_days"]),
            "within_60_days": len(buckets["within_60_days"]),
            "future": len(buckets["future"]),
            "total_records": len(records)
        },
        "buckets": buckets
    }

@router.get("/notifications")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()

    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "link_url": n.link_url,
            "created_at": n.created_at
        } for n in notifs
    ]

@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"status": "success"}

@router.post("/scenario-analysis")
def run_scenario_analysis(
    req: ScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Scenario calculation:
    Calculates liquidity exposure and renewal projection for FDRs maturing within the configured window.
    Clearly designated as a deterministic mathematical calculation based on stored values and input assumptions.
    """
    today = date.today()
    cutoff_date = today + timedelta(days=req.window_days)

    records = db.query(FDRRecord).filter(
        FDRRecord.maturity_date >= today,
        FDRRecord.maturity_date <= cutoff_date
    ).all()

    total_maturing_principal = sum(r.principal_amount for r in records)
    projected_renewals_amount = total_maturing_principal * (req.renewal_rate_pct / 100.0)
    projected_liquidation_amount = total_maturing_principal - projected_renewals_amount
    estimated_annual_yield = projected_renewals_amount * (req.expected_interest_rate_pct / 100.0)

    return {
        "analysis_type": "Deterministic Maturity Liquidity Projection",
        "notice": "All figures are mathematical calculations based on recorded deposit balances and explicit scenario assumptions.",
        "input_assumptions": {
            "window_days": req.window_days,
            "cutoff_date": str(cutoff_date),
            "renewal_rate_pct": req.renewal_rate_pct,
            "expected_interest_rate_pct": req.expected_interest_rate_pct
        },
        "results": {
            "fdr_records_maturing": len(records),
            "total_maturing_principal": total_maturing_principal,
            "projected_renewals_amount": round(projected_renewals_amount, 2),
            "projected_liquidation_required": round(projected_liquidation_amount, 2),
            "estimated_annual_yield": round(estimated_annual_yield, 2)
        }
    }

