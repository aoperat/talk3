# Supabase Realtime 활성화 가이드

## 문제 증상
- 새로고침하면 메시지가 보임 (데이터 저장/읽기는 정상)
- 하지만 실시간으로 메시지가 나타나지 않음
- Realtime 구독은 성공하지만 이벤트가 수신되지 않음

## 해결 방법

### 1. Supabase 대시보드에서 Realtime 활성화 (가장 중요!)

**90% 확률로 이것이 문제입니다.**

1. **Supabase 대시보드** 접속
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **Table Editor**로 이동
   - 왼쪽 메뉴에서 **Table Editor** 클릭

3. **messages 테이블 설정 열기**
   - `messages` 테이블을 찾습니다
   - 테이블 이름 옆의 **설정 아이콘(⚙️)** 또는 **Edit Table** 클릭
   - 또는 테이블을 클릭한 후 상단의 **Settings** 탭 클릭

4. **Enable Realtime 체크**
   - 설정 화면 하단에 **"Enable Realtime"** 또는 **"Realtime"** 체크박스가 있습니다
   - **이 체크박스를 체크(ON)**합니다
   - **Save** 또는 **Update** 버튼 클릭

### 2. Database > Replication에서 확인

대안 방법:

1. 왼쪽 메뉴에서 **Database** 클릭
2. **Replication** 메뉴 클릭
3. `messages` 테이블이 목록에 있는지 확인
4. 없으면 **"Enable Realtime"** 버튼 클릭

### 3. SQL로 확인 및 활성화

Supabase SQL Editor에서 다음 쿼리 실행:

```sql
-- 현재 Realtime이 활성화된 테이블 확인
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- messages 테이블이 없으면 추가
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 확인
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'messages';
```

## 코드 확인

현재 코드는 이미 올바른 형식입니다:

```typescript
const channel = supabase
  .channel('messages:30')
  .on(
    'postgres_changes', // ✅ 올바른 이벤트 타입
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      // filter: `room_id=eq.${roomId}` // 필요시 필터 활성화
    },
    (payload) => {
      console.log('🔥 리얼타임 메시지 수신:', payload);
      // 메시지 처리
    }
  )
  .subscribe();
```

## 테스트

설정 후:

1. 브라우저 콘솔을 열어둡니다
2. 두 개의 브라우저 창을 엽니다 (또는 다른 사용자와 테스트)
3. 같은 방에서 메시지를 전송합니다
4. 다음 로그가 나타나야 합니다:
   - `🔔 [Realtime] 이벤트 핸들러 진입!`
   - `📨 [Realtime] 메시지 이벤트 수신`
   - `✅ [Realtime] 현재 방의 메시지 확인됨`

## 추가 확인 사항

만약 여전히 작동하지 않는다면:

1. **RLS 정책 확인**
   - `messages` 테이블의 RLS가 Realtime을 방해하지 않는지 확인
   - Realtime은 RLS를 우회하지 않으므로, SELECT 권한이 있어야 합니다

2. **네트워크 탭 확인**
   - 브라우저 개발자 도구 > Network 탭
   - WebSocket 연결(`wss://[project].supabase.co/realtime/v1/websocket`)이 있는지 확인
   - 연결 상태가 "OPEN"인지 확인

3. **Supabase 프로젝트 상태**
   - 무료 플랜에서도 Realtime은 작동합니다
   - 프로젝트가 일시 중지되지 않았는지 확인

