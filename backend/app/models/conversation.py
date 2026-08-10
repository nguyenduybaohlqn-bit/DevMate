from sqlalchemy import ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import mapped_column
from datetime import datetime, timezone
from app.database import Base

class Conversation(Base):
    __tablename__ = "conversations"
    
    id         = mapped_column(Integer, primary_key=True, index=True)
    user_id    = mapped_column(Integer, ForeignKey("users.id"))
    title      = mapped_column(String(100))
    created_at = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))