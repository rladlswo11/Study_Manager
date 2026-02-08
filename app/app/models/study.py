from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Study(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)

    # ✅ 초대 링크 방식: 비번 사용 안 함(기존 DB 호환 위해 nullable)
    password_hash = Column(String, nullable=True)

    fine_per_absence = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("StudyMember", back_populates="study")
    subjects = relationship("Subject", back_populates="study")

class StudyMember(Base):
    __tablename__ = "study_members"

    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, default="member")
    joined_at = Column(DateTime, default=datetime.utcnow)

    study = relationship("Study", back_populates="members")
    user = relationship("User", back_populates="study_members")
