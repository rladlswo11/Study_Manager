from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

# --- 일일 목표 계산용 ---
class SubjectInput(BaseModel):
    name: str
    importance: int = Field(ge=1, le=5)
    difficulty: int = Field(ge=1, le=5)
    total_pages: int

class DailyGoalRequest(BaseModel):
    total_minutes: int
    subjects: List[SubjectInput]

class SubjectGoalResponse(BaseModel):
    name: str
    study_minutes: int
    recommended_pages: int
    pace_factor: float

class DailyGoalResponse(BaseModel):
    total_minutes: int
    goals: List[SubjectGoalResponse]

# --- 난이도 조정용 ---
class StudyRecordInput(BaseModel):
    target_minutes: int
    target_pages: int
    actual_minutes: int
    actual_pages: int

class DifficultyAdjustRequest(BaseModel):
    subject_name: str
    current_difficulty: int
    recent_records: List[StudyRecordInput]

# --- 주간 요약용 ---
class WeeklySummaryResponse(BaseModel):
    overall_feedback: List[str]
    subject_summaries: List[dict]