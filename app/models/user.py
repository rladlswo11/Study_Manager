from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from sqlalchemy.orm import relationship

from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    provider = Column(String, default="google")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship 설정
    study_members = relationship("StudyMember", back_populates="user")
    # AI 연동을 위한 역참조 추가
    pace_entries = relationship("SubjectPace", back_populates="user")
    summaries = relationship("WeeklySummary", back_populates="user")
    records = relationship("StudyRecord", back_populates="user")
