from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Study(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True) # 추가됨
    fine_per_absence = Column(Integer, default=0) # 이 줄도 있어야 합니다!
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("StudyMember", back_populates="study")

    subjects = relationship("Subject", back_populates="study")

class StudyMember(Base):
    __tablename__ = "study_members"

    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("studies.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, default="member")  # 'owner' 또는 'member'
    joined_at = Column(DateTime, default=datetime.utcnow)

    study = relationship("Study", back_populates="members")