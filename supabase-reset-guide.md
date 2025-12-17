# 데이터베이스 초기화 가이드

## 전체 테이블 데이터 삭제

### 방법 1: SQL 스크립트 실행 (권장)

1. **Supabase 대시보드 접속**
   - https://app.supabase.com 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

3. **삭제 스크립트 실행**
   - `supabase-clear-all-data.sql` 파일의 내용을 복사하여 붙여넣기
   - "Run" 버튼 클릭

4. **삭제 확인**
   - 스크립트 마지막의 확인 쿼리가 실행되어 모든 테이블의 row_count가 0인지 확인

### 방법 2: 테이블별 개별 삭제

각 테이블을 개별적으로 삭제하려면:

```sql
-- 메시지 삭제
DELETE FROM messages;

-- 방 참여자 삭제
DELETE FROM room_participants;

-- 방 삭제
DELETE FROM rooms;

-- 친구 관계 삭제
DELETE FROM friendships;

-- 친구 요청 삭제
DELETE FROM friend_requests;

-- 프로필 삭제 (사용자 계정은 유지)
DELETE FROM profiles;
```

### 방법 3: CASCADE 삭제 (외래키 고려)

```sql
-- 모든 관계를 고려한 삭제
DELETE FROM messages;
DELETE FROM room_participants;
DELETE FROM rooms;
DELETE FROM friendships;
DELETE FROM friend_requests;
DELETE FROM profiles;
```

## 주의사항

⚠️ **중요**: 
- 이 작업은 **되돌릴 수 없습니다**!
- 모든 채팅 메시지, 방, 친구 관계, 친구 요청이 삭제됩니다
- 프로필 데이터도 삭제되지만, `auth.users`의 사용자 계정은 유지됩니다
- 사용자는 다시 로그인할 수 있지만, 프로필은 자동으로 재생성됩니다

## 삭제 후 작업

1. **데이터 확인**
   ```sql
   SELECT COUNT(*) FROM messages;
   SELECT COUNT(*) FROM rooms;
   SELECT COUNT(*) FROM friendships;
   -- 모든 테이블이 0이어야 함
   ```

2. **앱 재테스트**
   - 새로운 계정 생성 테스트
   - 친구 추가 테스트
   - 채팅 방 생성 테스트
   - 메시지 전송 테스트

3. **필요시 스키마 재생성**
   - 만약 테이블 구조를 변경했다면 `supabase-schema.sql` 다시 실행

## 특정 사용자만 삭제

특정 사용자의 데이터만 삭제하려면:

```sql
-- 특정 사용자 ID (예시)
DO $$
DECLARE
  target_user_id UUID := '사용자-UUID-여기에-입력';
BEGIN
  -- 해당 사용자의 메시지 삭제
  DELETE FROM messages WHERE user_id = target_user_id;
  
  -- 해당 사용자의 방 참여 삭제
  DELETE FROM room_participants WHERE user_id = target_user_id;
  
  -- 해당 사용자가 생성한 방 삭제 (참여자도 함께 삭제됨 - CASCADE)
  DELETE FROM rooms WHERE created_by = target_user_id;
  
  -- 친구 관계 삭제
  DELETE FROM friendships WHERE user_id = target_user_id OR friend_id = target_user_id;
  
  -- 친구 요청 삭제
  DELETE FROM friend_requests WHERE from_user_id = target_user_id OR to_user_id = target_user_id;
  
  -- 프로필 삭제
  DELETE FROM profiles WHERE id = target_user_id;
END $$;
```

## 개발 환경 초기화

완전히 깨끗한 상태로 시작하려면:

1. 모든 데이터 삭제 (`supabase-clear-all-data.sql` 실행)
2. 스키마 확인 (`supabase-schema.sql` 실행 - 테이블이 이미 있으면 오류 무시)
3. RLS 정책 확인 (`supabase-fix-rls.sql` 또는 `supabase-schema.sql`의 RLS 부분 확인)

