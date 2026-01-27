from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import hash_password, verify_password
from app.models.study import Study, StudyMember
from app.models.user import User
from app.models.subject import Subject
from app.models.record import StudyRecord
from app.schemas.study import StudyCreate, StudyJoin, StudyResponse
from app.schemas.ranking import RankingItem

router = APIRouter(prefix="/studies", tags=["Studies"])


@router.post("/", response_model=StudyResponse)
def create_study(
    study_in: StudyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_study = Study(
        name=study_in.name,
        description=study_in.description,
        password_hash=hash_password(study_in.password),
        fine_per_absence=study_in.fine_per_absence,
    )

    db.add(new_study)
    try:
        db.flush()  # id 확보
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="이미 존재하는 스터디 방 이름입니다.")

    # 생성자는 자동 가입
    db.add(StudyMember(study_id=new_study.id, user_id=current_user.id, role="owner"))
    db.commit()
    db.refresh(new_study)
    return new_study


@router.post("/join", response_model=StudyResponse)
def join_study(
    req: StudyJoin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    study = db.query(Study).filter(Study.name == req.name).first()
    if not study:
        raise HTTPException(status_code=404, detail="해당 이름의 스터디 방을 찾을 수 없습니다.")

    if not verify_password(req.password, study.password_hash):
        raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다.")

    # 이미 가입한 경우: 그대로 반환
    exists = db.query(StudyMember).filter(
        StudyMember.study_id == study.id,
        StudyMember.user_id == current_user.id
    ).first()
    if exists:
        return study

    db.add(StudyMember(study_id=study.id, user_id=current_user.id, role="member"))
    db.commit()
    return study


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


# ✅ 랭킹: 출석(O) 횟수 기준, 동률이면 시간(분) 기준
@router.get("/{study_id}/ranking", response_model=list[RankingItem])
def get_study_ranking(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 스터디 멤버만 조회 가능
    is_member = db.query(StudyMember).filter(
        StudyMember.study_id == study_id,
        StudyMember.user_id == current_user.id
    ).first()
    if not is_member:
        raise HTTPException(status_code=403, detail="스터디 멤버만 조회할 수 있습니다.")

    # user별 집계: 출석(O) 카운트 + 누적 시간
    rec_subq = (
        db.query(
            StudyRecord.user_id.label("user_id"),
            func.coalesce(
                func.sum(case((StudyRecord.status == "O", 1), else_=0)), 0
            ).label("attendance_count"),
            func.coalesce(func.sum(StudyRecord.actual_minutes), 0).label("total_minutes"),
        )
        .join(Subject, Subject.id == StudyRecord.subject_id)
        .filter(Subject.study_id == study_id)
        .group_by(StudyRecord.user_id)
        .subquery()
    )

    # 멤버 전체 + 집계 LEFT JOIN
    rows = (
        db.query(
            User.id.label("user_id"),
            User.name.label("name"),
            User.email.label("email"),
            func.coalesce(rec_subq.c.attendance_count, 0).label("attendance_count"),
            func.coalesce(rec_subq.c.total_minutes, 0).label("total_minutes"),
        )
        .join(StudyMember, StudyMember.user_id == User.id)
        .outerjoin(rec_subq, rec_subq.c.user_id == User.id)
        .filter(StudyMember.study_id == study_id)
        .order_by(
            func.coalesce(rec_subq.c.attendance_count, 0).desc(),  # 1순위: 출석(O) 횟수
            func.coalesce(rec_subq.c.total_minutes, 0).desc(),     # 2순위: 시간(분)
            User.name.asc()
        )
        .all()
    )

    # rank 부여
    result: list[RankingItem] = []
    for idx, r in enumerate(rows, start=1):
        result.append(
            RankingItem(
                rank=idx,
                user_id=r.user_id,
                name=r.name,
                email=r.email,
                attendance_count=int(r.attendance_count),
                total_minutes=int(r.total_minutes),
            )
        )
    return result
