import sqlite3
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter(prefix="/ai", tags=["difficulty"])

# =====================
# 📌 DB (pace_factor)
# =====================
DB_PATH = Path(__file__).resolve().parents[1] / "study.db"  # Study_Manager/study.db


def _ensure_pace_table(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS subject_pace (
            subject_name TEXT PRIMARY KEY,
            pace_factor REAL NOT NULL DEFAULT 1.0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()


def get_pace_factor(subject_name: str) -> float:
    conn = sqlite3.connect(DB_PATH)
    _ensure_pace_table(conn)
    cur = conn.cursor()

    cur.execute(
        "SELECT pace_factor FROM subject_pace WHERE subject_name = ?",
        (subject_name,),
    )
    row = cur.fetchone()

    if row is None:
        cur.execute(
            "INSERT INTO subject_pace(subject_name, pace_factor) VALUES(?, ?)",
            (subject_name, 1.0),
        )
        conn.commit()
        pace = 1.0
    else:
        pace = float(row[0])

    conn.close()
    return pace


def update_pace_factor(subject_name: str, avg_efficiency_ratio: float, alpha: float = 0.2) -> float:
    """
    EMA 업데이트:
      new = old*(1-alpha) + avg_efficiency_ratio*alpha
    alpha=0.2면 최근 기록 20% 반영(안정적)
    """
    old = get_pace_factor(subject_name)
    new = round(old * (1 - alpha) + avg_efficiency_ratio * alpha, 2)

    conn = sqlite3.connect(DB_PATH)
    _ensure_pace_table(conn)
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO subject_pace(subject_name, pace_factor, updated_at)
        VALUES(?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(subject_name)
        DO UPDATE SET pace_factor=excluded.pace_factor, updated_at=CURRENT_TIMESTAMP
        """,
        (subject_name, new),
    )
    conn.commit()
    conn.close()

    return new


# =====================
# 📌 입력 모델
# =====================
class StudyRecord(BaseModel):
    target_minutes: int
    target_pages: int
    actual_minutes: int
    actual_pages: int


class DifficultyAdjustRequest(BaseModel):
    subject_name: str
    current_difficulty: int = Field(..., ge=1, le=5)
    recent_records: List[StudyRecord]


# =====================
# 📌 출력 모델
# =====================
class DifficultyAdjustResponse(BaseModel):
    subject_name: str
    avg_efficiency_ratio: float

    page_multiplier: float
    recommended_target_pages: int

    difficulty_suggestion: Optional[str]
    suggested_difficulty: Optional[int]

    old_pace_factor: float
    new_pace_factor: float

    message: str


# =====================
# 📌 AI 로직
# =====================
@router.post("/adjust-difficulty", response_model=DifficultyAdjustResponse)
def adjust_difficulty(request: DifficultyAdjustRequest):
    ratios = []

    for r in request.recent_records:
        if r.target_minutes <= 0 or r.actual_minutes <= 0:
            continue

        target_speed = r.target_pages / r.target_minutes
        actual_speed = r.actual_pages / r.actual_minutes

        if target_speed > 0:
            ratios.append(actual_speed / target_speed)

    avg_efficiency_ratio = round(sum(ratios) / len(ratios), 2) if ratios else 1.0

    # 1) 페이지 보정(메인): 한 번에 ±20% 제한
    page_multiplier = min(max(avg_efficiency_ratio, 0.8), 1.2)
    page_multiplier = round(page_multiplier, 2)

    latest_target_pages = request.recent_records[-1].target_pages if request.recent_records else 1
    recommended_target_pages = max(1, round(latest_target_pages * page_multiplier))

    # 2) 난이도 조정(격차 심할 때만)
    difficulty_suggestion = None
    suggested_difficulty = None

    if avg_efficiency_ratio >= 1.6:
        difficulty_suggestion = "UP"
        suggested_difficulty = min(5, request.current_difficulty + 1)
    elif avg_efficiency_ratio <= 0.55:
        difficulty_suggestion = "DOWN"
        suggested_difficulty = max(1, request.current_difficulty - 1)

    # 3) pace_factor 업데이트 (과목 단위)
    old_pace = get_pace_factor(request.subject_name)
    new_pace = update_pace_factor(request.subject_name, avg_efficiency_ratio)

    # 4) 메시지
    message_parts = []

    delta_pages = recommended_target_pages - latest_target_pages
    pace_diff_pct = round((new_pace - 1) * 100)

    # 1) 기본 안내
    message_parts.append(
        "최근 학습 기록을 분석해, 다음 목표 계산에 학습 속도를 반영했어요."
    )

    # 2) 학습 속도 상태 설명
    pace_diff_pct = round((new_pace - 1) * 100)

    if pace_diff_pct > 0:
        message_parts.append(
            f"{request.subject_name}은(는) 평균보다 {pace_diff_pct}% 빠르게 학습하고 있어요."
        )
    elif pace_diff_pct < 0:
        message_parts.append(
            f"{request.subject_name}은(는) 평균보다 {abs(pace_diff_pct)}% 느리게 학습하고 있어요."
        )
    else:
        message_parts.append(
            f"{request.subject_name}은(는) 평균적인 학습 속도를 유지하고 있어요."
        )

    if difficulty_suggestion == "UP":
        message_parts.append("속도 격차가 매우 커서, 난이도를 한 단계 올리는 것도 고려해볼 수 있어요.")
    elif difficulty_suggestion == "DOWN":
        message_parts.append("속도 격차가 매우 커서, 난이도를 한 단계 낮추는 것도 고려해볼 수 있어요.")

    return DifficultyAdjustResponse(
        subject_name=request.subject_name,
        avg_efficiency_ratio=avg_efficiency_ratio,
        page_multiplier=page_multiplier,
        recommended_target_pages=recommended_target_pages,
        difficulty_suggestion=difficulty_suggestion,
        suggested_difficulty=suggested_difficulty,
        old_pace_factor=old_pace,
        new_pace_factor=new_pace,
        message=" ".join(message_parts),
    )
