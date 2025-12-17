-- 모든 테이블 데이터 삭제 스크립트
-- 주의: 이 스크립트는 모든 데이터를 영구적으로 삭제합니다!

-- 외래키 제약조건을 일시적으로 비활성화 (더 안전한 삭제)
SET session_replication_role = 'replica';

-- 삭제 순서: 외래키 의존성을 고려하여 역순으로 삭제

-- 1. messages 테이블 삭제 (rooms와 users 참조)
TRUNCATE TABLE messages CASCADE;

-- 2. room_participants 테이블 삭제 (rooms와 users 참조)
TRUNCATE TABLE room_participants CASCADE;

-- 3. rooms 테이블 삭제
TRUNCATE TABLE rooms CASCADE;

-- 4. friendships 테이블 삭제 (users 참조)
TRUNCATE TABLE friendships CASCADE;

-- 5. friend_requests 테이블 삭제 (users 참조)
TRUNCATE TABLE friend_requests CASCADE;

-- 6. profiles 테이블 삭제 (users 참조)
-- 주의: auth.users는 Supabase 인증 시스템이므로 삭제하지 않음
-- profiles만 삭제하면 사용자는 다시 로그인할 수 있지만 프로필은 재생성됨
TRUNCATE TABLE profiles CASCADE;

-- 외래키 제약조건 다시 활성화
SET session_replication_role = 'origin';

-- 삭제 확인 쿼리
SELECT 
  'messages' as table_name, COUNT(*) as row_count FROM messages
UNION ALL
SELECT 
  'room_participants', COUNT(*) FROM room_participants
UNION ALL
SELECT 
  'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 
  'friendships', COUNT(*) FROM friendships
UNION ALL
SELECT 
  'friend_requests', COUNT(*) FROM friend_requests
UNION ALL
SELECT 
  'profiles', COUNT(*) FROM profiles;

