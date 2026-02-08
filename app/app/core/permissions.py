from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.study import StudyMember
from app.models.user import User


def require_study_member(study_id: int, db: Session, user: User) -> StudyMember:
    m = db.query(StudyMember).filter(
        StudyMember.study_id == study_id,
        StudyMember.user_id == user.id
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="스터디 멤버만 가능합니다.")
    return m


def require_owner(study_id: int, db: Session, user: User) -> StudyMember:
    m = require_study_member(study_id, db, user)
    if m.role != "owner":
        raise HTTPException(status_code=403, detail="owner만 가능합니다.")
    return m
