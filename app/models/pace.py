from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class SubjectPace(Base):
    __tablename__ = "subject_pace"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_name = Column(String, nullable=False) # 과목명 매칭
    pace_factor = Column(Float, default=1.0)      # AI 학습 속도 보정값
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('user_id', 'subject_name', name='_user_subject_pace_uc'),)
    user = relationship("User", back_populates="pace_entries")