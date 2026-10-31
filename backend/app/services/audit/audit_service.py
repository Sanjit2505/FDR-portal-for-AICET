import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Any, Dict, Tuple
from sqlalchemy.orm import Session
from app.models.entities import AuditChain, User

GENESIS_HASH = "0" * 64

def canonicalize_payload(payload: Dict[str, Any]) -> str:
    """Deterministic canonical JSON serialization: sorted keys, separators with no extra whitespace."""
    return json.dumps(payload, sort_keys=True, separators=(',', ':'), default=str)

def compute_event_hash(
    sequence_number: int,
    event_id: str,
    actor_id: Optional[str],
    event_type: str,
    entity_type: str,
    entity_id: str,
    canonical_payload: str,
    previous_hash: str
) -> str:
    """Exact canonical hash calculation using SHA-256."""
    raw_str = (
        f"{sequence_number}|"
        f"{event_id}|"
        f"{actor_id or ''}|"
        f"{event_type}|"
        f"{entity_type}|"
        f"{entity_id}|"
        f"{canonical_payload}|"
        f"{previous_hash}"
    )
    return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

def record_audit_event(
    db: Session,
    event_type: str,
    entity_type: str,
    entity_id: str,
    payload: Dict[str, Any],
    actor_id: Optional[str] = None
) -> AuditChain:
    """
    Appends a new cryptographically hash-chained event to the audit trail.
    Ensures strict sequential ordering and integrity.
    """
    # Fetch last audit event
    last_event = db.query(AuditChain).order_by(AuditChain.sequence_number.desc()).first()
    
    if last_event:
        seq_num = last_event.sequence_number + 1
        prev_hash = last_event.current_hash
    else:
        seq_num = 1
        prev_hash = GENESIS_HASH

    event_id = str(uuid.uuid4())
    canonical_payload = canonicalize_payload(payload)
    curr_hash = compute_event_hash(
        sequence_number=seq_num,
        event_id=event_id,
        actor_id=actor_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        canonical_payload=canonical_payload,
        previous_hash=prev_hash
    )

    audit_entry = AuditChain(
        sequence_number=seq_num,
        event_id=event_id,
        actor_id=actor_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=canonical_payload,
        previous_hash=prev_hash,
        current_hash=curr_hash,
        timestamp=datetime.now(timezone.utc)
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

def verify_full_audit_chain(db: Session) -> Tuple[bool, int, Optional[int], str]:
    """
    Verifies the entire audit trail chain integrity:
    1. Validates previous_hash linkage
    2. Validates sequence continuity
    3. Recomputes SHA-256 for each event and compares with current_hash
    Returns (is_valid, total_events_checked, tampered_sequence_number, message)
    """
    events = db.query(AuditChain).order_by(AuditChain.sequence_number.asc()).all()
    if not events:
        return True, 0, None, "Audit chain is empty. Integrity intact."

    expected_prev_hash = GENESIS_HASH
    for i, event in enumerate(events, start=1):
        # 1. Sequence check
        if event.sequence_number != i:
            return False, len(events), event.sequence_number, f"Sequence discontinuity: expected {i}, found {event.sequence_number}"

        # 2. Previous hash link check
        if event.previous_hash != expected_prev_hash:
            return False, len(events), event.sequence_number, f"Broken link at sequence {event.sequence_number}: previous_hash does not match preceding current_hash"

        # 3. Recompute hash
        recomputed = compute_event_hash(
            sequence_number=event.sequence_number,
            event_id=event.event_id,
            actor_id=event.actor_id,
            event_type=event.event_type,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            canonical_payload=event.payload,
            previous_hash=event.previous_hash
        )

        if recomputed != event.current_hash:
            return False, len(events), event.sequence_number, f"Payload tampering detected at sequence {event.sequence_number}: recomputed hash {recomputed} != recorded hash {event.current_hash}"

        expected_prev_hash = event.current_hash

    return True, len(events), None, f"Audit chain verified successfully ({len(events)} events checked). All hash links intact."

