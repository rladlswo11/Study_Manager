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

    study_members = relationship("StudyMember", back_populates="user")
