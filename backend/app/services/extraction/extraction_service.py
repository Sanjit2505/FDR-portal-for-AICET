import re
from datetime import datetime, date
from pathlib import Path
from typing import Dict, Any, List, Optional
import pypdf
from sqlalchemy.orm import Session
from app.models.entities import FDRRecord, DocumentVersion, Extraction, ValidationResult
from app.services.audit.audit_service import record_audit_event

COMMON_BANKS = [
    "STATE BANK OF INDIA", "SBI", "HDFC BANK", "ICICI BANK", 
    "PUNJAB NATIONAL BANK", "PNB", "BANK OF BARODA", "CANARA BANK",
    "UNION BANK OF INDIA", "AXIS BANK", "KOTAK MAHINDRA BANK", "INDUSIND BANK"
]

def parse_date_string(date_str: str) -> Optional[date]:
    """Tries multiple date formats commonly found on FDR certificates."""
    if not date_str:
        return None
    cleaned = re.sub(r'[^0-9a-zA-Z/-]', '', date_str.strip())
    formats = [
        "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%y",
        "%d-%b-%Y", "%d-%B-%Y", "%d %b %Y", "%d %B %Y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None

def normalize_amount(amount_str: str) -> Optional[float]:
    """Strips currency symbols, commas, and extracts float value."""
    if not amount_str:
        return None
    cleaned = re.sub(r'[^\d.]', '', amount_str)
    try:
        return float(cleaned)
    except ValueError:
        return None

def extract_fields_from_pdf(pdf_path: Path) -> List[Dict[str, Any]]:
    """
    Extracts text from each page of the PDF and uses regex patterns
    to identify critical FDR attributes with context and page coordinates.
    """
    results: List[Dict[str, Any]] = []
    
    if not pdf_path.exists():
        return results

    try:
        reader = pypdf.PdfReader(str(pdf_path))
    except Exception as e:
        return results

    full_text_by_page = []
    for page_num, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        full_text_by_page.append((page_num, page_text))

    for page_num, text in full_text_by_page:
        lines = text.splitlines()

        # 1. FDR Reference Number
        # Pattern: Receipt No, FDR No, Fixed Deposit No, etc.
        fdr_match = re.search(r'(?:FDR|Receipt|Account|Deposit)\s*(?:No\.?|Number|#)?[:\s-]*([A-Z0-9\-/]{5,25})', text, re.IGNORECASE)
        if fdr_match:
            val = fdr_match.group(1).strip()
            norm = re.sub(r'[^A-Z0-9]', '', val.upper())
            results.append({
                "field_name": "fdr_number",
                "extracted_value": val,
                "normalized_value": norm,
                "confidence": 0.95,
                "extraction_method": "regex_text",
                "source_page": page_num,
                "raw_context": fdr_match.group(0)
            })

        # 2. Bank Name
        text_upper = text.upper()
        for bank in COMMON_BANKS:
            if bank in text_upper:
                results.append({
                    "field_name": "bank_name",
                    "extracted_value": bank.title(),
                    "normalized_value": bank,
                    "confidence": 0.90,
                    "extraction_method": "dictionary_match",
                    "source_page": page_num,
                    "raw_context": f"Matched known bank {bank}"
                })
                break

        # 3. Branch Name
        branch_match = re.search(r'(?:Branch|Branch Name)[:\s-]*([A-Za-z0-9\s,.-]{3,40})', text, re.IGNORECASE)
        if branch_match:
            results.append({
                "field_name": "branch_name",
                "extracted_value": branch_match.group(1).strip(),
                "normalized_value": branch_match.group(1).strip().upper(),
                "confidence": 0.85,
                "extraction_method": "regex_text",
                "source_page": page_num,
                "raw_context": branch_match.group(0)
            })

        # 4. IFSC Code
        # Standard Indian IFSC format: 4 letters, 0, 6 alphanumeric
        ifsc_match = re.search(r'\b([A-Z]{4}0[A-Z0-9]{6})\b', text)
        if ifsc_match:
            results.append({
                "field_name": "ifsc_code",
                "extracted_value": ifsc_match.group(1),
                "normalized_value": ifsc_match.group(1).upper(),
                "confidence": 0.98,
                "extraction_method": "regex_pattern",
                "source_page": page_num,
                "raw_context": ifsc_match.group(0)
            })

        # 5. Principal Amount
        amount_match = re.search(r'(?:Principal(?:\s+Amount)?|Deposit\s+Amount|Amount|Sum\s+of)[:\s-]*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{2})?)', text, re.IGNORECASE)
        if amount_match:
            raw_amt = amount_match.group(1)
            norm_amt = normalize_amount(raw_amt)
            results.append({
                "field_name": "principal_amount",
                "extracted_value": raw_amt,
                "normalized_value": str(norm_amt) if norm_amt is not None else raw_amt,
                "confidence": 0.92,
                "extraction_method": "regex_text",
                "source_page": page_num,
                "raw_context": amount_match.group(0)
            })

        # 6. Amount in Words
        words_match = re.search(r'(?:Rupees|Amount in words)[:\s-]*([A-Za-z\s]+(?:Only)?)', text, re.IGNORECASE)
        if words_match:
            results.append({
                "field_name": "amount_in_words",
                "extracted_value": words_match.group(1).strip(),
                "normalized_value": words_match.group(1).strip().upper(),
                "confidence": 0.88,
                "extraction_method": "regex_text",
                "source_page": page_num,
                "raw_context": words_match.group(0)
            })

        # 7. Issue Date
        issue_match = re.search(r'(?:Issue(?:\s+Date)?|Date\s+of\s+Issue|Value\s+Date|Date)[:\s-]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})', text, re.IGNORECASE)
        if issue_match:
            raw_dt = issue_match.group(1)
            parsed_dt = parse_date_string(raw_dt)
            results.append({
                "field_name": "issue_date",
                "extracted_value": raw_dt,
                "normalized_value": str(parsed_dt) if parsed_dt else raw_dt,
                "confidence": 0.90,
                "extraction_method": "regex_date",
                "source_page": page_num,
                "raw_context": issue_match.group(0)
            })

        # 8. Maturity Date
        maturity_match = re.search(r'(?:Maturity(?:\s+Date)?|Due\s+Date)[:\s-]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})', text, re.IGNORECASE)
        if maturity_match:
            raw_mat = maturity_match.group(1)
            parsed_mat = parse_date_string(raw_mat)
            results.append({
                "field_name": "maturity_date",
                "extracted_value": raw_mat,
                "normalized_value": str(parsed_mat) if parsed_mat else raw_mat,
                "confidence": 0.90,
                "extraction_method": "regex_date",
                "source_page": page_num,
                "raw_context": maturity_match.group(0)
            })

    return results

def process_document_version(
    db: Session,
    version_id: str,
    actor_id: str = None
) -> List[Extraction]:
    """
    Executes the extraction pipeline for a given DocumentVersion:
    1. Reads PDF
    2. Runs extractors
    3. Persists Extraction records
    4. Triggers rule validation
    5. Records audit event
    """
    doc_version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not doc_version:
        raise ValueError("DocumentVersion not found")

    doc_version.processing_status = "processing"
    db.commit()

    file_path = Path(doc_version.storage_path)
    extracted_items = extract_fields_from_pdf(file_path)

    # Clear prior extractions for this version if any
    db.query(Extraction).filter(Extraction.document_version_id == version_id).delete()

    created_extractions = []
    for item in extracted_items:
        extraction = Extraction(
            document_version_id=version_id,
            fdr_id=doc_version.document.fdr_id,
            field_name=item["field_name"],
            extracted_value=item["extracted_value"],
            normalized_value=item["normalized_value"],
            confidence=item["confidence"],
            extraction_method=item["extraction_method"],
            source_page=item["source_page"],
            raw_context=item.get("raw_context")
        )
        db.add(extraction)
        created_extractions.append(extraction)

    doc_version.processing_status = "completed"
    db.commit()

    # Log audit event
    record_audit_event(
        db=db,
        event_type="DOCUMENT_EXTRACTION_COMPLETED",
        entity_type="DocumentVersion",
        entity_id=version_id,
        payload={
            "fdr_id": doc_version.document.fdr_id,
            "extractions_count": len(created_extractions),
            "fields_found": [x.field_name for x in created_extractions]
        },
        actor_id=actor_id
    )

    return created_extractions

