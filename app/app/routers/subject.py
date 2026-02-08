from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_study_member
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectResponse

router = APIRouter(prefix="/subjects", tags=["Subjects"])


@router.post("/{study_id}", response_model=SubjectResponse)
def create_subject(
    study_id: int,
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # ✅ 멤버면 과목 생성 가능 (owner 포함)
    require_study_member(study_id, db, current_user)

    new_subject = Subject(name=subject_in.name, study_id=study_id)
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject
