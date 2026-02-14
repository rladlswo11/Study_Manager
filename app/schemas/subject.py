from pydantic import BaseModel

class SubjectCreate(BaseModel):
    name: str

class SubjectResponse(BaseModel):
    id: int
    name: str
    study_id: int

    class Config:
        from_attributes = True