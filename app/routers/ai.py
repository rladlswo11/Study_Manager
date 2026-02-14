from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.record import StudyRecord
from app.models.pace import SubjectPace
from app.auth.google import get_current_user
from datetime import date, timedelta
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI Analytics"])

# --- 주간 요약용 헬퍼 함수 ---
def _safe_div(a, b): return a / b if b else 0.0

@router.get("/weekly-summary")
def get_weekly_summary(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # 최근 7일 데이터 조회
    seven_days_ago = date.today() - timedelta(days=7)
    records = db.query(StudyRecord).filter(
        StudyRecord.user_id == current_user.id,
        StudyRecord.record_date >= seven_days_ago
    ).all()

    if not records:
        return {"message": "최근 7일간의 기록이 없습니다."}

    # 과목별 그룹화 및 분석 (보내주신 3번 파일 로직 적용)
    subject_data = {}
    for r in records:
        if r.subject_id not in subject_data:
            subject_data[r.subject_id] = {"t_min": 0, "a_min": 0, "t_pg": 0, "a_pg": 0}
        subject_data[r.subject_id]["t_min"] += r.target_minutes
        subject_data[r.subject_id]["a_min"] += r.actual_minutes
        subject_data[r.subject_id]["t_pg"] += r.target_pages
        subject_data[r.subject_id]["a_pg"] += r.actual_pages

    summary = []
    for s_id, data in subject_data.items():
        eff_ratio = _safe_div(data["a_pg"]/data["a_min"], data["t_pg"]/data["t_min"]) if data["a_min"] > 0 and data["t_min"] > 0 else 1.0
        summary.append({
            "subject_id": s_id,
            "efficiency_ratio": round(eff_ratio, 2),
            "feedback": "잘하고 있어요!" if 0.8 <= eff_ratio <= 1.2 else "조정이 필요해요."
        })

    return {"week_range": f"{seven_days_ago} ~ {date.today()}", "subjects": summary}