# English Buddy Messenger

Vite + React + TypeScript 기반의 모바일 퍼스트 메신저 애플리케이션입니다.

## 기술 스택

- **Frontend**: Vite + React 18 + TypeScript
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React
- **Backend**: Supabase (Database, Auth, Realtime, Edge Functions)
- **배포**: Vercel

## 시작하기

### 1. 프로젝트 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-api-key
```

**참고**: OpenAI API 키는 번역 기능에 사용됩니다. [OpenAI Platform](https://platform.openai.com/api-keys)에서 API 키를 발급받을 수 있습니다.

### 3. Supabase 데이터베이스 설정

`supabase-schema.sql` 파일의 SQL을 Supabase SQL Editor에서 실행하여 테이블을 생성하세요.

### 4. Supabase Edge Function 설정

번역 기능을 사용하려면:

1. Supabase CLI를 설치하고 로그인하세요:
```bash
npm install -g supabase
supabase login
```

2. Edge Function을 배포하세요:
```bash
supabase functions deploy translate-room
```

3. Supabase 대시보드에서 Edge Function 환경 변수를 설정하세요:
   - `OPENAI_API_KEY`: OpenAI API 키
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role 키

### 5. 개발 서버 실행

```bash
npm run dev
```

### 6. 빌드

```bash
npm run build
```

## 배포 (Vercel)

1. GitHub에 코드를 푸시하세요
2. Vercel에 로그인하고 새 프로젝트를 추가하세요
3. GitHub 리포지토리를 선택하고 Import하세요
4. 환경 변수를 설정하세요:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy를 클릭하세요

## 주요 기능

- 실시간 메시징 (Supabase Realtime)
- 일괄 번역 기능 (OpenAI GPT)
- 사용자 인증 (Supabase Auth)
- 모바일 퍼스트 반응형 디자인

## 프로젝트 구조

```
src/
├── components/      # UI 컴포넌트
├── hooks/          # 커스텀 훅
├── lib/            # 유틸리티 및 설정
└── App.tsx         # 메인 앱 컴포넌트
```

