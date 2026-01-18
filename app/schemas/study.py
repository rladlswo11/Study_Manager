from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class StudyBase(BaseModel):
    name: str
    description: Optional[str] = None

class StudyCreate(StudyBase):
    pass

class StudyResponse(StudyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True