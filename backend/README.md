# LineGuide 3 Backend

LineGuide 작업지시 시스템의 백엔드 API 서버입니다.

## 폴더 구조

```
backend/
├── src/
│   └── app.js          # 메인 서버 파일
├── routes/             # API 라우터
├── models/             # 데이터베이스 모델
├── config/             # 설정 파일
├── middleware/         # Express 미들웨어
├── utils/              # 유틸리티 함수
├── package.json
├── .env.example        # 환경변수 예제
└── README.md

```

## 설치 및 실행

1. 의존성 설치:
```bash
cd backend
npm install
```

2. 환경변수 설정:
```bash
cp .env.example .env
# .env 파일을 편집하여 실제 값으로 수정
```

3. 개발 서버 실행:
```bash
npm run dev
```

## API 엔드포인트

- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 사용자 정보
- `GET /api/work-orders` - 작업지시 목록
- `POST /api/work-orders` - 작업지시 생성
- `GET /api/teams` - 팀 목록