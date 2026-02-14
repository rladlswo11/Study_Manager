import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_owner
from app.models.study import Study, StudyMember
from app.models.user import User
from app.models.invite import StudyInvite
from app.schemas.study import StudyCreate, StudyResponse, MyStudyResponse
from app.schemas.invite import InviteCreateRequest, InviteCreateResponse

router = APIRouter(prefix="/studies", tags=["Studies"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.post("/", response_model=StudyResponse)
def create_study(
    study_in: StudyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_study = Study(
        name=study_in.name,
        description=study_in.description,
        fine_per_absence=study_in.fine_per_absence
    )

    db.add(new_study)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="이미 존재하는 스터디 방 이름입니다.")

    db.add(StudyMember(study_id=new_study.id, user_id=current_user.id, role="owner"))
    db.commit()
    db.refresh(new_study)
    return new_study


@router.get("/list", response_model=List[MyStudyResponse])
def get_my_studies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = (
        db.query(Study, StudyMember.role)
        .join(StudyMember, Study.id == StudyMember.study_id)
        .filter(StudyMember.user_id == current_user.id)
        .all()
    )

    my_studies = []
    for study, role in results:
        # study 객체의 속성들을 유지하면서 role만 추가하여 새로운 dict 생성
        study_data = {
            "id": study.id,
            "name": study.name,
            "description": study.description,
            "fine_per_absence": study.fine_per_absence,
            "created_at": study.created_at,
            "role": role  # 가입된 역할 추가
        }
        my_studies.append(study_data)

    return my_studies # 최종적으로 [{}, {}] 형태의 리스트 반환


@router.delete("/{study_id}/leave")
def leave_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = db.query(StudyMember).filter(
        StudyMember.study_id == study_id,
        StudyMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="가입된 스터디가 아닙니다.")

    db.delete(membership)
    db.commit()
    return {"message": "스터디에서 탈퇴했습니다."}


# ✅ owner만: 초대 링크 생성 (기본 무기한)
@router.post("/{study_id}/invites", response_model=InviteCreateResponse)
def create_invite(
    study_id: int,
    request: Request,
    req: Optional[InviteCreateRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_owner(study_id, db, current_user)

    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)

    expires_at = None
    if req is not None and req.expires_in_days is not None:
        expires_at = datetime.utcnow() + timedelta(days=req.expires_in_days)

    inv = StudyInvite(
        study_id=study_id,
        created_by=current_user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    base_url = str(request.base_url).rstrip("/")
    invite_url = f"{base_url}/invites/{token}"
    return {"invite_id": inv.id, "invite_url": invite_url, "expires_at": inv.expires_at}


# ✅ owner만: 초대 링크 폐기
@router.post("/{study_id}/invites/{invite_id}/revoke")
def revoke_invite(
    study_id: int,
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_owner(study_id, db, current_user)

    inv = db.query(StudyInvite).filter(
        StudyInvite.id == invite_id,
        StudyInvite.study_id == study_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="초대 링크를 찾을 수 없습니다.")

    inv.is_revoked = True
    db.commit()
    return {"message": "초대 링크를 폐기했습니다."}


# ✅ owner만: 벌금 설정
@router.patch("/{study_id}/fine", response_model=StudyResponse)
def update_fine(
    study_id: int,
    fine_per_absence: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_owner(study_id, db, current_user)

    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="스터디를 찾을 수 없습니다.")

    study.fine_per_absence = fine_per_absence
    db.commit()
    db.refresh(study)
    return study
