import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logging import logger


def send_email(to: str, subject: str, html_body: str) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_FROM:
        logger.warning("SMTP not configured — skipping email to %s", to)
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"SpendWise <{settings.SMTP_FROM}>"
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as smtp:
            smtp.ehlo()
            if settings.SMTP_USE_TLS:
                smtp.starttls()
                smtp.ehlo()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.SMTP_FROM, [to], msg.as_bytes())

        logger.info("Email sent to %s: %s", to, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc, exc_info=True)
        return False


def send_monthly_report_email(
    to: str,
    username: str,
    month_label: str,
    currency: str,
    total_income: float,
    total_expense: float,
    top_categories: list[dict],
) -> bool:
    subject = f"SpendWise — Your {month_label} Financial Summary"
    html = _render_monthly_report(
        username, month_label, currency, total_income, total_expense, top_categories
    )
    return send_email(to, subject, html)


def _render_monthly_report(
    username: str,
    month_label: str,
    currency: str,
    total_income: float,
    total_expense: float,
    top_categories: list[dict],
) -> str:
    net = total_income - total_expense
    net_color = "#16a34a" if net >= 0 else "#dc2626"
    savings_rate = (net / total_income * 100) if total_income > 0 else 0.0
    savings_color = "#16a34a" if savings_rate >= 0 else "#dc2626"

    def fmt(amount: float) -> str:
        return f"{currency} {amount:,.2f}"

    rows_html = ""
    for cat in top_categories:
        bar_pct = min(int(cat["percent"]), 100)
        rows_html += f"""
          <tr>
            <td style="padding:10px 0 10px 0;font-size:14px;color:#374151;white-space:nowrap;">{cat["icon"]}&nbsp;{cat["name"]}</td>
            <td style="padding:10px 8px;text-align:right;font-size:14px;font-weight:600;color:#374151;white-space:nowrap;">{fmt(cat["amount"])}</td>
            <td style="padding:10px 0;width:120px;">
              <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;">
                <div style="background:#6366f1;width:{bar_pct}%;height:8px;border-radius:4px;"></div>
              </div>
            </td>
          </tr>"""

    cats_section = ""
    if top_categories:
        cats_section = f"""
        <h2 style="margin:32px 0 14px;font-size:15px;font-weight:700;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:10px;">
          Top Spending Categories
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0">{rows_html}
        </table>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>SpendWise Monthly Report</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SpendWise</p>
              <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.85);">{month_label} Financial Summary</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">

              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.5;">
                Hi <strong style="color:#111827;">{username}</strong>, here&#39;s a summary of your finances for {month_label}.
              </p>

              <!-- Stat cards -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:8px;">
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 12px;text-align:center;">
                      <p style="margin:0;font-size:10px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">Income</p>
                      <p style="margin:8px 0 0;font-size:18px;font-weight:800;color:#15803d;">{fmt(total_income)}</p>
                    </div>
                  </td>
                  <td style="padding:0 4px;">
                    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:18px 12px;text-align:center;">
                      <p style="margin:0;font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Expenses</p>
                      <p style="margin:8px 0 0;font-size:18px;font-weight:800;color:#b91c1c;">{fmt(total_expense)}</p>
                    </div>
                  </td>
                  <td style="padding-left:8px;">
                    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:18px 12px;text-align:center;">
                      <p style="margin:0;font-size:10px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Net</p>
                      <p style="margin:8px 0 0;font-size:18px;font-weight:800;color:{net_color};">{fmt(net)}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Savings rate -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td style="background:#f8fafc;border-radius:8px;padding:12px 16px;">
                    <span style="font-size:13px;color:#6b7280;">Savings rate:</span>
                    <span style="font-size:13px;font-weight:700;color:{savings_color};margin-left:6px;">{savings_rate:.1f}%</span>
                  </td>
                </tr>
              </table>

              {cats_section}

              <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Log in to SpendWise to view your full reports, charts, and budget status.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                You&#39;re receiving this because you enabled monthly email reports in SpendWise.<br>
                To unsubscribe, go to <strong>Settings &#8594; Email Reports</strong> and turn it off.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
