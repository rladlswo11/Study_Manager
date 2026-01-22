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


