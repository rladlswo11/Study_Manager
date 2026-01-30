from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List

from ai.difficulty_ai import get_pace_factor

from ai.difficulty_ai import router as difficulty_router
from ai.weekly_summary_ai import router as weekly_summary_router

app = FastAPI(title="Study AI API")

app.include_router(difficulty_router)
app.include_router(weekly_summary_router)


# =====================
# 📌 난이도별 1시간당 페이지 수
# =====================
PAGES_PER_HOUR_BY_DIFFICULTY = {
    1: 13,  # 매우 쉬움 
    2: 11,  # 쉬움   
    3: 9,  # 보통   
    4: 8,   # 어려움 
    5: 7    # 매우 어려움 
}

# =====================
# 📌 입력 모델
# =====================
class SubjectInput(BaseModel):
    name: str = Field(..., example="선형대수학")
    importance: int = Field(..., ge=1, le=5, example=5)
    difficulty: int = Field(..., ge=1, le=5, example=4)

    # ✅ 추가: 과목 전체 페이지 수
    total_pages: int = Field(..., ge=1, example=500)

class DailyGoalRequest(BaseModel):
    total_minutes: int = Field(..., ge=1, example=180)
    subjects: List[SubjectInput]

# =====================
# 📌 출력 모델
# =====================
class SubjectGoal(BaseModel):
    name: str
    study_minutes: int
    recommended_pages: int
    pace_factor: float

class DailyGoalResponse(BaseModel):
    total_minutes: int
    goals: List[SubjectGoal]

# =====================
# 📌 헬스 체크
# =====================
@app.get("/ping")
def ping():
    return {"message": "pong"}

# =====================
# 📌 AI: 하루 학습 목표량 계산
# =====================
@app.post("/ai/daily-goal", response_model=DailyGoalResponse)
def calculate_daily_goal(request: DailyGoalRequest):
    """
    개선 포인트:
    - 시간 배분을 importance만 보지 않고 importance * total_pages로 가중치 부여
    - 난이도별 속도는 1시간당 페이지 수 기반
    - 목표 페이지는 과목 total_pages를 넘지 않게 캡(min)
    """

    # 1) 과목별 가중치(중요도 × 전체페이지)
    weights = [s.importance * s.total_pages for s in request.subjects]
    total_weight = sum(weights)

    # 예외 방어(이론상 total_pages>=1이라 0 안 나오지만 안전하게)
    if total_weight == 0:
        total_weight = 1

    goals: List[SubjectGoal] = []

    for subject, w in zip(request.subjects, weights):
        # 2) 분량+중요도 기반 시간 배분
        time_ratio = w / total_weight
        subject_minutes = request.total_minutes * time_ratio

        # 3) 난이도 + 개인 pace_factor 기반 학습 속도
        pace = get_pace_factor(subject.name)  # 과목별 개인 속도 보정
        pages_per_hour = PAGES_PER_HOUR_BY_DIFFICULTY[subject.difficulty] * pace
        pages_per_minute = pages_per_hour / 60


        # 4) 목표 페이지 계산 + 전체 페이지 수 넘지 않게 캡
        raw_pages = round(subject_minutes * pages_per_minute)
        recommended_pages = min(raw_pages, subject.total_pages)

        goals.append(
            SubjectGoal(
                name=subject.name,
                study_minutes=round(subject_minutes),
                recommended_pages=recommended_pages,
                pace_factor=round(pace, 2)
            )
        )

    return DailyGoalResponse(
        total_minutes=request.total_minutes,
        goals=goals
    )

