Vite + Vercel + Supabase 메신저 아키텍처 가이드

1. 아키텍처 개요 (The Modern Stack)

이 가이드는 최신 프론트엔드 표준인 Vite를 사용하여 프로젝트를 구성하고, Vercel을 통해 배포하며, Supabase로 백엔드를 처리하는 구조입니다.

Frontend Framework: React (UI 라이브러리) + Vite (초고속 빌드 툴)

Hosting & CI/CD: Vercel (GitHub와 연동되어 자동 배포 제공)

Backend (Serverless): Supabase (Database, Auth, Realtime, Edge Functions)

2. 배포 및 개발 단계

1단계: 로컬 개발 환경 설정 (Vite)

단일 HTML 파일 방식과 달리, 로컬 컴퓨터(Node.js 환경)에서 프로젝트를 생성하고 관리합니다.

프로젝트 생성: 터미널에서 다음 명령어를 실행합니다.

npm create vite@latest my-messenger -- --template react
cd my-messenger
npm install


필요한 라이브러리 설치:

# Supabase 클라이언트, 아이콘, 스타일링 도구 설치
npm install @supabase/supabase-js lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p


실행: npm run dev 명령어로 로컬에서 개발 화면을 봅니다.

2단계: 코드 저장 및 배포 (GitHub & Vercel)

Vercel은 리액트/Vite 프로젝트 배포에 최적화되어 있으며 무료입니다.

GitHub 업로드: 작성한 코드를 본인의 GitHub 리포지토리에 푸시(Push)합니다.

Vercel 연동:

Vercel에 로그인 후 'Add New Project'를 클릭합니다.

방금 올린 GitHub 리포지토리를 선택하고 Import를 누릅니다.

Framework Preset이 자동으로 Vite로 잡힙니다. Deploy를 누르면 끝입니다.

3단계: 백엔드 연결 (Supabase)

여러 대화방과 일괄 번역을 위한 데이터베이스 구조입니다.

Supabase 프로젝트 생성: 무료 티어로 프로젝트를 만듭니다.

Table 생성 (SQL Editor 사용 추천):

-- 대화방 테이블
create table rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 메시지 테이블
create table messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) not null,
  user_id uuid default auth.uid(), -- 로그인 구현 시 사용
  content_ko text,
  content_en text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


3. 핵심: 환경 변수 관리와 보안

Vite와 Vercel을 사용하는 가장 큰 이유 중 하나는 보안 키 관리입니다. 소스 코드에 키를 노출하지 않습니다.

환경 변수 설정 (.env)

로컬 개발 (.env): 프로젝트 루트에 .env 파일을 만들고 키를 저장합니다. Vite에서는 접두사 VITE_가 붙어야 브라우저에서 읽을 수 있습니다.

VITE_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
VITE_SUPABASE_ANON_KEY=your-anon-key


배포 환경 (Vercel):

Vercel 대시보드 -> Settings -> Environment Variables 메뉴로 이동합니다.

위와 동일한 키(VITE_SUPABASE_URL 등)와 값을 입력하고 저장합니다.

재배포(Redeploy) 하면 적용됩니다.

4. GPT 번역 로직 (Supabase Edge Functions)

번역 기능은 클라이언트가 아닌 서버(Edge Function)에서 수행하여 보안을 강화합니다.

로직 흐름:

사용자가 '번역하기' 버튼 클릭 -> supabase.functions.invoke('translate-room', { body: { roomId } }) 호출.

Edge Function이 해당 방의 번역 안 된 메시지를 조회.

OpenAI API에 전송하여 번역 수행.

DB에 결과 업데이트 (content_en 필드 채움).

보안: OpenAI API Key는 Supabase 대시보드의 환경 변수로만 관리하므로 절대 유출되지 않습니다.

5. 요약

개발 경험: npm run dev로 수정 사항을 즉시 확인하며 개발 (HMR 지원).

배포 편의성: git push만 하면 Vercel이 알아서 빌드하고 배포해 줍니다.

확장성: 추후 TypeScript 도입, 라우팅(React Router), 상태 관리(Zustand) 등을 붙이기에 가장 적합한 구조입니다.