from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class InviteCreateRequest(BaseModel):
    # 기본 무기한(None), 값 넣으면 만료 링크
    expires_in_days: Optional[int] = Field(default=None, ge=1, le=365)


class InviteCreateResponse(BaseModel):
    invite_id: int
    invite_url: str
    expires_at: Optional[datetime] = None


class InvitePreviewResponse(BaseModel):
    study_id: int
    name: str
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
