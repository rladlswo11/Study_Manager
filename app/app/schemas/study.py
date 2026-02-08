from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StudyBase(BaseModel):
    name: str
    description: Optional[str] = None


class StudyCreate(StudyBase):
    fine_per_absence: int = 0


class StudyResponse(StudyBase):
    id: int
    fine_per_absence: int
    created_at: datetime

    class Config:
        from_attributes = True
