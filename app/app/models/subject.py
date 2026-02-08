from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    study_id = Column(Integer, ForeignKey("studies.id"))

    # 관계 설정
    study = relationship("Study", back_populates="subjects")