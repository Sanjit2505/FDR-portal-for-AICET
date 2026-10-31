import sys
from pathlib import Path
from datetime import date, datetime, timedelta, timezone

# Add project root and backend to path
sys.path.append(str(Path(__file__).resolve().parent.parent))
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.core.config import settings
from app.db.session import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.entities import (
    User, Institution, InstitutionMembership, FDRRecord,
    Document, DocumentVersion, InvestigationCase, CaseEvent, CaseNote, Notification
)
from app.services.integrity.integrity_service import calculate_sha256
from app.services.extraction.extraction_service import process_document_version
from app.services.risk.rule_engine import evaluate_fdr_rules, init_rule_configurations
from app.services.audit.audit_service import record_audit_event
from scripts.generate_synthetic_documents import generate_fdr_pdf

def seed_database():
    print("🚀 Initializing FDR Guardian database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        init_rule_configurations(db)

        # Check if already seeded
        if db.query(User).filter(User.email == "admin@fdrguardian.internal").first():
            print("Database already contains seed data. Run with reset if re-seeding is desired.")
            return

        print("👤 Creating standard users (Admin, Authorized Official, Institution User)...")
        # 1. Admin
        admin_user = User(
            email="admin@fdrguardian.internal",
            hashed_password=get_password_hash("Admin@Guardian2026"),
            full_name="Dr. Rajeshwar Rao (System Administrator)",
            role="admin",
            is_active=True
        )
        # 2. Authorized Official
        official_user = User(
            email="official@aicet.gov.in",
            hashed_password=get_password_hash("Official@Review2026"),
            full_name="Smt. Meenakshi Sundaram (Chief Scrutiny Officer)",
            role="authorized_official",
            is_active=True
        )
        # 3. Institution User
        inst_user = User(
            email="apex.finance@aiet.ac.in",
            hashed_password=get_password_hash("Apex@User2026"),
            full_name="Prof. Anand Kulkarni (Finance Registrar, AIET)",
            role="institution_user",
            is_active=True
        )
        db.add_all([admin_user, official_user, inst_user])
        db.commit()

        print("🏛️ Creating 3 Fictional Educational Institutions...")
        inst_apex = Institution(
            code="AIET-001",
            name="Apex Institute of Engineering & Technology",
            state="Karnataka",
            registration_number="REG/KAR/ENG/2012/8821",
            email="registrar@aiet.ac.in",
            contact_phone="+91-80-2345-6789"
        )
        inst_bharat = Institution(
            code="BGP-002",
            name="Bharat Global Polytechnic Institute",
            state="Maharashtra",
            registration_number="REG/MAH/POLY/2015/4412",
            email="admin@bgp.edu.in",
            contact_phone="+91-22-4567-8901"
        )
        inst_zenith = Institution(
            code="ZAAS-003",
            name="Zenith Academy of Advanced Sciences",
            state="Tamil Nadu",
            registration_number="REG/TN/UNIV/2018/1093",
            email="finance@zenithacademy.ac.in",
            contact_phone="+91-44-3322-1100"
        )
        db.add_all([inst_apex, inst_bharat, inst_zenith])
        db.commit()

        # Link institution membership
        membership = InstitutionMembership(
            user_id=inst_user.id,
            institution_id=inst_apex.id,
            role="institution_admin"
        )
        db.add(membership)
        db.commit()

        today = date.today()

        print("📜 Generating 22 Realistic FDR Records with specific scenarios...")
        fdr_specs = [
            # 1. Fully Compliant Active (Apex)
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-001",
                "bank": "State Bank of India",
                "branch": "MG Road, Bengaluru",
                "ifsc": "SBIN0000813",
                "amount": 2500000.0,
                "amount_words": "Rupees Twenty Five Lakhs Only",
                "issue": today - timedelta(days=300),
                "maturity": today + timedelta(days=430),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 2. Fully Compliant Upcoming Maturity (18 days left) (Apex)
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-002",
                "bank": "HDFC Bank",
                "branch": "Koramangala, Bengaluru",
                "ifsc": "HDFC0000053",
                "amount": 1500000.0,
                "amount_words": "Rupees Fifteen Lakhs Only",
                "issue": today - timedelta(days=347),
                "maturity": today + timedelta(days=18),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 3. Critical Upcoming Maturity (5 days left) (Apex)
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-003",
                "bank": "ICICI Bank",
                "branch": "Indiranagar, Bengaluru",
                "ifsc": "ICIC0000002",
                "amount": 3000000.0,
                "amount_words": "Rupees Thirty Lakhs Only",
                "issue": today - timedelta(days=360),
                "maturity": today + timedelta(days=5),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 4. Scenario: Amount Mismatch (R2) - Form says 50 Lakhs, Certificate says 35 Lakhs! (Apex)
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-MISMATCH",
                "bank": "Punjab National Bank",
                "branch": "Jayanagar, Bengaluru",
                "ifsc": "PUNB0014200",
                "amount": 5000000.0,
                "amount_words": "Rupees Thirty Five Lakhs Only",
                "issue": today - timedelta(days=100),
                "maturity": today + timedelta(days=265),
                "renewal_status": "original",
                "discrepancy": "amount_mismatch",
                "actual_pdf_amount": 3500000.0
            },
            # 5. Scenario: Date Inconsistency (R3) - Issue date >= Maturity date (Apex)
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-DATEERR",
                "bank": "Bank of Baroda",
                "branch": "Malleshwaram, Bengaluru",
                "ifsc": "BARB0MALLSH",
                "amount": 2000000.0,
                "amount_words": "Rupees Twenty Lakhs Only",
                "issue": today + timedelta(days=60), # Inverted!
                "maturity": today + timedelta(days=30),
                "renewal_status": "original",
                "discrepancy": "date_inverted"
            },
            # 6. Scenario: Duplicate Reference Across Institutions (R1) - Original in Apex
            {
                "inst": inst_apex,
                "display": "AIET-COLLISION-99",
                "bank": "Canara Bank",
                "branch": "Rajajinagar, Bengaluru",
                "ifsc": "CNRB0000412",
                "amount": 4000000.0,
                "amount_words": "Rupees Forty Lakhs Only",
                "issue": today - timedelta(days=150),
                "maturity": today + timedelta(days=215),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 7. Scenario: Duplicate Reference Across Institutions (R1) - Same number in Bharat!
            {
                "inst": inst_bharat,
                "display": "AIET-COLLISION-99",
                "bank": "Canara Bank",
                "branch": "Pune Main Branch",
                "ifsc": "CNRB0000412",
                "amount": 4000000.0,
                "amount_words": "Rupees Forty Lakhs Only",
                "issue": today - timedelta(days=120),
                "maturity": today + timedelta(days=245),
                "renewal_status": "original",
                "discrepancy": "duplicate_reference"
            },
            # 8. Scenario: Missing Document Evidence (R4) (Bharat)
            {
                "inst": inst_bharat,
                "display": "BGP-FDR-2024-NODOC",
                "bank": "Union Bank of India",
                "branch": "Nariman Point, Mumbai",
                "ifsc": "UBIN0530018",
                "amount": 1800000.0,
                "amount_words": "Rupees Eighteen Lakhs Only",
                "issue": today - timedelta(days=90),
                "maturity": today + timedelta(days=275),
                "renewal_status": "original",
                "discrepancy": "no_document"
            },
            # 9. Scenario: Overdue Action (R5) - Matured 45 days ago without renewal (Bharat)
            {
                "inst": inst_bharat,
                "display": "BGP-FDR-2023-OVERDUE",
                "bank": "Axis Bank",
                "branch": "Bandra, Mumbai",
                "ifsc": "UTIB0000005",
                "amount": 2200000.0,
                "amount_words": "Rupees Twenty Two Lakhs Only",
                "issue": today - timedelta(days=410),
                "maturity": today - timedelta(days=45), # Expired!
                "renewal_status": "original",
                "discrepancy": "overdue"
            },
            # 10. Scenario: Invalid IFSC Syntax (R6) (Bharat)
            {
                "inst": inst_bharat,
                "display": "BGP-FDR-2024-BADIFSC",
                "bank": "Kotak Mahindra Bank",
                "branch": "Andheri West, Mumbai",
                "ifsc": "KKBK0000XYZ99", # Invalid IFSC syntax
                "amount": 1200000.0,
                "amount_words": "Rupees Twelve Lakhs Only",
                "issue": today - timedelta(days=50),
                "maturity": today + timedelta(days=315),
                "renewal_status": "original",
                "discrepancy": "bad_ifsc"
            },
            # 11. Compliant Renewal Chain Parent (Zenith)
            {
                "inst": inst_zenith,
                "display": "ZAAS-ORIGINAL-2021",
                "bank": "State Bank of India",
                "branch": "Anna Salai, Chennai",
                "ifsc": "SBIN0000800",
                "amount": 5000000.0,
                "amount_words": "Rupees Fifty Lakhs Only",
                "issue": today - timedelta(days=730),
                "maturity": today - timedelta(days=365),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 12. Compliant Renewal Child (Zenith) - linked to record 11
            {
                "inst": inst_zenith,
                "display": "ZAAS-RENEWAL-2023",
                "bank": "State Bank of India",
                "branch": "Anna Salai, Chennai",
                "ifsc": "SBIN0000800",
                "amount": 5000000.0,
                "amount_words": "Rupees Fifty Lakhs Only",
                "issue": today - timedelta(days=365),
                "maturity": today + timedelta(days=365),
                "renewal_status": "renewed",
                "discrepancy": None,
                "parent_ref": "ZAAS-ORIGINAL-2021"
            },
            # 13. Compliant Multi-year Zenith
            {
                "inst": inst_zenith,
                "display": "ZAAS-FDR-2024-001",
                "bank": "ICICI Bank",
                "branch": "T Nagar, Chennai",
                "ifsc": "ICIC0000001",
                "amount": 3500000.0,
                "amount_words": "Rupees Thirty Five Lakhs Only",
                "issue": today - timedelta(days=60),
                "maturity": today + timedelta(days=670),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 14. Upcoming 45-day maturity (Zenith)
            {
                "inst": inst_zenith,
                "display": "ZAAS-FDR-2024-002",
                "bank": "HDFC Bank",
                "branch": "Adyar, Chennai",
                "ifsc": "HDFC0000004",
                "amount": 2800000.0,
                "amount_words": "Rupees Twenty Eight Lakhs Only",
                "issue": today - timedelta(days=320),
                "maturity": today + timedelta(days=45),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 15. Apex Compliant High Value
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-HIGHVAL",
                "bank": "State Bank of India",
                "branch": "Electronic City, Bengaluru",
                "ifsc": "SBIN0009055",
                "amount": 10000000.0,
                "amount_words": "Rupees One Crore Only",
                "issue": today - timedelta(days=180),
                "maturity": today + timedelta(days=550),
                "renewal_status": "original",
                "discrepancy": None
            },
            # 16-22. Additional diverse records
            {
                "inst": inst_bharat,
                "display": "BGP-FDR-2024-010",
                "bank": "Bank of Baroda",
                "branch": "Shivaji Nagar, Pune",
                "ifsc": "BARB0SHIVAJ",
                "amount": 1600000.0,
                "amount_words": "Rupees Sixteen Lakhs Only",
                "issue": today - timedelta(days=40),
                "maturity": today + timedelta(days=325),
                "renewal_status": "original",
                "discrepancy": None
            },
            {
                "inst": inst_bharat,
                "display": "BGP-FDR-2024-011",
                "bank": "Punjab National Bank",
                "branch": "Camp, Pune",
                "ifsc": "PUNB0023400",
                "amount": 2100000.0,
                "amount_words": "Rupees Twenty One Lakhs Only",
                "issue": today - timedelta(days=110),
                "maturity": today + timedelta(days=255),
                "renewal_status": "original",
                "discrepancy": None
            },
            {
                "inst": inst_zenith,
                "display": "ZAAS-FDR-2024-012",
                "bank": "Canara Bank",
                "branch": "Guindy, Chennai",
                "ifsc": "CNRB0000120",
                "amount": 1900000.0,
                "amount_words": "Rupees Nineteen Lakhs Only",
                "issue": today - timedelta(days=20),
                "maturity": today + timedelta(days=345),
                "renewal_status": "original",
                "discrepancy": None
            },
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-013",
                "bank": "Axis Bank",
                "branch": "Whitefield, Bengaluru",
                "ifsc": "UTIB0000300",
                "amount": 2400000.0,
                "amount_words": "Rupees Twenty Four Lakhs Only",
                "issue": today - timedelta(days=80),
                "maturity": today + timedelta(days=285),
                "renewal_status": "original",
                "discrepancy": None
            },
            {
                "inst": inst_zenith,
                "display": "ZAAS-FDR-2024-014",
                "bank": "Union Bank of India",
                "branch": "Velachery, Chennai",
                "ifsc": "UBIN0540022",
                "amount": 3200000.0,
                "amount_words": "Rupees Thirty Two Lakhs Only",
                "issue": today - timedelta(days=75),
                "maturity": today + timedelta(days=290),
                "renewal_status": "original",
                "discrepancy": None
            },
            {
                "inst": inst_bharat,
                "display": "BGP-FDR-2024-015",
                "bank": "HDFC Bank",
                "branch": "Vashi, Navi Mumbai",
                "ifsc": "HDFC0000110",
                "amount": 2750000.0,
                "amount_words": "Rupees Twenty Seven Lakhs Fifty Thousand Only",
                "issue": today - timedelta(days=95),
                "maturity": today + timedelta(days=270),
                "renewal_status": "original",
                "discrepancy": None
            },
            {
                "inst": inst_apex,
                "display": "AIET-FDR-2024-016",
                "bank": "State Bank of India",
                "branch": "Hebbal, Bengaluru",
                "ifsc": "SBIN0004561",
                "amount": 4500000.0,
                "amount_words": "Rupees Forty Five Lakhs Only",
                "issue": today - timedelta(days=130),
                "maturity": today + timedelta(days=235),
                "renewal_status": "original",
                "discrepancy": None
            }
        ]

        created_fdr_map = {}

        for spec in fdr_specs:
            norm_num = "".join(filter(str.isalnum, spec["display"].upper()))
            fdr = FDRRecord(
                institution_id=spec["inst"].id,
                normalized_fdr_number=norm_num,
                display_fdr_number=spec["display"],
                bank_name=spec["bank"],
                branch_name=spec["branch"],
                ifsc_code=spec["ifsc"],
                principal_amount=spec["amount"],
                currency="INR",
                issue_date=spec["issue"],
                maturity_date=spec["maturity"],
                renewal_status=spec.get("renewal_status", "original"),
                beneficiary="Member Secretary, Statutory Regulatory Authority",
                workflow_status="submitted",
                created_by=inst_user.id
            )
            db.add(fdr)
            db.commit()
            db.refresh(fdr)
            created_fdr_map[spec["display"]] = fdr

            # Record audit event
            record_audit_event(
                db=db,
                event_type="FDR_RECORD_CREATED",
                entity_type="FDRRecord",
                entity_id=fdr.id,
                payload={
                    "fdr_number": fdr.display_fdr_number,
                    "institution": spec["inst"].name,
                    "amount": fdr.principal_amount
                },
                actor_id=inst_user.id
            )

            # Generate synthetic PDF certificate unless "no_document"
            if spec.get("discrepancy") != "no_document":
                doc_filename = f"{fdr.display_fdr_number}.pdf"
                storage_path = settings.DOCUMENTS_DIR / f"{fdr.id}_v1.pdf"

                # Check if deliberate mismatch
                is_mismatch = (spec.get("discrepancy") == "amount_mismatch")
                pdf_amt = spec.get("actual_pdf_amount", fdr.principal_amount)

                generate_fdr_pdf(
                    output_path=storage_path,
                    bank_name=fdr.bank_name,
                    branch_name=fdr.branch_name,
                    ifsc_code=fdr.ifsc_code,
                    fdr_number=fdr.display_fdr_number,
                    deposit_amount=fdr.principal_amount,
                    amount_in_words=spec["amount_words"],
                    issue_date=str(fdr.issue_date),
                    maturity_date=str(fdr.maturity_date),
                    beneficiary_name="Member Secretary, Statutory Regulatory Authority",
                    institution_name=spec["inst"].name,
                    is_discrepant_amount=is_mismatch,
                    discrepant_amount=pdf_amt
                )

                file_hash = calculate_sha256(storage_path)
                doc = Document(
                    fdr_id=fdr.id,
                    filename=doc_filename,
                    current_version=1,
                    mime_type="application/pdf",
                    integrity_status="intact"
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)

                doc_ver = DocumentVersion(
                    document_id=doc.id,
                    version_number=1,
                    file_hash=file_hash,
                    file_size=storage_path.stat().st_size,
                    storage_path=str(storage_path),
                    original_filename=doc_filename,
                    uploader_id=inst_user.id,
                    processing_status="completed"
                )
                db.add(doc_ver)
                db.commit()
                db.refresh(doc_ver)

                # Process extraction
                process_document_version(db=db, version_id=doc_ver.id, actor_id=inst_user.id)

            # Evaluate rules
            evaluate_fdr_rules(db=db, fdr_id=fdr.id, actor_id=admin_user.id)

        # Wire renewal link for ZAAS-RENEWAL-2023 -> ZAAS-ORIGINAL-2021
        child_fdr = created_fdr_map.get("ZAAS-RENEWAL-2023")
        parent_fdr = created_fdr_map.get("ZAAS-ORIGINAL-2021")
        if child_fdr and parent_fdr:
            child_fdr.previous_fdr_id = parent_fdr.id
            db.commit()
            evaluate_fdr_rules(db=db, fdr_id=child_fdr.id, actor_id=admin_user.id)

        print("🔍 Creating Investigation Case for high-risk discrepancy...")
        mismatch_fdr = created_fdr_map.get("AIET-FDR-2024-MISMATCH")
        if mismatch_fdr:
            case = InvestigationCase(
                case_number="CASE-2026-0001",
                fdr_id=mismatch_fdr.id,
                institution_id=mismatch_fdr.institution_id,
                title="Investigation into Principal Amount Discrepancy on AIET Deposit",
                summary="Submitted form declared deposit amount of ₹50,00,000, while the extracted certificate text and amount in words indicate a deposit of ₹35,00,000.",
                priority="high",
                status="under_review",
                assigned_to=official_user.id,
                created_by=admin_user.id
            )
            db.add(case)
            db.commit()
            db.refresh(case)

            note1 = CaseNote(
                case_id=case.id,
                author_id=official_user.id,
                note_text="Opened file for scrutiny. Extracted PDF shows ₹35,00,000 issued by PNB Jayanagar branch. Requesting clarification from institution finance desk."
            )
            event1 = CaseEvent(
                case_id=case.id,
                event_type="investigation_initiated",
                actor_id=official_user.id,
                details="Investigation case opened and assigned to Smt. Meenakshi Sundaram."
            )
            db.add_all([note1, event1])
            db.commit()

        print("🔔 Generating initial in-app notifications...")
        n1 = Notification(
            user_id=official_user.id,
            title="Critical Discrepancy Flagged",
            message="Amount mismatch of ₹15,00,000 detected on AIET-FDR-2024-MISMATCH.",
            type="critical",
            link_url="/cases"
        )
        n2 = Notification(
            user_id=inst_user.id,
            title="Deposit Maturing Soon (5 Days)",
            message="Fixed deposit AIET-FDR-2024-003 with ICICI Bank matures on " + str(today + timedelta(days=5)),
            type="maturity_reminder",
            link_url="/maturity"
        )
        db.add_all([n1, n2])
        db.commit()

        print("✅ Demo database seeding completed successfully!")
        print("--------------------------------------------------")
        print("Demo Credentials:")
        print("  Administrator:        admin@fdrguardian.internal   / Admin@Guardian2026")
        print("  Authorized Official:  official@aicet.gov.in        / Official@Review2026")
        print("  Institution User:     apex.finance@aiet.ac.in      / Apex@User2026")
        print("--------------------------------------------------")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
