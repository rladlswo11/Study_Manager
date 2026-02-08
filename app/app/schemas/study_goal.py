from pydantic import BaseModel, Field
from typing import List

# 과목별 계산 결과 (결과값만 보여줄 때 사용)
class SubjectGoal(BaseModel):
    name: str
    study_minutes: int
    recommended_pages: int

# 최종 응답 (전체 시간과 과목별 목표 리스트)
class DailyGoalResponse(BaseModel):
    total_minutes: int
    goals: List[SubjectGoal]