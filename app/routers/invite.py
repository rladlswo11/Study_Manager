import hashlib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.invite import StudyInvite
from app.models.study import StudyMember, Study
from app.models.user import User
from app.schemas.invite import InvitePreviewResponse


invite_router = APIRouter(prefix="/invites", tags=["Invites"])


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _validate_invite(inv: StudyInvite):
    if not inv or inv.is_revoked:
        raise HTTPException(status_code=404, detail="유효하지 않은 초대 링크입니다.")
    if inv.expires_at and inv.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="만료된 초대 링크입니다.")


@invite_router.get("/{token}", response_model=InvitePreviewResponse)
def preview_invite(token: str, db: Session = Depends(get_db)):
    token_hash = _hash_token(token)
    inv = db.query(StudyInvite).filter(StudyInvite.token_hash == token_hash).first()
    _validate_invite(inv)

    study = db.query(Study).filter(Study.id == inv.study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="스터디가 존재하지 않습니다.")

    return {
        "study_id": study.id,
        "name": study.name,
        "description": study.description,
        "expires_at": inv.expires_at
    }


@invite_router.post("/{token}/accept")
def accept_invite(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    token_hash = _hash_token(token)
    inv = db.query(StudyInvite).filter(StudyInvite.token_hash == token_hash).first()
    _validate_invite(inv)

    exists = db.query(StudyMember).filter(
        StudyMember.study_id == inv.study_id,
        StudyMember.user_id == current_user.id
    ).first()
    if exists:
        return {"message": "이미 가입된 멤버입니다.", "study_id": inv.study_id}

    db.add(StudyMember(study_id=inv.study_id, user_id=current_user.id, role="member"))
    db.commit()
    return {"message": "스터디에 가입했습니다.", "study_id": inv.study_id}
