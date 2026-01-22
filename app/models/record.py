from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class StudyRecord(Base):
    __tablename__ = "study_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    
    # 실제 수행 데이터
    actual_minutes = Column(Integer, default=0)            # 실제 공부 시간
    actual_pages = Column(Integer, default=0)              # 실제 공부 페이지
    
    # 목표 데이터 (기록 시점의 목표를 보존하기 위해 저장)
    goal_minutes = Column(Integer, default=0)
    goal_pages = Column(Integer, default=0)
    
    # 성취도 결과 (O, 🔺, X)
    status = Column(String) 
    created_at = Column(DateTime, default=datetime.utcnow)

    # 벌금
    fine = Column(Integer, default=0)

    subject = relationship("Subject")