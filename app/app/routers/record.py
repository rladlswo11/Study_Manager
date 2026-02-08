from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.record import StudyRecord
from app.schemas.record import RecordCreate, RecordResponse
from app.auth.google import get_current_user
from app.models.user import User
from datetime import datetime
from sqlalchemy import func

router = APIRouter(prefix="/records", tags=["학습 기록"])

@router.get("/my-monthly-settlement")
def get_monthly_settlement(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. 이번 달의 시작일(1일) 구하기
    now = datetime.now()
    start_of_month = datetime(now.year, now.month, 1)

    # 2. 이번 달에 발생한 벌금 합계 쿼리
    monthly_fine = db.query(func.sum(StudyRecord.fine)).filter(
        StudyRecord.user_id == current_user.id,
        StudyRecord.created_at >= start_of_month  # 이번 달 데이터만!
    ).scalar() or 0

    # 3. 이번 달 성취도별 개수 통계 (추가 서비스!)
    stats = db.query(StudyRecord.status, func.count(StudyRecord.id)).filter(
        StudyRecord.user_id == current_user.id,
        StudyRecord.created_at >= start_of_month
    ).group_by(StudyRecord.status).all()

    # 결과 정리
    status_counts = {status: count for status, count in stats}

    return {
        "month": f"{now.year}-{now.month}",
        "total_fine": monthly_fine,
        "details": {
            "O_count": status_counts.get("O", 0),
            "triangle_count": status_counts.get("🔺", 0),
            "X_count": status_counts.get("X", 0)
        },
        "message": f"이번 달 총 벌금은 {monthly_fine:,}원입니다."
    }