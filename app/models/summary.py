from sqlalchemy import Column, Integer, Text, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class WeeklySummary(Base):
    __tablename__ = "weekly_summaries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    summary_text = Column(Text, nullable=False) # AI 결과 텍스트
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="summaries")