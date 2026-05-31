# 🎙️ Speakit — AI 영어 회화 튜터

Anthropic Claude API를 활용한 브라우저 기반 영어 회화 튜터예요.  
레벨에 맞춰 대화하고, 문법 실수를 실시간으로 교정해 드려요.

---

## 🚀 시작하기 (순서대로 따라해 주세요!)

### 1단계 — 다운로드 & 이동

```bash
# zip 압축 해제 후
cd speakit-v3
```

### 2단계 — 패키지 설치 ⚠️ 반드시 먼저 실행!

```bash
npm install
```

> `Cannot find package 'dotenv'` 오류가 뜨면 이 단계를 빠뜨린 거예요!

### 3단계 — API 키 설정

```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

`.env` 파일을 메모장(또는 VSCode)으로 열어서 API 키를 입력해 주세요:

```
OPENAI_API_KEY=sk-proj-여기에본인키입력
PORT=3000
```

> ⚠️ `.env` 파일은 절대 GitHub에 올리지 마세요. (`.gitignore`에 이미 등록되어 있어요)

### 4단계 — 실행!

```bash
npm start
# ✅  Speakit 실행 중 → http://localhost:3000
```

브라우저에서 `http://localhost:3000` 접속하면 됩니다.

개발 중엔 파일 변경 시 자동 재시작:

```bash
npm run dev
```

---

## 🗂️ 파일 구조

```
speakit-v3/
├── server.js           # Express 프록시 서버 (API 키는 여기서만 사용)
├── package.json
├── .env                # API 키 저장 — gitignore됨, 절대 커밋 금지
├── .env.example        # .env 템플릿 (키 값은 비어있음)
├── index.html          # 진입점
├── assets/
│   ├── logo.svg        # 라이트모드 로고
│   └── logo-dark.svg   # 다크모드 로고
├── css/
│   ├── reset.css
│   ├── variables.css   # 색상·폰트·라디우스 토큰 (라이트/다크 모드)
│   ├── layout.css
│   ├── components.css
│   ├── chat.css
│   └── sidebar.css
└── js/
    ├── config.js       # 상수 & 시스템 프롬프트
    ├── state.js        # 전역 상태
    ├── api.js          # /api/chat 호출 & JSON 파싱
    ├── ui.js           # DOM 렌더링 헬퍼
    ├── chat.js         # 대화 로직
    └── app.js          # 이벤트 핸들러 (레벨·주제·탭·다크모드)
```

---

## 🔒 API 키 보안 구조

```
브라우저  →  POST /api/chat  →  server.js  →  Anthropic API
                                    ↑
                            .env에서 API 키 주입
                            (브라우저에는 절대 노출 안 됨)
```

---

## 🛠️ 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 | Vanilla HTML5 / CSS3 / JavaScript (ES2020) |
| 백엔드 | Node.js + Express (프록시 서버) |
| AI | OpenAI GPT (`gpt-4o-mini` 기본 | `gpt-4o` 로 변경 가능) |
| 폰트 | Google Fonts — Plus Jakarta Sans + Noto Sans KR |

---

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| 레벨 조절 | 초급 / 중급 / 고급 — AI가 어휘와 문장 복잡도를 자동 조절 |
| 실시간 교정 | 문법·표현 오류를 대화 흐름 내에서 부드럽게 교정 |
| 꼬리 질문 | 이전 답변을 이어받은 자연스러운 팔로업 질문 |
| 주제 선택 | 일상생활 / 영화·드라마 / 여행 / 음식 / 기술·IT / 취미 |
| 힌트 버튼 | 다음에 할 수 있는 말 3가지 예시 제공 |
| 학습 대시보드 | 발화 단어 수 · 교정 횟수 · 유창성 점수 · 스킬 진행 바 |
| 다크모드 | 헤더 🌙/☀️ 버튼으로 전환, 선택값 저장 |

---

## 📄 라이선스

MIT
