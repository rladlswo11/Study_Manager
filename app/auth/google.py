from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from fastapi import Header, HTTPException, status
from jose import jwt, JWTError
from fastapi.responses import RedirectResponse
from urllib.parse import urlencode
from fastapi import status

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.core.security import create_access_token

router = APIRouter(prefix="/auth/google", tags=["Auth"])

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    },
)

@router.get("/login")
async def login(request: Request):
    # 1. 현재 요청의 프로토콜(http/https)과 호스트(domain:port)를 자동으로 가져옴
    # ngrok으로 접속하면 ngrok 주소를, localhost로 접속하면 localhost를 가져옵니다.
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/auth/google/callback"
    
    # 보안상 HTTPS 강제가 필요할 수 있음 (ngrok은 보통 https 사용)
    if "ngrok-free.app" in base_url:
        redirect_uri = redirect_uri.replace("http://", "https://")

    request.session['login_fix'] = "true" 
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    # 세션 디버깅 (필요 시 유지)
    print("DEBUG SESSION:", request.session) 
    
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        # 실패 시 에러 페이지나 특정 프론트 경로로 리다이렉트 가능
        return {
            "error": "Session still empty",
            "debug": str(e),
            "hint": "주소창에 127.0.0.1 대신 localhost를 썼는지 확인하세요."
        }

    user_info = token.get("userinfo")
    if not user_info:
        return {"error": "Failed to get user info from Google"}

    # 유저 확인 및 생성 로직
    user = db.query(User).filter(User.email == user_info["email"]).first()
    if not user:
        user = User(
            email=user_info["email"],
            name=user_info["name"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 1. 자체 JWT 액세스 토큰 생성
    access_token = create_access_token({"user_id": user.id})

    # 2. 리다이렉트할 프론트엔드 주소 설정
    # 로컬/ngrok 환경에 따라 유동적으로 설정하고 싶다면 
    # base_url = "https://your-ngrok.app" if "ngrok" in str(request.base_url) else "http://localhost:5173"
    frontend_url = "http://localhost:5173" 
    
    # 3. 쿼리 스트링 조립 (token=...)
    params = urlencode({"token": access_token})
    
    # 4. 프론트엔드로 리다이렉트
    # 최종 URL 예시: http://localhost:5173/?token=eyJhbG...
    return RedirectResponse(
        url=f"{frontend_url}/?{params}", 
        status_code=status.HTTP_302_FOUND
    )

# 토큰을 검증해서 현재 유저 객체를 반환하는 함수
async def get_current_user(
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="토큰이 없습니다.")

    try:
        # "Bearer <token>" 형태에서 토큰만 추출
        token = authorization.split(" ")[1]
        # 토큰 해독 (보안 설정에 맞춰 SECRET_KEY 등이 필요할 수 있음)
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: int = payload.get("user_id")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    except (JWTError, IndexError):
        raise HTTPException(status_code=401, detail="토큰 해독에 실패했습니다.")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")
    
    return user