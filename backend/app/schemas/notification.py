import uuid
from datetime import datetime

from pydantic import BaseModel

from app.enums.notification_type import NotificationType


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: NotificationType
    message: str
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}
