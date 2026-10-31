import re
from datetime import date, datetime, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.entities import (
    FDRRecord, Document, DocumentVersion, Extraction,
    ValidationResult, RiskFlag, RuleConfiguration
)
from app.services.audit.audit_service import record_audit_event

DEFAULT_RULE_DEFINITIONS = [
    {
        "rule_id": "R1",
        "rule_name": "Duplicate Reference",
        "description": "Detects identical normalized FDR numbers across records or institutions.",
        "weight": 35.0,
        "is_enabled": True
    },
    {
        "rule_id": "R2",
        "rule_name": "Amount Mismatch",
        "description": "Detects discrepancy between submitted principal amount and extracted document amount.",
        "weight": 30.0,
        "is_enabled": True
    },
    {
        "rule_id": "R3",
        "rule_name": "Date Inconsistency",
        "description": "Detects inverted issue/maturity dates or mismatches with extracted document dates.",
        "weight": 25.0,
        "is_enabled": True
    },
    {
        "rule_id": "R4",
        "rule_name": "Missing Evidence",
        "description": "Detects FDRs without supporting documents or unextractable critical fields.",
        "weight": 20.0,
        "is_enabled": True
    },
    {
        "rule_id": "R5",
        "rule_name": "Overdue Action",
        "description": "Detects matured deposits requiring renewal or release confirmation.",
        "weight": 15.0,
        "is_enabled": True
    },
    {
        "rule_id": "R6",
        "rule_name": "Bank / IFSC Validation",
        "description": "Validates IFSC syntax and alignment with declared issuing bank.",
        "weight": 20.0,
        "is_enabled": True
    },
    {
        "rule_id": "R7",
        "rule_name": "Integrity Failure",
        "description": "Detects cryptographic hash mismatch or tampered document storage.",
        "weight": 40.0,
        "is_enabled": True
    },
    {
        "rule_id": "R8",
        "rule_name": "Signature / QR Verification",
        "description": "Detects missing authorization markers, signatory stamps, or verification tags.",
        "weight": 15.0,
        "is_enabled": True
    }
]

IFSC_PREFIX_MAP = {
    "SBIN": "STATE BANK OF INDIA",
    "HDFC": "HDFC BANK",
    "ICIC": "ICICI BANK",
    "PUNB": "PUNJAB NATIONAL BANK",
    "BARB": "BANK OF BARODA",
    "CNRB": "CANARA BANK",
    "UBIN": "UNION BANK OF INDIA",
    "UTIB": "AXIS BANK",
    "KKBK": "KOTAK MAHINDRA BANK",
    "INDB": "INDUSIND BANK"
}

def init_rule_configurations(db: Session):
    """Ensures all 8 rule configurations exist in the database."""
    for rule in DEFAULT_RULE_DEFINITIONS:
        existing = db.query(RuleConfiguration).filter(RuleConfiguration.rule_id == rule["rule_id"]).first()
        if not existing:
            cfg = RuleConfiguration(
                rule_id=rule["rule_id"],
                rule_name=rule["rule_name"],
                description=rule["description"],
                weight=rule["weight"],
                is_enabled=rule["is_enabled"]
            )
            db.add(cfg)
    db.commit()

def get_active_rule_weights(db: Session) -> Dict[str, float]:
    configs = db.query(RuleConfiguration).all()
    if not configs:
        init_rule_configurations(db)
        configs = db.query(RuleConfiguration).all()
    return {c.rule_id: c.weight for c in configs if c.is_enabled}

def evaluate_fdr_rules(db: Session, fdr_id: str, actor_id: str = None) -> List[RiskFlag]:
    """
    Evaluates all 8 deterministic rules against the FDR record and its evidence.
    Generates RiskFlag items, updates ValidationResult records,
    computes composite Review-Priority Risk Score (0-100),
    and logs an audit event.
    """
    fdr = db.query(FDRRecord).filter(FDRRecord.id == fdr_id).first()
    if not fdr:
        return []

    rule_weights = get_active_rule_weights(db)
    
    # Clean previous non-dismissed risk flags and validation results
    db.query(ValidationResult).filter(ValidationResult.fdr_id == fdr_id).delete()
    existing_dismissed_rules = {
        rf.rule_id for rf in db.query(RiskFlag).filter(
            RiskFlag.fdr_id == fdr_id,
            RiskFlag.status.in_(["dismissed", "overridden"])
        ).all()
    }
    db.query(RiskFlag).filter(RiskFlag.fdr_id == fdr_id, RiskFlag.status == "open").delete()

    generated_flags: List[RiskFlag] = []
    
    # Gather evidence
    documents = db.query(Document).filter(Document.fdr_id == fdr_id).all()
    extractions = db.query(Extraction).filter(Extraction.fdr_id == fdr_id).all()
    extraction_map: Dict[str, Extraction] = {e.field_name: e for e in extractions}

    # ----------------- R1: Duplicate Reference -----------------
    if "R1" in rule_weights:
        duplicate = db.query(FDRRecord).filter(
            FDRRecord.normalized_fdr_number == fdr.normalized_fdr_number,
            FDRRecord.id != fdr.id
        ).first()

        if duplicate:
            is_valid_renewal = (
                fdr.renewal_status in ["renewed", "replacement"] and 
                (fdr.previous_fdr_id == duplicate.id or duplicate.previous_fdr_id == fdr.id)
            )
            if not is_valid_renewal:
                flag = RiskFlag(
                    fdr_id=fdr.id,
                    rule_id="R1",
                    rule_name="Duplicate Reference",
                    severity="critical",
                    explanation=f"Normalized FDR number '{fdr.normalized_fdr_number}' is identical to existing record '{duplicate.display_fdr_number}' (ID: {duplicate.id[:8]}) without an authorized renewal linkage.",
                    expected_value="Unique FDR Reference",
                    observed_value=f"Duplicate of {duplicate.display_fdr_number}",
                    suggested_action="Verify institutional ownership and check whether this is an undeclared renewal or duplicate submission.",
                    status="open",
                    supporting_evidence=f"Conflicts with Record {duplicate.id} under Institution {duplicate.institution_id}"
                )
                generated_flags.append(flag)
                db.add(ValidationResult(
                    fdr_id=fdr.id, rule_id="R1", status="fail",
                    mismatch_field="fdr_number",
                    submitted_value=fdr.display_fdr_number,
                    extracted_value=duplicate.display_fdr_number,
                    details="Duplicate reference collision detected across records."
                ))
            else:
                db.add(ValidationResult(fdr_id=fdr.id, rule_id="R1", status="pass", details="Declared authorized renewal reference."))
        else:
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R1", status="pass", details="Unique reference confirmed."))

    # ----------------- R2: Amount Mismatch -----------------
    if "R2" in rule_weights:
        ext_amt_record = extraction_map.get("principal_amount")
        if ext_amt_record and ext_amt_record.normalized_value:
            try:
                extracted_amount = float(ext_amt_record.normalized_value)
                diff = abs(fdr.principal_amount - extracted_amount)
                if diff > 1.0: # Tolerance of ₹1.00
                    flag = RiskFlag(
                        fdr_id=fdr.id,
                        rule_id="R2",
                        rule_name="Amount Mismatch",
                        severity="high",
                        explanation=f"Submitted principal amount ₹{fdr.principal_amount:,.2f} does not match document extracted amount ₹{extracted_amount:,.2f} (Difference: ₹{diff:,.2f}).",
                        expected_value=f"₹{fdr.principal_amount:,.2f}",
                        observed_value=f"₹{extracted_amount:,.2f}",
                        suggested_action="Inspect the uploaded certificate to determine if amount was typed incorrectly or document values differ.",
                        status="open",
                        source_page=ext_amt_record.source_page,
                        supporting_evidence=ext_amt_record.raw_context
                    )
                    generated_flags.append(flag)
                    db.add(ValidationResult(
                        fdr_id=fdr.id, rule_id="R2", status="fail",
                        mismatch_field="principal_amount",
                        submitted_value=str(fdr.principal_amount),
                        extracted_value=str(extracted_amount),
                        details=f"Amount variance of ₹{diff:,.2f}"
                    ))
                else:
                    db.add(ValidationResult(fdr_id=fdr.id, rule_id="R2", status="pass", details="Submitted and extracted amounts match."))
            except ValueError:
                pass
        else:
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R2", status="warning", details="Principal amount could not be extracted from document for verification."))

    # ----------------- R3: Date Inconsistency -----------------
    if "R3" in rule_weights:
        date_errors = []
        if fdr.issue_date >= fdr.maturity_date:
            date_errors.append(f"Maturity date ({fdr.maturity_date}) cannot be on or prior to Issue date ({fdr.issue_date}).")
        
        ext_issue = extraction_map.get("issue_date")
        if ext_issue and ext_issue.normalized_value:
            try:
                ext_dt = datetime.strptime(ext_issue.normalized_value, "%Y-%m-%d").date()
                if ext_dt != fdr.issue_date:
                    date_errors.append(f"Submitted issue date ({fdr.issue_date}) differs from certificate issue date ({ext_dt}).")
            except Exception:
                pass

        if date_errors:
            flag = RiskFlag(
                fdr_id=fdr.id,
                rule_id="R3",
                rule_name="Date Inconsistency",
                severity="medium",
                explanation="; ".join(date_errors),
                expected_value=f"Issue: {fdr.issue_date}, Maturity: {fdr.maturity_date}",
                observed_value="Date ordering error or certificate date mismatch",
                suggested_action="Review deposit terms and correct recorded issue/maturity dates.",
                status="open",
                source_page=ext_issue.source_page if ext_issue else 1,
                supporting_evidence="Date chronology verification"
            )
            generated_flags.append(flag)
            db.add(ValidationResult(
                fdr_id=fdr.id, rule_id="R3", status="fail",
                mismatch_field="dates",
                details="; ".join(date_errors)
            ))
        else:
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R3", status="pass", details="Chronological dates are valid."))

    # ----------------- R4: Missing Evidence -----------------
    if "R4" in rule_weights:
        if not documents:
            flag = RiskFlag(
                fdr_id=fdr.id,
                rule_id="R4",
                rule_name="Missing Evidence",
                severity="high",
                explanation="No supporting FDR certificate or fixed deposit document has been uploaded.",
                expected_value="Uploaded PDF Certificate",
                observed_value="None",
                suggested_action="Upload a verified scan or digital copy of the FDR certificate.",
                status="open"
            )
            generated_flags.append(flag)
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R4", status="fail", details="Zero documents attached."))
        else:
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R4", status="pass", details=f"{len(documents)} document(s) attached."))

    # ----------------- R5: Overdue Action -----------------
    if "R5" in rule_weights:
        today = date.today()
        if fdr.maturity_date <= today and fdr.workflow_status not in ["resolved", "verified"]:
            flag = RiskFlag(
                fdr_id=fdr.id,
                rule_id="R5",
                rule_name="Overdue Action",
                severity="medium",
                explanation=f"Fixed deposit matured on {fdr.maturity_date} ({ (today - fdr.maturity_date).days } days ago). Required renewal or liquidation action is pending.",
                expected_value="Timely renewal or formal release confirmation",
                observed_value=f"Matured on {fdr.maturity_date}",
                suggested_action="Contact institution to obtain renewal FDR certificate or confirm release of security deposit.",
                status="open"
            )
            generated_flags.append(flag)
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R5", status="warning", details="Deposit past maturity without closed status."))
        else:
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R5", status="pass", details="Maturity date is future or deposit is resolved."))

    # ----------------- R6: Bank / IFSC Validation -----------------
    if "R6" in rule_weights:
        ifsc_regex = r'^[A-Z]{4}0[A-Z0-9]{6}$'
        if not re.match(ifsc_regex, fdr.ifsc_code):
            flag = RiskFlag(
                fdr_id=fdr.id,
                rule_id="R6",
                rule_name="Bank / IFSC Validation",
                severity="high",
                explanation=f"IFSC Code '{fdr.ifsc_code}' is syntactically invalid according to Reserve Bank of India standards (expected 4 alpha, 0, 6 alphanumeric).",
                expected_value="Valid 11-character RBI IFSC",
                observed_value=fdr.ifsc_code,
                suggested_action="Correct the branch IFSC code.",
                status="open"
            )
            generated_flags.append(flag)
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R6", status="fail", mismatch_field="ifsc_code", details="Invalid IFSC syntax."))
        else:
            # Check prefix against known banks
            prefix = fdr.ifsc_code[:4]
            if prefix in IFSC_PREFIX_MAP:
                expected_bank = IFSC_PREFIX_MAP[prefix]
                if expected_bank not in fdr.bank_name.upper() and fdr.bank_name.upper() not in expected_bank:
                    flag = RiskFlag(
                        fdr_id=fdr.id,
                        rule_id="R6",
                        rule_name="Bank / IFSC Validation",
                        severity="medium",
                        explanation=f"IFSC prefix '{prefix}' belongs to {expected_bank}, but declared bank name is '{fdr.bank_name}'.",
                        expected_value=expected_bank,
                        observed_value=fdr.bank_name,
                        suggested_action="Check if branch belongs to a merged bank or verify the correct issuing bank name.",
                        status="open"
                    )
                    generated_flags.append(flag)
                    db.add(ValidationResult(fdr_id=fdr.id, rule_id="R6", status="warning", mismatch_field="bank_name", details="Bank name and IFSC prefix mismatch."))
                else:
                    db.add(ValidationResult(fdr_id=fdr.id, rule_id="R6", status="pass", details="IFSC syntax and bank match verified."))
            else:
                db.add(ValidationResult(fdr_id=fdr.id, rule_id="R6", status="pass", details="Valid IFSC format."))

    # ----------------- R7: Integrity Failure -----------------
    if "R7" in rule_weights:
        tampered_docs = [d for d in documents if d.integrity_status in ["modified", "missing"]]
        if tampered_docs:
            flag = RiskFlag(
                fdr_id=fdr.id,
                rule_id="R7",
                rule_name="Integrity Failure",
                severity="critical",
                explanation=f"Cryptographic file hash verification failed for attached document(s): {', '.join([d.filename for d in tampered_docs])}. File bytes differ from vault SHA-256 fingerprint.",
                expected_value="Intact SHA-256 match",
                observed_value="Modified or missing file bytes",
                suggested_action="Quarantine file, review audit trail, and re-upload verified authentic source PDF.",
                status="open"
            )
            generated_flags.append(flag)
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R7", status="fail", mismatch_field="file_hash", details="Cryptographic integrity verification mismatch."))
        else:
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R7", status="pass", details="Stored document bytes match cryptographic hashes."))

    # ----------------- R8: Signature / QR Verification -----------------
    if "R8" in rule_weights:
        # Check if raw context contains stamps or signatures
        has_auth_indicator = any(
            re.search(r'(?:Branch Manager|Authorized Signatory|Verified|Official Stamp|QR Code|BarCode)', e.raw_context or '', re.IGNORECASE)
            for e in extractions
        )
        if documents and not has_auth_indicator:
            flag = RiskFlag(
                fdr_id=fdr.id,
                rule_id="R8",
                rule_name="Signature / QR Verification",
                severity="low",
                explanation="No explicit authorized signatory stamp or verification marker text detected in certificate text stream.",
                expected_value="Authorized signatory or official seal marker",
                observed_value="None detected in text stream",
                suggested_action="Visually verify bank official stamp and signature on document detail view.",
                status="open"
            )
            generated_flags.append(flag)
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R8", status="warning", details="Signatory markers not identified in extracted text."))
        else:
            db.add(ValidationResult(fdr_id=fdr.id, rule_id="R8", status="pass", details="Authentication / signatory markers identified."))

    # Save all newly generated flags
    for flag in generated_flags:
        # Don't re-add if already dismissed/overridden
        if flag.rule_id not in existing_dismissed_rules:
            db.add(flag)

    db.commit()

    # ----------------- Calculate Review-Priority Risk Score -----------------
    # Re-fetch all open flags for accurate score
    active_open_flags = db.query(RiskFlag).filter(RiskFlag.fdr_id == fdr_id, RiskFlag.status == "open").all()
    total_score = 0.0
    for flag in active_open_flags:
        total_score += rule_weights.get(flag.rule_id, 10.0)

    # Normalize 0 - 100
    risk_score = min(100.0, round(total_score, 1))
    
    if risk_score >= 70.0:
        risk_band = "critical"
    elif risk_score >= 45.0:
        risk_band = "high"
    elif risk_score >= 20.0:
        risk_band = "medium"
    else:
        risk_band = "low"

    fdr.risk_score = risk_score
    fdr.risk_band = risk_band
    
    # Auto-update workflow status if discrepancies are found
    if active_open_flags and fdr.workflow_status in ["submitted", "verified"]:
        fdr.workflow_status = "discrepant"
    elif not active_open_flags and fdr.workflow_status == "discrepant":
        fdr.workflow_status = "verified"

    db.commit()

    # Audit event
    record_audit_event(
        db=db,
        event_type="FDR_RISK_EVALUATED",
        entity_type="FDRRecord",
        entity_id=fdr.id,
        payload={
            "risk_score": risk_score,
            "risk_band": risk_band,
            "triggered_rules": [f.rule_id for f in active_open_flags],
            "open_flags_count": len(active_open_flags)
        },
        actor_id=actor_id
    )

    return active_open_flags

