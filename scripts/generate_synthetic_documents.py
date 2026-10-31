from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

def generate_fdr_pdf(
    output_path: Path,
    bank_name: str,
    branch_name: str,
    ifsc_code: str,
    fdr_number: str,
    deposit_amount: float,
    amount_in_words: str,
    issue_date: str,
    maturity_date: str,
    beneficiary_name: str,
    institution_name: str,
    is_discrepant_amount: bool = False,
    discrepant_amount: float = 0.0,
    include_signatory: bool = True
):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output_path), pagesize=letter)
    width, height = letter

    # Decorative border
    c.setStrokeColor(colors.HexColor("#1e3a8a")) # Deep blue
    c.setLineWidth(3)
    c.rect(30, 30, width - 60, height - 60)
    c.setStrokeColor(colors.HexColor("#93c5fd"))
    c.setLineWidth(1)
    c.rect(35, 35, width - 70, height - 70)

    # Bank Header
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.HexColor("#1e3a8a"))
    c.drawCentredString(width / 2, height - 80, bank_name.upper())

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawCentredString(width / 2, height - 98, f"Branch: {branch_name} | IFSC: {ifsc_code}")
    c.drawCentredString(width / 2, height - 112, "FIXED DEPOSIT RECEIPT / SECURITY DEPOSIT CERTIFICATE")

    # Divider line
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.line(50, height - 125, width - 50, height - 125)

    # Metadata Block
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(60, height - 150, f"Receipt No: {fdr_number}")
    c.drawString(width - 240, height - 150, f"Date: {issue_date}")

    c.setFont("Helvetica", 10)
    c.drawString(60, height - 175, f"Depositor / Institution: {institution_name}")
    c.drawString(60, height - 195, f"Beneficiary / In Favor Of: {beneficiary_name}")

    # Amount Box
    displayed_amount = discrepant_amount if is_discrepant_amount else deposit_amount
    c.setFillColor(colors.HexColor("#f8fafc"))
    c.rect(60, height - 280, width - 120, 65, fill=1, stroke=1)
    
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(80, height - 240, f"Principal Amount: INR {displayed_amount:,.2f}")
    c.setFont("Helvetica", 10)
    c.drawString(80, height - 260, f"Amount in words: {amount_in_words}")

    # Terms & Dates Table
    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, height - 315, f"Issue Date: {issue_date}")
    c.drawString(width / 2, height - 315, f"Maturity Date: {maturity_date}")
    c.drawString(60, height - 335, "Interest Rate: 7.25% p.a.")
    c.drawString(width / 2, height - 335, "Tenure: 36 Months")

    # Legal clause
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawString(60, height - 380, "This deposit receipt is issued in lien to the regulatory authority as security deposit.")
    c.drawString(60, height - 395, "Non-encashable and non-transferable without written authorization from the beneficiary.")

    # Official Signatory Stamp
    if include_signatory:
        c.setStrokeColor(colors.HexColor("#0284c7"))
        c.rect(width - 230, height - 500, 160, 65, stroke=1, fill=0)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#0369a1"))
        c.drawCentredString(width - 150, height - 455, "OFFICIAL BANK STAMP")
        c.setFont("Helvetica", 8)
        c.drawCentredString(width - 150, height - 475, "Authorized Signatory")
        c.drawCentredString(width - 150, height - 490, "Branch Manager - Verified")

    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawCentredString(width / 2, 50, f"FDR GUARDIAN SYNTHETIC EVIDENCE CERTIFICATE • {fdr_number} • VERIFIABLE SHA-256")

    c.save()
    return output_path

