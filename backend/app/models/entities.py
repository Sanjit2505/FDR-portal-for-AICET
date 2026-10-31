import uuid
from datetime import datetime, timezone, date
from typing import Optional, List
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date, Text,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="institution_user") # institution_user, authorized_official, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    memberships = relationship("InstitutionMembership", back_populates="user", cascade="all, delete-orphan")
    fdr_records = relationship("FDRRecord", back_populates="creator")
    assigned_cases = relationship("InvestigationCase", foreign_keys="InvestigationCase.assigned_to", back_populates="assignee")

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    state = Column(String(100), nullable=False)
    registration_number = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    memberships = relationship("InstitutionMembership", back_populates="institution", cascade="all, delete-orphan")
    fdr_records = relationship("FDRRecord", back_populates="institution", cascade="all, delete-orphan")
    cases = relationship("InvestigationCase", back_populates="institution")

class InstitutionMembership(Base):
    __tablename__ = "institution_memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="member")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="memberships")
    institution = relationship("Institution", back_populates="memberships")
    __table_args__ = (UniqueConstraint('user_id', 'institution_id', name='uq_user_institution'),)

class FDRRecord(Base):
    __tablename__ = "fdr_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    normalized_fdr_number = Column(String(100), nullable=False, index=True)
    display_fdr_number = Column(String(100), nullable=False)
    bank_name = Column(String(255), nullable=False, index=True)
    branch_name = Column(String(255), nullable=False)
    ifsc_code = Column(String(20), nullable=False, index=True)
    principal_amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    issue_date = Column(Date, nullable=False, index=True)
    maturity_date = Column(Date, nullable=False, index=True)
    renewal_status = Column(String(50), default="original") # original, renewed, replacement
    previous_fdr_id = Column(String(36), ForeignKey("fdr_records.id", ondelete="SET NULL"), nullable=True)
    replacement_fdr_id = Column(String(36), ForeignKey("fdr_records.id", ondelete="SET NULL"), nullable=True)
    beneficiary = Column(String(255), nullable=True)
    workflow_status = Column(String(50), default="submitted", index=True) # submitted, under_review, verified, discrepant, investigating, resolved
    risk_score = Column(Float, default=0.0)
    risk_band = Column(String(20), default="low") # low, medium, high, critical
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    institution = relationship("Institution", back_populates="fdr_records")
    creator = relationship("User", back_populates="fdr_records")
    documents = relationship("Document", back_populates="fdr_record", cascade="all, delete-orphan")
    validations = relationship("ValidationResult", back_populates="fdr_record", cascade="all, delete-orphan")
    risk_flags = relationship("RiskFlag", back_populates="fdr_record", cascade="all, delete-orphan")
    cases = relationship("InvestigationCase", back_populates="fdr_record")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    fdr_id = Column(String(36), ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    current_version = Column(Integer, default=1)
    mime_type = Column(String(100), default="application/pdf")
    integrity_status = Column(String(50), default="unverified") # intact, modified, missing, unverified
    created_at = Column(DateTime(timezone=True), default=utc_now)

    fdr_record = relationship("FDRRecord", back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    file_hash = Column(String(64), nullable=False, index=True) # SHA-256
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    uploader_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    upload_timestamp = Column(DateTime(timezone=True), default=utc_now)
    processing_status = Column(String(50), default="pending") # pending, processing, completed, failed

    document = relationship("Document", back_populates="versions")
    extractions = relationship("Extraction", back_populates="document_version", cascade="all, delete-orphan")

class Extraction(Base):
    __tablename__ = "extractions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_version_id = Column(String(36), ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    fdr_id = Column(String(36), ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    extracted_value = Column(Text, nullable=True)
    normalized_value = Column(Text, nullable=True)
    confidence = Column(Float, default=1.0)
    extraction_method = Column(String(50), default="text_extract") # text_extract, ocr, regex
    source_page = Column(Integer, default=1)
    bounding_box = Column(Text, nullable=True) # JSON format string
    raw_context = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    document_version = relationship("DocumentVersion", back_populates="extractions")

class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    fdr_id = Column(String(36), ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(20), nullable=False, index=True)
    status = Column(String(20), nullable=False) # pass, fail, warning
    mismatch_field = Column(String(100), nullable=True)
    submitted_value = Column(Text, nullable=True)
    extracted_value = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    fdr_record = relationship("FDRRecord", back_populates="validations")

class RiskFlag(Base):
    __tablename__ = "risk_flags"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    fdr_id = Column(String(36), ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_id = Column(String(20), nullable=False, index=True)
    rule_name = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False) # low, medium, high, critical
    explanation = Column(Text, nullable=False)
    expected_value = Column(Text, nullable=True)
    observed_value = Column(Text, nullable=True)
    suggested_action = Column(Text, nullable=True)
    status = Column(String(20), default="open", index=True) # open, dismissed, overridden, resolved
    dismissed_reason = Column(Text, nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    source_page = Column(Integer, nullable=True)
    supporting_evidence = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    fdr_record = relationship("FDRRecord", back_populates="risk_flags")

class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    fdr_id = Column(String(36), ForeignKey("fdr_records.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    priority = Column(String(20), default="medium", index=True) # low, medium, high, critical
    status = Column(String(50), default="new", index=True) # new, under_review, awaiting_information, escalated, resolved, dismissed
    assigned_to = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision = Column(String(50), default="pending") # pending, verified_compliant, discrepancy_confirmed, corrected_and_closed, dismissed_false_positive
    decision_notes = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    decided_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    fdr_record = relationship("FDRRecord", back_populates="cases")
    institution = relationship("Institution", back_populates="cases")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_cases")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
    events = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan")

class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_to = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    assigned_at = Column(DateTime(timezone=True), default=utc_now)

class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    case = relationship("InvestigationCase", back_populates="notes")
    author = relationship("User")

class CaseEvent(Base):
    __tablename__ = "case_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("investigation_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    case = relationship("InvestigationCase", back_populates="events")
    actor = relationship("User")

class GraphEdge(Base):
    __tablename__ = "graph_edges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_id = Column(String(100), nullable=False, index=True)
    source_type = Column(String(50), nullable=False) # institution, fdr, document
    target_id = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=False)
    relationship_type = Column(String(50), nullable=False) # same_fdr_number, renewal_link, replacement_link, institution_ownership, fuzzy_identifier_match
    matched_fields = Column(Text, nullable=True)
    explanation = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class AuditChain(Base):
    __tablename__ = "audit_chain"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sequence_number = Column(Integer, nullable=False, unique=True, index=True)
    event_id = Column(String(36), nullable=False, unique=True)
    actor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=False, index=True)
    payload = Column(Text, nullable=False) # Canonical JSON string
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)

    actor = relationship("User")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info") # info, warning, critical, maturity_reminder
    is_read = Column(Boolean, default=False)
    link_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class RuleConfiguration(Base):
    __tablename__ = "rule_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_id = Column(String(20), unique=True, nullable=False, index=True) # R1, R2, R3, R4, R5, R6, R7, R8
    rule_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    weight = Column(Float, default=10.0)
    is_enabled = Column(Boolean, default=True)
    parameters = Column(Text, nullable=True) # JSON string
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

