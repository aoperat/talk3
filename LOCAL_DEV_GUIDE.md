# 로컬 개발 환경 설정 가이드

## 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
VITE_SUPABASE_URL=https://wyrgacdyxtfznsbxyjib.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**참고**: 
- Supabase Dashboard → Settings → API에서 URL과 anon key를 확인할 수 있습니다
- `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다

## 2. 로컬 개발용 Vite 설정 (선택사항)

로컬에서는 base path를 `/`로 변경하는 것이 편리합니다.

`vite.config.ts`를 다음과 같이 수정:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/talk3/' : '/', // 로컬: /, 프로덕션: /talk3/
})
```

또는 그대로 두고 `http://localhost:5173/talk3/`로 접속해도 됩니다.

## 3. 의존성 설치

```bash
npm install
```

## 4. 개발 서버 실행

```bash
npm run dev
```

서버가 시작되면 브라우저에서 `http://localhost:5173` (또는 `http://localhost:5173/talk3/`)로 접속하세요.

## 5. 빌드 테스트

프로덕션 빌드를 테스트하려면:

```bash
npm run build
npm run preview
```

## 문제 해결

### 환경 변수가 인식되지 않음
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 파일 이름이 정확히 `.env`인지 확인 (`.env.local` 아님)
- 개발 서버를 재시작 (`Ctrl+C` 후 `npm run dev`)

### Realtime이 작동하지 않음
- Supabase Dashboard → Database → Replication에서 테이블이 활성화되어 있는지 확인
- 브라우저 콘솔에서 에러 메시지 확인
- 네트워크 탭에서 WebSocket 연결 확인

### 포트가 이미 사용 중
- 다른 포트 사용: `npm run dev -- --port 3000`
- 또는 실행 중인 다른 서버 종료

