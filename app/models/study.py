from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Study(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True)

    # 방 이름으로 입장하려면 중복 방이름을 막는 게 안전함
    name = Column(String, nullable=False, unique=True)

    description = Column(String, nullable=True)

    # ✅ 방 비밀번호는 평문 저장 금지 -> 해시 저장
    password_hash = Column(String, nullable=False)

    fine_per_absence = Column(Integer, default=0)
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
    user = relationship("User", back_populates="study_members")
