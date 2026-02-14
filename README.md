# ✍️ 스터디 관리 서비스
Google 로그인을 지원하는 스터디 관리 프로젝트

## 현재 구현된 기능
* **Auth**: Google OAuth2 로그인 및 JWT 토큰 발급
* **Study**: 스터디 그룹 생성 및 관리

* **Subject**: 스터디별 세부 공부 과목 등록

## 가상환경 설정 및 라이브러리 설치

### 실행 방법 (How to Run)

1. **가상환경 설치**
```bash
python -m venv venv

.\venv\Scripts\activate  # Windows
.\venv\Scripts\Activate.ps1 도되네요
# (venv) 나오면 성공
```

2. **필수 라이브러리 설치**
```bash
pip install -r requirements.txt
```

3. **실행**
```bash
uvicorn app.main:app --reload
```

## 환경 변수 설정
프로젝트 루트 폴더에 .env 파일을 생성하고 아래 내용을 입력하세요. (본인의 API 키가 필요합니다.)
```env
# .env 파일 예시 (본인의 키로 교체 필요)
GOOGLE_CLIENT_ID=본인의_구글_클라이언트_ID
GOOGLE_CLIENT_SECRET=본인의_구글_클라이언트_시크릿
SECRET_KEY=9a7f3c0e3d5b8f8b6a9c7f0d3b6e4f2a9d8c1e7b0a4f5c6d8e9f1a2b3c4d5e
ALGORITHM=HS256
AUTHLIB_INSECURE_TRANSPORT=true
```

4. **여러분을위한!(나를위한..) 로그인 방법**
   * cmd에서 파일 위치로 들어간 후: py -3 -m uvicorn app.main:app --reload
   * 브라우저에서 확인하기: http://localhost:8000/docs
   * 구글 로그인: http://localhost:8000/auth/google/login
   * access_token 뒤 " " 복사해주세여
   * POST /studies/ 에서 Try it out → Execute 입력
   * POST /studies/join 에서 이름 비번 되는지 확인!

5. ngrok
   * 문서 확인 : https://evie-lawyerly-maxima.ngrok-free.dev/docs
   * OpenAPI JSON 확인 : https://evie-lawyerly-maxima.ngrok-free.dev/openapi.json
   * 요청 들어오는지 확인 : http://127.0.0.1:4040
   * 이렇게 reload해야된다네요 : py -3 -m uvicorn app.main:app --reload --port 8000 --proxy-headers --forwarded-allow-ips="*"





