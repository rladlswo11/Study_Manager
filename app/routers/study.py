from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.study import Study, StudyMember
from app.schemas.study import StudyCreate, StudyResponse

router = APIRouter(prefix="/studies", tags=["Studies"])

@router.post("/", response_model=StudyResponse)
def create_study(
    study_in: StudyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # ⬅️ 아까 만든 인증 사용!
):
    # 1. 스터디 정보 저장
    new_study = Study(name=study_in.name, description=study_in.description)
    db.add(new_study)
    db.flush() # ID를 미리 생성하기 위해 실행

    # 2. 생성한 유저를 'owner' 역할로 멤버 테이블에 등록
    study_member = StudyMember(
        study_id=new_study.id,
        user_id=current_user.id,
        role="owner"
    )
    db.add(study_member)
    db.commit()
    db.refresh(new_study)
    
    return new_study