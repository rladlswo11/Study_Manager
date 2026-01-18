import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv

# 1️⃣ 환경 변수 로드 및 OAuth 보안 설정 (반드시 다른 import보다 우선)
load_dotenv()

# 로컬(HTTP) 환경에서 OAuth 상태값(state) 검증을 허용하기 위한 필수 설정
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
os.environ['AUTHLIB_INSECURE_TRANSPORT'] = 'true'

from app.core.database import Base, engine
from app.auth.google import router as google_router
from app.routers.user import router as user_router
from app.core.config import settings
from app.routers.study import router as study_router
from app.routers.subject import router as subject_router

# 2️⃣ FastAPI 앱 초기화
app = FastAPI(
    title="Study Manager API",
    description="스터디 관리 서비스 API",
    version="0.1.0",
)

# 3️⃣ 미들웨어 설정
# ✅ SessionMiddleware: Google OAuth의 state 유지를 위해 필수
# secret_key는 .env의 SECRET_KEY를 사용하며, SameSite 설정을 'lax'로 하여 리다이렉션 시 쿠키 유실 방지
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie="study_session",
    same_site="lax",  # 중요: 외부(Google)에서 우리 서버로 올 때 쿠키를 허용
    https_only=False  # 중요: 로컬(http) 테스트 시 False
)

# ✅ CORS: 프론트엔드 연동을 위한 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시에는 특정 도메인으로 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4️⃣ DB 테이블 생성 (Alembic 미사용 시)
Base.metadata.create_all(bind=engine)

# 5️⃣ 라우터 등록
app.include_router(user_router)
app.include_router(google_router)
app.include_router(study_router)
app.include_router(subject_router)

# 6️⃣ 헬스체크 및 환경 확인
@app.get("/ping", tags=["Health"])
def ping():
    return {"message": "pong", "status": "active"}

@app.get("/")
def read_root():
    return {"message": "Study Manager API is running!"}

if __name__ == "__main__":
    import uvicorn
    # 구글 콘솔에 등록한 리디렉션 URI와 일치하도록 포트 8000 사용
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)