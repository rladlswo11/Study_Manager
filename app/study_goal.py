from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List

app = FastAPI(title="Study AI API")

# =====================
# 📌 난이도별 30분당 페이지 수 (최종 합의)
# =====================
PAGES_PER_30_MIN_BY_DIFFICULTY = {
    1: 7,  # 매우 쉬움
    2: 6,  # 쉬움
    3: 5,  # 보통
    4: 4,  # 어려움
    5: 3   # 매우 어려움
}

# =====================
# 📌 입력 모델
# =====================
class SubjectInput(BaseModel):
    name: str = Field(..., example="선형대수학")
    importance: int = Field(..., ge=1, le=5, example=5)
    difficulty: int = Field(..., ge=1, le=5, example=4)

class DailyGoalRequest(BaseModel):
    total_minutes: int = Field(..., example=180)
    subjects: List[SubjectInput]

# =====================
# 📌 출력 모델
# =====================
class SubjectGoal(BaseModel):
    name: str
    study_minutes: int
    recommended_pages: int

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

    total_importance = sum(s.importance for s in request.subjects)
    goals: List[SubjectGoal] = []

    for subject in request.subjects:
        # 1️⃣ 중요도 기반 시간 배분
        time_ratio = subject.importance / total_importance
        subject_minutes = request.total_minutes * time_ratio

        # 2️⃣ 난이도 기반 학습 속도
        pages_per_30 = PAGES_PER_30_MIN_BY_DIFFICULTY[subject.difficulty]
        pages_per_minute = pages_per_30 / 30

        # 3️⃣ 목표 페이지 계산
        recommended_pages = round(subject_minutes * pages_per_minute)

        goals.append(
            SubjectGoal(
                name=subject.name,
                study_minutes=round(subject_minutes),
                recommended_pages=recommended_pages
            )
        )

    return DailyGoalResponse(
        total_minutes=request.total_minutes,
        goals=goals
    )
