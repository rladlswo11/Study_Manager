from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    study_id = Column(Integer, ForeignKey("studies.id"), nullable=True) # FK 추가
    name = Column(String, nullable=False)
    importance = Column(Integer, default=3)  # AI 중요도 (1~5)
    difficulty = Column(Integer, default=3)  # AI 난이도 (1~5)
    total_pages = Column(Integer, default=0) # 전체 분량

    study = relationship("Study", back_populates="subjects")
    records = relationship("StudyRecord", back_populates="subject")