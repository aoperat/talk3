-- ============================================
-- RLS 정책이 Realtime을 차단하는지 확인
-- ============================================

-- 1. messages 테이블의 RLS 정책 확인
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
WHERE tablename = 'messages'
ORDER BY policyname;

-- 2. RLS가 활성화되어 있는지 확인
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'messages';

-- 3. 현재 사용자가 messages를 SELECT할 수 있는지 확인
-- (이 쿼리는 현재 인증된 사용자로 실행해야 함)
SELECT 
  COUNT(*) as message_count,
  COUNT(DISTINCT room_id) as room_count
FROM messages
LIMIT 1;

-- 4. room_participants 확인 (messages 정책이 이것에 의존)
SELECT 
  COUNT(*) as participant_count
FROM room_participants
WHERE user_id = auth.uid();

-- 5. Realtime publication 확인 (이미 확인됨)
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'messages';

-- ============================================
-- 문제 해결 방법
-- ============================================
-- 만약 RLS 정책이 문제라면:
-- 1. messages 테이블의 SELECT 정책이 현재 사용자에게 적용되는지 확인
-- 2. room_participants에 현재 사용자가 포함되어 있는지 확인
-- 3. Realtime은 RLS를 우회하지 않으므로, SELECT 권한이 있어야 이벤트를 받을 수 있음

