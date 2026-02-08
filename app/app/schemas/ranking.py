from pydantic import BaseModel


class RankingItem(BaseModel):
    rank: int
    user_id: int
    name: str
    email: str

    attendance_count: int
    total_minutes: int

    class Config:
        from_attributes = True

