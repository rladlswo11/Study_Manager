from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime, date

class StudyRecord(Base):
    __tablename__ = "study_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    
    # AI 입력 양식에 맞춘 날짜 및 데이터 필드
    record_date = Column(Date, nullable=False) # 주간 요약 그룹화용
    target_minutes = Column(Integer, default=0) # AI 전송용 target명칭 사용
    target_pages = Column(Integer, default=0)
    actual_minutes = Column(Integer, default=0)
    actual_pages = Column(Integer, default=0)
    
    status = Column(String) 
    fine = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="records")
    subject = relationship("Subject", back_populates="records")