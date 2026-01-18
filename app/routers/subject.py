from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate, SubjectResponse

router = APIRouter(prefix="/subjects", tags=["Subjects"])

@router.post("/{study_id}", response_model=SubjectResponse)
def create_subject(
    study_id: int,
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # (선택사항) 현재 유저가 이 스터디의 멤버인지 확인하는 로직을 넣으면 더 좋습니다.
    
    new_subject = Subject(name=subject_in.name, study_id=study_id)
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject