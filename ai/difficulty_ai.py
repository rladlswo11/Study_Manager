from pydantic import BaseModel, Field


# =====================
# 📌 입력 모델
# =====================
class DifficultyAdjustmentRequest(BaseModel):
    current_difficulty: int = Field(..., ge=1, le=5, example=3)

    target_minutes: int = Field(..., example=120)
    target_pages: int = Field(..., example=20)

    actual_minutes: int = Field(..., example=110)
    actual_pages: int = Field(..., example=26)


# =====================
# 📌 출력 모델
# =====================
class DifficultyAdjustmentResponse(BaseModel):
    efficiency_ratio: float
    suggestion: str  # UP / DOWN / KEEP
    current_difficulty: int
    recommended_difficulty: int
    feedback: str


# =====================
# 📌 피드백 문장 생성
# =====================
def generate_difficulty_feedback(suggestion: str, efficiency_gap: float):
    if suggestion == "UP":
        return (
            f"최근 학습에서 목표 대비 학습 효율이 약 {efficiency_gap:.1f}배로 나타났어요. "
            "같은 시간 대비 학습 속도가 안정적으로 높은 편이어서, "
            "다음 학습에서는 난이도를 한 단계 높여도 괜찮을 것 같아요."
        )

    elif suggestion == "DOWN":
        return (
            f"최근 학습에서 목표 대비 학습 효율이 약 {efficiency_gap:.1f}배 수준이에요. "
            "학습 부담을 줄이기 위해 난이도를 한 단계 낮추는 것도 고려해볼 수 있어요."
        )

    else:
        return (
            f"최근 학습 효율이 목표 대비 약 {efficiency_gap:.1f}배로 안정적인 상태예요. "
            "현재 난이도를 유지하는 것이 가장 적절해 보여요."
        )


# =====================
# 📌 난이도 조정 AI 로직
# =====================
def suggest_next_difficulty(
    data: DifficultyAdjustmentRequest
) -> DifficultyAdjustmentResponse:

    # 목표 학습 효율 (페이지 / 분)
    target_efficiency = data.target_pages / data.target_minutes

    # 실제 학습 효율 (페이지 / 분)
    actual_efficiency = data.actual_pages / data.actual_minutes

    # 효율 비율
    efficiency_ratio = actual_efficiency / target_efficiency

    # 난이도 조정 판단
    if efficiency_ratio >= 1.25:
        suggestion = "UP"
        recommended_difficulty = min(data.current_difficulty + 1, 5)

    elif efficiency_ratio <= 0.7:
        suggestion = "DOWN"
        recommended_difficulty = max(data.current_difficulty - 1, 1)

    else:
        suggestion = "KEEP"
        recommended_difficulty = data.current_difficulty

    feedback = generate_difficulty_feedback(
        suggestion=suggestion,
        efficiency_gap=efficiency_ratio
    )

    return DifficultyAdjustmentResponse(
        efficiency_ratio=round(efficiency_ratio, 2),
        suggestion=suggestion,
        current_difficulty=data.current_difficulty,
        recommended_difficulty=recommended_difficulty,
        feedback=feedback
    )
