from __future__ import annotations

from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

# pace_factor는 difficulty_ai에서 관리(저장/업데이트). 주간요약에서는 "조회만" 한다.
try:
    from ai.difficulty_ai import get_pace_factor
except Exception:
    get_pace_factor = None  # type: ignore


router = APIRouter(prefix="/ai", tags=["weekly-summary"])


# =====================
# 입력 모델
# =====================
class WeeklyStudyRecord(BaseModel):
    """
    한 번의 공부 기록(하루/세션 단위).
    - 주간요약은 '속도' 중심으로 평가하므로 minutes가 핵심.
    """
    record_date: date = Field(..., description="기록 날짜(YYYY-MM-DD)")
    subject_name: str = Field(..., min_length=1)

    target_minutes: int = Field(..., ge=1)
    target_pages: int = Field(..., ge=0)

    actual_minutes: int = Field(..., ge=1)
    actual_pages: int = Field(..., ge=0)

    # 선택: 있으면 보고서에서 참고로만 사용(없어도 됨)
    difficulty: Optional[int] = Field(None, ge=1, le=5, description="난이도(1~5), optional")


class WeeklySummaryRequest(BaseModel):
    records: List[WeeklyStudyRecord] = Field(..., min_length=1)

    # 선택: 프론트에서 주차 범위를 내려주고 싶으면 사용
    week_start: Optional[date] = None
    week_end: Optional[date] = None

    @field_validator("records")
    @classmethod
    def _validate_records(cls, v: List[WeeklyStudyRecord]):
        # 날짜/과목명 정리(공백 제거)
        for r in v:
            r.subject_name = r.subject_name.strip()
        return v


# =====================
# 출력 모델
# =====================
class SubjectWeeklySummary(BaseModel):
    subject_name: str

    total_target_minutes: int
    total_actual_minutes: int
    total_target_pages: int
    total_actual_pages: int

    avg_target_speed_ppm: float  # pages per minute
    avg_actual_speed_ppm: float  # pages per minute
    weighted_efficiency_ratio: float  # (actual_speed / target_speed) minutes-weighted

    consistency_score: float  # 0~100 (높을수록 안정적)
    trend: str  # "UP" | "DOWN" | "FLAT" | "UNKNOWN"

    pace_factor: Optional[float] = None
    pace_message: Optional[str] = None

    feedback: List[str] = []


class WeeklyOverallSummary(BaseModel):
    week_start: Optional[date] = None
    week_end: Optional[date] = None

    total_target_minutes: int
    total_actual_minutes: int
    total_target_pages: int
    total_actual_pages: int

    avg_target_speed_ppm: float
    avg_actual_speed_ppm: float
    weighted_efficiency_ratio: float  # 전체 minutes-weighted

    overall_feedback: List[str]


class WeeklySummaryResponse(BaseModel):
    overall: WeeklyOverallSummary
    subjects: List[SubjectWeeklySummary]


# =====================
# 유틸
# =====================
def _safe_div(a: float, b: float) -> float:
    return a / b if b else 0.0


def _round2(x: float) -> float:
    return float(f"{x:.2f}")


def _calc_efficiency_ratio(
    target_pages: int, target_minutes: int, actual_pages: int, actual_minutes: int
) -> float:
    """
    adjust-difficulty와 동일한 관점:
    ratio = (actual_pages/actual_minutes) / (target_pages/target_minutes)
    """
    target_speed = _safe_div(target_pages, target_minutes)
    actual_speed = _safe_div(actual_pages, actual_minutes)
    if target_speed <= 0:
        # 목표 페이지가 0인 특이 케이스: 평가 불가이므로 중립 처리
        return 1.0
    return _safe_div(actual_speed, target_speed)


def _minutes_weighted_avg(pairs: List[Tuple[float, int]]) -> float:
    """
    (값, 가중치=분) minutes-weighted average
    """
    total_w = sum(w for _, w in pairs)
    if total_w <= 0:
        return 0.0
    return sum(val * w for val, w in pairs) / total_w


def _consistency_score(ratios: List[float]) -> float:
    """
    대충 '안정성' 점수:
    - ratio가 1.0 근처 + 변동 적을수록 높게
    - 표준편차 기반 간단 스코어(0~100)
    """
    if not ratios:
        return 50.0
    n = len(ratios)
    mean = sum(ratios) / n
    var = sum((x - mean) ** 2 for x in ratios) / n
    std = var ** 0.5

    # std가 0이면 100, std가 0.5면 대략 0에 가깝게
    score = max(0.0, 100.0 - (std * 200.0))
    return _round2(score)


def _trend_label(records_sorted: List[WeeklyStudyRecord]) -> str:
    """
    초반/후반(반으로 나눠) efficiency 비교해서 간단 트렌드.
    """
    if len(records_sorted) < 4:
        return "UNKNOWN"

    mid = len(records_sorted) // 2
    first = records_sorted[:mid]
    second = records_sorted[mid:]

    def avg_eff(rs: List[WeeklyStudyRecord]) -> float:
        pairs = []
        for r in rs:
            ratio = _calc_efficiency_ratio(r.target_pages, r.target_minutes, r.actual_pages, r.actual_minutes)
            pairs.append((ratio, r.actual_minutes))
        return _minutes_weighted_avg(pairs)

    a = avg_eff(first)
    b = avg_eff(second)

    # 5% 이상 차이 날 때만 의미있게
    if b >= a * 1.05:
        return "UP"
    if b <= a * 0.95:
        return "DOWN"
    return "FLAT"


def _pace_sentence(subject_name: str, pace_factor: float) -> str:
    diff_pct = round((pace_factor - 1.0) * 100)
    if diff_pct > 0:
        return f"{subject_name}은(는) 평균보다 {diff_pct}% 빠르게 학습하고 있어요."
    if diff_pct < 0:
        return f"{subject_name}은(는) 평균보다 {abs(diff_pct)}% 느리게 학습하고 있어요."
    return f"{subject_name}은(는) 평균적인 학습 속도를 유지하고 있어요."


def _feedback_from_efficiency(subject_name: str, eff: float) -> List[str]:
    """
    주간 피드백: adjust-difficulty의 기준을 주간 평균에 적용
    - 0.8~1.2는 '정상 범위'
    - 극단(>=1.6, <=0.55)은 난이도 조정 시그널
    """
    msgs: List[str] = []

    # 정상 범위
    if 0.8 <= eff <= 1.2:
        msgs.append(f"{subject_name}: 목표 설정이 전반적으로 잘 맞았어요.")
    elif eff > 1.2:
        msgs.append(f"{subject_name}: 목표 대비 속도가 빠른 편이라, 목표량을 조금 올려도 좋아요.")
    else:  # eff < 0.8
        msgs.append(f"{subject_name}: 목표 대비 속도가 느린 편이라, 목표량을 조금 낮추는 게 안정적이에요.")

    # 극단 격차(난이도 조정 시그널)
    if eff >= 1.6:
        msgs.append(f"{subject_name}: 격차가 큰 편이라, 난이도를 한 단계 올리는 것도 고려해볼 수 있어요.")
    elif eff <= 0.55:
        msgs.append(f"{subject_name}: 격차가 큰 편이라, 난이도를 한 단계 낮추는 것도 고려해볼 수 있어요.")

    return msgs


def _overall_feedback(eff: float, total_minutes: int) -> List[str]:
    msgs: List[str] = []

    if total_minutes < 60:
        msgs.append("이번 주 기록이 적어서(1시간 미만) 판단이 다소 불안정할 수 있어요.")

    if 0.9 <= eff <= 1.1:
        msgs.append("이번 주 전체적으로 목표 대비 실제 페이스가 안정적이었어요.")
    elif eff > 1.1:
        msgs.append("이번 주는 목표보다 빠르게 진행된 편이에요. 다음 주 목표가 조금 상향될 수 있어요.")
    else:
        msgs.append("이번 주는 목표보다 느리게 진행된 편이에요. 다음 주는 목표를 조금 보수적으로 잡아도 좋아요.")

    return msgs


# =====================
# 엔드포인트
# =====================
@router.post("/weekly-summary", response_model=WeeklySummaryResponse)
def weekly_summary(request: WeeklySummaryRequest) -> WeeklySummaryResponse:
    # 날짜 범위(없으면 records에서 계산)
    dates = sorted({r.record_date for r in request.records})
    week_start = request.week_start or (dates[0] if dates else None)
    week_end = request.week_end or (dates[-1] if dates else None)

    # 과목별로 그룹핑
    by_subject: Dict[str, List[WeeklyStudyRecord]] = {}
    for r in request.records:
        by_subject.setdefault(r.subject_name, []).append(r)

    subjects_out: List[SubjectWeeklySummary] = []

    # 전체 집계용
    overall_target_minutes = 0
    overall_actual_minutes = 0
    overall_target_pages = 0
    overall_actual_pages = 0

    overall_ratio_pairs: List[Tuple[float, int]] = []  # (ratio, actual_minutes)

    for subject_name, records in by_subject.items():
        records_sorted = sorted(records, key=lambda x: (x.record_date, x.subject_name))

        t_min = sum(r.target_minutes for r in records_sorted)
        a_min = sum(r.actual_minutes for r in records_sorted)
        t_pages = sum(r.target_pages for r in records_sorted)
        a_pages = sum(r.actual_pages for r in records_sorted)

        overall_target_minutes += t_min
        overall_actual_minutes += a_min
        overall_target_pages += t_pages
        overall_actual_pages += a_pages

        target_speed = _safe_div(t_pages, t_min)  # pages/min
        actual_speed = _safe_div(a_pages, a_min)  # pages/min

        ratio_pairs: List[Tuple[float, int]] = []
        ratios_raw: List[float] = []
        for r in records_sorted:
            ratio = _calc_efficiency_ratio(r.target_pages, r.target_minutes, r.actual_pages, r.actual_minutes)
            ratio_pairs.append((ratio, r.actual_minutes))
            ratios_raw.append(ratio)

        weighted_eff = _minutes_weighted_avg(ratio_pairs)
        weighted_eff = _round2(weighted_eff)

        for ratio, w in ratio_pairs:
            overall_ratio_pairs.append((ratio, w))

        consistency = _consistency_score(ratios_raw)
        trend = _trend_label(records_sorted)

        # pace_factor 조회(가능하면)
        pace_factor: Optional[float] = None
        pace_msg: Optional[str] = None
        if get_pace_factor is not None:
            try:
                pace_factor = float(get_pace_factor(subject_name))
                pace_factor = _round2(pace_factor)
                pace_msg = _pace_sentence(subject_name, pace_factor)
            except Exception:
                pace_factor = None
                pace_msg = None

        feedback = _feedback_from_efficiency(subject_name, weighted_eff)

        subjects_out.append(
            SubjectWeeklySummary(
                subject_name=subject_name,
                total_target_minutes=t_min,
                total_actual_minutes=a_min,
                total_target_pages=t_pages,
                total_actual_pages=a_pages,
                avg_target_speed_ppm=_round2(target_speed),
                avg_actual_speed_ppm=_round2(actual_speed),
                weighted_efficiency_ratio=weighted_eff,
                consistency_score=consistency,
                trend=trend,
                pace_factor=pace_factor,
                pace_message=pace_msg,
                feedback=feedback,
            )
        )

    # 과목 정렬: 실제 공부시간 많은 순
    subjects_out.sort(key=lambda s: s.total_actual_minutes, reverse=True)

    overall_target_speed = _safe_div(overall_target_pages, overall_target_minutes)
    overall_actual_speed = _safe_div(overall_actual_pages, overall_actual_minutes)
    overall_eff = _minutes_weighted_avg(overall_ratio_pairs)
    overall_eff = _round2(overall_eff)

    overall_fb = _overall_feedback(overall_eff, overall_actual_minutes)

    overall_out = WeeklyOverallSummary(
        week_start=week_start,
        week_end=week_end,
        total_target_minutes=overall_target_minutes,
        total_actual_minutes=overall_actual_minutes,
        total_target_pages=overall_target_pages,
        total_actual_pages=overall_actual_pages,
        avg_target_speed_ppm=_round2(overall_target_speed),
        avg_actual_speed_ppm=_round2(overall_actual_speed),
        weighted_efficiency_ratio=overall_eff,
        overall_feedback=overall_fb,
    )

    return WeeklySummaryResponse(overall=overall_out, subjects=subjects_out)
