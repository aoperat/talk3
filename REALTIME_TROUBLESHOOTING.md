# Realtime 문제 해결 가이드 (Realtime이 이미 활성화된 경우)

## 현재 상황
- ✅ `messages` 테이블이 이미 `supabase_realtime` publication에 포함됨
- ✅ Realtime 설정은 활성화되어 있음
- ❌ 하지만 메시지 이벤트가 수신되지 않음

## 가능한 원인 및 해결 방법

### 1. RLS (Row Level Security) 정책 확인

RLS 정책이 Realtime 이벤트를 차단할 수 있습니다. 다음 SQL로 확인:

```sql
-- messages 테이블의 RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages';

-- RLS가 활성화되어 있는지 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'messages';
```

**해결 방법:**
- Realtime은 RLS를 우회하지 않으므로, 사용자가 `SELECT` 권한이 있어야 합니다
- `messages` 테이블에 대한 SELECT 정책이 현재 사용자에게 적용되는지 확인

### 2. 필터 문법 확인

현재 코드에서 필터를 사용하고 있습니다. 필터 문법이 올바른지 확인:

```typescript
filter: `room_id=eq.${currentRoomId}`
```

**테스트:**
- 필터를 일시적으로 제거하여 모든 메시지를 받아보기
- 이벤트가 수신되면 필터 문제일 수 있음

### 3. WebSocket 연결 확인

브라우저 개발자 도구에서 확인:

1. **Network 탭 열기**
2. **WS (WebSocket) 필터 적용**
3. `wss://[project-ref].supabase.co/realtime/v1/websocket` 연결 확인
4. 연결 상태가 "OPEN"인지 확인
5. 메시지 전송 시 WebSocket에 메시지가 전송되는지 확인

### 4. 채널 구독 상태 확인

브라우저 콘솔에서 다음 로그 확인:

```
✅ [Realtime] 메시지 구독 성공! (roomId: ...)
```

이 로그가 나타나면 구독은 성공한 것입니다.

### 5. 이벤트 핸들러 진입 확인

메시지 전송 시 다음 로그가 나타나야 합니다:

```
🔔 [Realtime] 이벤트 핸들러 진입!
📨 [Realtime] 메시지 이벤트 수신
```

**이 로그가 나타나지 않으면:**
- Realtime 이벤트가 클라이언트에 도달하지 않는 것
- Supabase 서버 측 문제일 수 있음

### 6. 테스트 쿼리

Supabase SQL Editor에서 직접 테스트:

```sql
-- 1. 현재 사용자 확인
SELECT auth.uid();

-- 2. messages 테이블에 직접 INSERT (Realtime 이벤트 발생)
INSERT INTO messages (room_id, user_id, content_ko)
VALUES (30, auth.uid(), '테스트 메시지')
RETURNING *;

-- 3. Realtime publication 확인
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'messages';
```

### 7. 클라이언트 측 디버깅

코드에 추가 디버깅 로그가 있습니다. 다음을 확인:

```typescript
// 채널 구독 직후
console.log('✅ [Realtime] 메시지 구독 성공!');

// 이벤트 수신 시
console.log('🔔 [Realtime] 이벤트 핸들러 진입!');
```

### 8. Supabase 프로젝트 상태 확인

- 프로젝트가 일시 중지되지 않았는지 확인
- 무료 플랜에서도 Realtime은 작동해야 합니다
- 프로젝트 설정에서 Realtime 기능이 비활성화되지 않았는지 확인

## 다음 단계

1. **RLS 정책 확인** - 가장 가능성 높음
2. **WebSocket 연결 확인** - 네트워크 탭에서 확인
3. **필터 제거 테스트** - 필터 없이 모든 메시지 수신 테스트
4. **Supabase 지원팀 문의** - 위 방법으로 해결되지 않으면

