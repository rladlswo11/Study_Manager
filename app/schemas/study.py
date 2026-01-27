from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class StudyBase(BaseModel):
    name: str
    description: Optional[str] = None


class StudyCreate(StudyBase):
    password: str = Field(min_length=4, max_length=64)
    fine_per_absence: int = 0


class StudyJoin(BaseModel):
    name: str
    password: str = Field(min_length=4, max_length=64)

class StudyResponse(StudyBase):
    id: int
    fine_per_absence: int
    created_at: datetime

    class Config:
        from_attributes = True
