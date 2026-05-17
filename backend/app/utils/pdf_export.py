import io
from datetime import date


def generate_report_pdf(
    username: str,
    currency: str,
    date_from: date,
    date_to: date,
    total_income: float,
    total_expense: float,
    net: float,
    savings_rate: float,
    categories: list[dict],
    monthly: list[dict],
) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    # Header
    pdf.set_fill_color(99, 102, 241)
    pdf.rect(0, 0, 210, 35, "F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_xy(15, 8)
    pdf.cell(0, 10, "SpendWise", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_xy(15, 20)
    pdf.cell(0, 8, f"Financial Report — {date_from} to {date_to}", ln=True)

    pdf.set_xy(15, 42)
    pdf.set_text_color(30, 30, 30)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Prepared for: {username}", ln=True)

    # Summary cards
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(0, 8, "Summary", ln=True)
    pdf.set_draw_color(200, 200, 200)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)

    col_w = 44
    stats = [
        ("Total Income", f"{currency} {total_income:,.2f}", (22, 163, 74)),
        ("Total Expense", f"{currency} {total_expense:,.2f}", (220, 38, 38)),
        (
            "Net Savings",
            f"{currency} {net:,.2f}",
            (99, 102, 241) if net >= 0 else (220, 38, 38),
        ),
        (
            "Savings Rate",
            f"{savings_rate:.1f}%",
            (22, 163, 74) if savings_rate >= 0 else (220, 38, 38),
        ),
    ]
    x_start = 15
    y = pdf.get_y()
    for i, (label, value, color) in enumerate(stats):
        x = x_start + i * (col_w + 2)
        pdf.set_fill_color(248, 250, 252)
        pdf.rect(x, y, col_w, 22, "FD")
        pdf.set_xy(x + 2, y + 3)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(col_w - 4, 5, label, ln=True)
        pdf.set_xy(x + 2, y + 10)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*color)
        pdf.cell(col_w - 4, 8, value, ln=False)

    pdf.set_y(y + 28)
    pdf.set_text_color(30, 30, 30)

    # Category breakdown
    if categories:
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Top Spending Categories", ln=True)
        pdf.set_draw_color(200, 200, 200)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(3)

        pdf.set_fill_color(243, 244, 246)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(90, 7, "Category", border="B", fill=True)
        pdf.cell(40, 7, "Amount", border="B", fill=True, align="R")
        pdf.cell(35, 7, "Share", border="B", fill=True, align="R")
        pdf.ln()

        for i, cat in enumerate(categories[:10]):
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(30, 30, 30)
            fill = i % 2 == 0
            pdf.set_fill_color(250, 251, 252)
            name = f"{cat.get('icon', '')} {cat['category_name']}"
            pdf.cell(90, 7, name[:38], fill=fill)
            pdf.cell(40, 7, f"{currency} {float(cat['total']):,.2f}", fill=fill, align="R")
            pdf.cell(35, 7, f"{float(cat['percent']):.1f}%", fill=fill, align="R")
            pdf.ln()

    # Monthly breakdown
    if monthly:
        pdf.ln(6)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(0, 8, "Monthly Breakdown", ln=True)
        pdf.set_draw_color(200, 200, 200)
        pdf.line(15, pdf.get_y(), 195, pdf.get_y())
        pdf.ln(3)

        pdf.set_fill_color(243, 244, 246)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(50, 7, "Month", border="B", fill=True)
        pdf.cell(45, 7, "Income", border="B", fill=True, align="R")
        pdf.cell(45, 7, "Expense", border="B", fill=True, align="R")
        pdf.cell(40, 7, "Net", border="B", fill=True, align="R")
        pdf.ln()

        for i, m in enumerate(monthly):
            inc = float(m.get("income", 0))
            exp = float(m.get("expense", 0))
            net_m = inc - exp
            pdf.set_font("Helvetica", "", 9)
            fill = i % 2 == 0
            pdf.set_fill_color(250, 251, 252)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(50, 7, m["month"], fill=fill)
            pdf.set_text_color(22, 163, 74)
            pdf.cell(45, 7, f"{currency} {inc:,.2f}", fill=fill, align="R")
            pdf.set_text_color(220, 38, 38)
            pdf.cell(45, 7, f"{currency} {exp:,.2f}", fill=fill, align="R")
            pdf.set_text_color(99, 102, 241) if net_m >= 0 else pdf.set_text_color(220, 38, 38)
            pdf.cell(40, 7, f"{currency} {net_m:,.2f}", fill=fill, align="R")
            pdf.ln()

    # Footer
    pdf.set_y(-20)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Generated by SpendWise — Personal Finance Tracker", align="C")

    return bytes(pdf.output())
