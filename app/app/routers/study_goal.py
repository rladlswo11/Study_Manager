from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subject import Subject
from app.models.record import StudyRecord
from app.models.user import User
from app.schemas.study_goal import DailyGoalResponse, SubjectGoal
from app.schemas.record import RecordCreate
from app.auth.google import get_current_user
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

router = APIRouter(prefix="/study-goal", tags=["학습 목표 계산"])

PAGES_PER_30_MIN_BY_DIFFICULTY = {
    1: 7,  # 매우 쉬움
    2: 6,  # 쉬움
    3: 5,  # 보통
    4: 4,  # 어려움
    5: 3   # 매우 어려움
}

class SubjectDifficultyInput(BaseModel):
    subject_id: int  # 과목의 고유 ID
    difficulty: int  # 사용자가 오늘 느끼는 난이도 (1~5)

class DailyGoalRequest(BaseModel):
    total_minutes: int
    subjects: List[SubjectDifficultyInput]

class RecordUpdate(BaseModel):
    actual_minutes: int
    actual_pages: float

@router.post("/calculate")
def calculate_dynamic_goal(
    request: DailyGoalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    total_weight = sum(s.difficulty for s in request.subjects)

    if total_weight == 0:
        raise HTTPException(status_code=400, detail="난이도 합계가 0일 수 없습니다.")
    
    created_goals = []
    for s in request.subjects:
        db_subject = db.query(Subject).filter(Subject.id == s.subject_id).first()
        if not db_subject:
            continue
            
        # 1. AI 로직 계산
        importance_ratio = s.difficulty / total_weight
        allocated_minutes = round(request.total_minutes * importance_ratio)
        pages_per_30 = PAGES_PER_30_MIN_BY_DIFFICULTY.get(s.difficulty, 5)
        recommended_pages = round((allocated_minutes / 30) * pages_per_30, 1)

        # 2. DB에 '목표' 레코드 미리 생성 (실제값은 0으로 초기화)
        new_record = StudyRecord(
            user_id=current_user.id,
            subject_id=s.subject_id,
            goal_minutes=allocated_minutes,
            goal_pages=recommended_pages,
            actual_minutes=0,
            actual_pages=0,
            status="PENDING", # 아직 완료 전임을 표시
            fine=0,
            created_at=datetime.now() # 오늘 날짜 기준
        )
        db.add(new_record)
        created_goals.append({
            "subject_name": db_subject.name,
            "goal_minutes": allocated_minutes,
            "goal_pages": recommended_pages
        })

    db.commit()
    return {"message": "오늘의 목표가 생성되었습니다.", "goals": created_goals}

class SubjectRecordInput(BaseModel):
    subject_id: int
    actual_minutes: int
    actual_pages: float

class BatchRecordUpdate(BaseModel):
    records: List[SubjectRecordInput]

@router.post("/complete-records")
def complete_multiple_study_records(
    data: BatchRecordUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = []
    
    # 전달받은 리스트를 반복문으로 하나씩 처리
    for item in data.records:
        # 해당 과목의 대기 중인(PENDING) 목표 찾기
        record = db.query(StudyRecord).filter(
            StudyRecord.user_id == current_user.id,
            StudyRecord.subject_id == item.subject_id,
            StudyRecord.status == "PENDING"
        ).order_by(StudyRecord.id.desc()).first()

        if not record:
            # 기록이 없으면 에러를 내지 않고 결과에만 표시 (다른 과목 처리를 위해)
            results.append({"subject_id": item.subject_id, "status": "ERROR", "message": "목표 없음"})
            continue

        # 벌금 및 성취도 판정
        status = "X"
        fine = 0
        if item.actual_pages >= record.goal_pages:
            status = "O"
        elif item.actual_minutes >= record.goal_minutes:
            status = "🔺"
            fine = 1000
        else:
            status = "X"
            fine = 2000

        # 데이터 업데이트
        record.actual_minutes = item.actual_minutes
        record.actual_pages = item.actual_pages
        record.status = status
        record.fine = fine
        
        results.append({
            "subject_id": item.subject_id,
            "status": status,
            "fine": fine
        })

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"저장 중 오류: {str(e)}")

    return {"message": "일괄 처리가 완료되었습니다.", "results": results}