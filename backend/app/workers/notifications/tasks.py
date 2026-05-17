from app.core.logging import logger
from app.services.email_service import send_email
from app.workers.celery_app import celery
from app.workers.db import SyncSession


@celery.task(
    name="app.workers.notifications.tasks.send_budget_alert_email",
    bind=True,
    max_retries=3,
)
def send_budget_alert_email(self, user_id_str: str, notification_type: str, message: str):
    try:
        from sqlalchemy import select

        from app.models.user import User

        with SyncSession() as db:
            result = db.execute(select(User).where(User.id == user_id_str))
            user = result.scalar_one_or_none()
            if not user:
                return

        subject = (
            "SpendWise — Budget Exceeded Alert"
            if notification_type == "budget_exceeded"
            else "SpendWise — Budget Warning"
        )
        color = "#dc2626" if notification_type == "budget_exceeded" else "#d97706"
        icon = "🔴" if notification_type == "budget_exceeded" else "🟡"

        html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:{color};padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;">SpendWise</p>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">{icon} Budget Alert</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi <strong>{user.username}</strong>,</p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">{icon} {message}</p>
            </div>
            <p style="margin:0;font-size:13px;color:#9ca3af;">Log in to SpendWise to review your budget and spending.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">SpendWise — Personal Finance Tracker</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
        send_email(user.email, subject, html)
        logger.info("Budget alert email sent to %s", user.email)
    except Exception as exc:
        logger.error("Failed to send budget alert email: %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=60)
