from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from fastapi import Header, HTTPException, status
from jose import jwt, JWTError

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
    # 1. 현재 요청이 들어온 도메인을 기반으로 리다이렉트 주소 생성
    # ngrok으로 들어오면 ngrok 주소가, localhost로 들어오면 localhost 주소가 잡힙니다.
    base_url = str(request.base_url).rstrip('/')
    
    # 만약 ngrok이 http로 인식된다면, https로 강제 변환 (OAuth 보안 필수)
    if "ngrok-free.dev" in base_url:
        base_url = base_url.replace("http://", "https://")
        
    redirect_uri = f"{base_url}/auth/google/callback"
    
    # 디버깅용 출력 (터미널에서 확인 가능)
    print(f"DEBUG: Generated redirect_uri is {redirect_uri}")

    request.session["test_session"] = "session_is_working"
    request.session['login_fix'] = "true" 
    
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    # 여기서 "test_session"이 찍히는지 확인하세요.
    print("DEBUG SESSION:", request.session) 
    
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        # 세션이 여전히 비어 있다면 브라우저 설정 혹은 미들웨어 위치 문제입니다.
        return {
            "error": "Session still empty",
            "debug": str(e),
            "session_content": request.session,
            "hint": "주소창에 127.0.0.1 대신 localhost를 썼는지 확인하세요."
        }

    user_info = token.get("userinfo")

    if not user_info:
        return {"error": "Failed to get user info from Google"}

    user = db.query(User).filter(User.email == user_info["email"]).first()

    if not user:
        user = User(
            email=user_info["email"],
            name=user_info["name"]
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"user_id": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
    }

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