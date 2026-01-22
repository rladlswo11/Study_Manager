from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# 기록 생성 시 요청 데이터
class RecordCreate(BaseModel):
    subject_id: int
    goal_minutes: int
    goal_pages: float
    actual_minutes: int
    actual_pages: float

# 기록 조회 시 응답 데이터
class RecordResponse(BaseModel):
    id: int
    subject_id: int
    actual_minutes: int
    actual_pages: int
    status: str
    fine: int
    created_at: datetime

    class Config:
        from_attributes = True