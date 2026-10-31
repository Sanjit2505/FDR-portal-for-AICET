from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# ----------------- User & Auth -----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "institution_user"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    institutions: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

# ----------------- Institution -----------------
class InstitutionBase(BaseModel):
    code: str
    name: str
    state: str
    registration_number: Optional[str] = None
    email: Optional[str] = None
    contact_phone: Optional[str] = None

class InstitutionCreate(InstitutionBase):
    pass

class InstitutionResponse(InstitutionBase):
    id: str
    created_at: datetime
    updated_at: datetime
    total_fdrs: Optional[int] = 0
    total_amount: Optional[float] = 0.0

    class Config:
        from_attributes = True

# ----------------- FDR Record -----------------
class FDRCreate(BaseModel):
    institution_id: str
    display_fdr_number: str
    bank_name: str
    branch_name: str
    ifsc_code: str
    principal_amount: float = Field(..., gt=0)
    currency: str = "INR"
    issue_date: date
    maturity_date: date
    renewal_status: str = "original" # original, renewed, replacement
    previous_fdr_id: Optional[str] = None
    replacement_fdr_id: Optional[str] = None
    beneficiary: Optional[str] = None

class FDRUpdate(BaseModel):
    display_fdr_number: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    principal_amount: Optional[float] = None
    issue_date: Optional[date] = None
    maturity_date: Optional[date] = None
    renewal_status: Optional[str] = None
    beneficiary: Optional[str] = None
    workflow_status: Optional[str] = None

class FDRResponse(BaseModel):
    id: str
    institution_id: str
    institution_name: Optional[str] = None
    normalized_fdr_number: str
    display_fdr_number: str
    bank_name: str
    branch_name: str
    ifsc_code: str
    principal_amount: float
    currency: str
    issue_date: date
    maturity_date: date
    renewal_status: str
    previous_fdr_id: Optional[str] = None
    replacement_fdr_id: Optional[str] = None
    beneficiary: Optional[str] = None
    workflow_status: str
    risk_score: float
    risk_band: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    documents_count: Optional[int] = 0
    open_findings_count: Optional[int] = 0

    class Config:
        from_attributes = True

# ----------------- Document & Extraction -----------------
class ExtractionResponse(BaseModel):
    id: str
    field_name: str
    extracted_value: Optional[str] = None
    normalized_value: Optional[str] = None
    confidence: float
    extraction_method: str
    source_page: int
    bounding_box: Optional[str] = None
    raw_context: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentVersionResponse(BaseModel):
    id: str
    version_number: int
    file_hash: str
    file_size: int
    original_filename: str
    upload_timestamp: datetime
    processing_status: str
    extractions: List[ExtractionResponse] = []

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: str
    fdr_id: str
    filename: str
    current_version: int
    mime_type: str
    integrity_status: str
    created_at: datetime
    versions: List[DocumentVersionResponse] = []

    class Config:
        from_attributes = True

# ----------------- Risk & Findings -----------------
class RiskFlagResponse(BaseModel):
    id: str
    fdr_id: str
    rule_id: str
    rule_name: str
    severity: str
    explanation: str
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    suggested_action: Optional[str] = None
    status: str
    dismissed_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    source_page: Optional[int] = None
    supporting_evidence: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    fdr_number: Optional[str] = None
    institution_name: Optional[str] = None

    class Config:
        from_attributes = True

class RiskFindingAction(BaseModel):
    action: str # dismiss, override, resolve
    reason: str

class ValidationResultResponse(BaseModel):
    id: str
    fdr_id: str
    rule_id: str
    status: str
    mismatch_field: Optional[str] = None
    submitted_value: Optional[str] = None
    extracted_value: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Cases -----------------
class CaseNoteCreate(BaseModel):
    note_text: str

class CaseNoteResponse(BaseModel):
    id: str
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    note_text: str
    created_at: datetime

    class Config:
        from_attributes = True

class CaseEventResponse(BaseModel):
    id: str
    event_type: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CaseCreate(BaseModel):
    fdr_id: str
    title: str
    summary: str
    priority: str = "medium"

class CaseDecision(BaseModel):
    decision: str # verified_compliant, discrepancy_confirmed, corrected_and_closed, dismissed_false_positive
    decision_notes: str

class CaseStatusUpdate(BaseModel):
    status: str # new, under_review, awaiting_information, escalated, resolved, dismissed
    reason: Optional[str] = None

class CaseAssignmentUpdate(BaseModel):
    assigned_to: str
    notes: Optional[str] = None

class CaseResponse(BaseModel):
    id: str
    case_number: str
    fdr_id: str
    institution_id: str
    title: str
    summary: str
    priority: str
    status: str
    assigned_to: Optional[str] = None
    assignee_name: Optional[str] = None
    created_by: Optional[str] = None
    decision: str
    decision_notes: Optional[str] = None
    decided_at: Optional[datetime] = None
    decided_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    institution_name: Optional[str] = None
    fdr_number: Optional[str] = None
    notes: List[CaseNoteResponse] = []
    events: List[CaseEventResponse] = []
    risk_flags: List[RiskFlagResponse] = []

    class Config:
        from_attributes = True

# ----------------- Integrity & Audit -----------------
class IntegrityCheckResponse(BaseModel):
    document_id: str
    version_id: str
    original_filename: str
    recorded_hash: str
    recomputed_hash: str
    status: str # intact, modified, missing, error
    file_size: int
    verified_at: datetime
    explanation: str

class AuditChainResponse(BaseModel):
    id: str
    sequence_number: int
    event_id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    event_type: str
    entity_type: str
    entity_id: str
    payload: str
    previous_hash: str
    current_hash: str
    timestamp: datetime

    class Config:
        from_attributes = True

class AuditVerifyResponse(BaseModel):
    is_valid: bool
    total_events: int
    tampered_sequence: Optional[int] = None
    message: str
    verified_at: datetime

# ----------------- Graph -----------------
class GraphNode(BaseModel):
    id: str
    label: str
    type: str # institution, fdr, document
    data: Dict[str, Any]

class GraphLink(BaseModel):
    id: str
    source: str
    target: str
    type: str
    label: str
    explanation: str
    matched_fields: Optional[Dict[str, Any]] = None

class GraphDataResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphLink]

# ----------------- Dashboard & Analytics -----------------
class DashboardSummaryResponse(BaseModel):
    total_fdrs: int
    total_institutions: int
    total_principal_amount: float
    open_findings_count: int
    high_priority_findings: int
    open_cases_count: int
    upcoming_maturities_30d: int
    overdue_actions_count: int
    integrity_failures_count: int
    maturity_distribution: List[Dict[str, Any]]
    findings_by_rule: List[Dict[str, Any]]
    cases_by_status: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]

# ----------------- Rule Configuration -----------------
class RuleConfigResponse(BaseModel):
    rule_id: str
    rule_name: str
    description: str
    weight: float
    is_enabled: bool
    parameters: Optional[str] = None

    class Config:
        from_attributes = True

class RuleConfigUpdate(BaseModel):
    weight: Optional[float] = None
    is_enabled: Optional[bool] = None
    parameters: Optional[str] = None

