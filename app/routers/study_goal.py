from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subject import Subject
from app.models.record import StudyRecord
from app.models.user import User
from app.models.pace import SubjectPace
from app.auth.google import get_current_user
from typing import List
from pydantic import BaseModel
from datetime import datetime, date

router = APIRouter(prefix="/study-goal", tags=["Daily Routine"])

PAGES_PER_HOUR_BY_DIFFICULTY = {1: 13, 2: 11, 3: 9, 4: 8, 5: 7}

# --- Schemas ---
class SubjectDifficultyInput(BaseModel):
    subject_id: int
    difficulty: int

class DailyGoalRequest(BaseModel):
    total_minutes: int
    subjects: List[SubjectDifficultyInput]

class SubjectRecordInput(BaseModel):
    subject_id: int
    actual_minutes: int
    actual_pages: int

class BatchRecordUpdate(BaseModel):
    records: List[SubjectRecordInput]

# --- Logic ---
@router.post("/calculate")
def calculate_dynamic_goal(request: DailyGoalRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subjects_info = []
    total_weight = 0
    
    for s_input in request.subjects:
        db_subject = db.query(Subject).filter(Subject.id == s_input.subject_id).first()
        if not db_subject: continue
        
        weight = db_subject.importance * db_subject.total_pages
        total_weight += weight
        subjects_info.append((db_subject, s_input.difficulty, weight))

    if not subjects_info or total_weight == 0:
        raise HTTPException(status_code=400, detail="유효한 과목 데이터가 없습니다.")

    created_goals = []
    for db_subject, diff, weight in subjects_info:
        time_ratio = weight / total_weight
        allocated_minutes = round(request.total_minutes * time_ratio)

        # Pace Factor 조회
        pace_entry = db.query(SubjectPace).filter_by(user_id=current_user.id, subject_name=db_subject.name).first()
        pace = pace_entry.pace_factor if pace_entry else 1.0
        
        pages_per_min = (PAGES_PER_HOUR_BY_DIFFICULTY.get(diff, 9) * pace) / 60
        recommended_pages = min(round(allocated_minutes * pages_per_min), db_subject.total_pages)

        new_record = StudyRecord(
            user_id=current_user.id,
            subject_id=db_subject.id,
            record_date=date.today(),
            target_minutes=allocated_minutes,
            target_pages=recommended_pages,
            actual_minutes=0,
            actual_pages=0,
            status="PENDING"
        )
        db.add(new_record)
        created_goals.append({"subject_name": db_subject.name, "target_minutes": allocated_minutes, "target_pages": recommended_pages})

    db.commit()
    return {"goals": created_goals}

@router.post("/complete-records")
def complete_records(data: BatchRecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = []
    for item in data.records:
        record = db.query(StudyRecord).filter(
            StudyRecord.user_id == current_user.id,
            StudyRecord.subject_id == item.subject_id,
            StudyRecord.status == "PENDING"
        ).order_by(StudyRecord.id.desc()).first()

        if not record: continue

        # 성취도 및 Pace Factor(EMA) 반영
        target_speed = record.target_pages / record.target_minutes if record.target_minutes > 0 else 0
        actual_speed = item.actual_minutes and item.actual_pages / item.actual_minutes or 0
        ratio = actual_speed / target_speed if target_speed > 0 else 1.0

        # Pace Factor 업데이트
        db_subject = db.query(Subject).filter(Subject.id == item.subject_id).first()
        pace_entry = db.query(SubjectPace).filter_by(user_id=current_user.id, subject_name=db_subject.name).first()
        if pace_entry:
            pace_entry.pace_factor = round(pace_entry.pace_factor * 0.8 + ratio * 0.2, 2)
            pace_entry.updated_at = datetime.utcnow()

        record.actual_minutes, record.actual_pages = item.actual_minutes, item.actual_pages
        record.status = "O" if item.actual_pages >= record.target_pages else "X"
        results.append({"subject": db_subject.name, "status": record.status})

    db.commit()
    return {"results": results}