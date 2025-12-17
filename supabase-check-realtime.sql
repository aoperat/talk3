-- ============================================
-- Supabase Realtime 설정 확인 및 수정
-- ============================================
-- 이 스크립트는 Realtime이 제대로 설정되었는지 확인하고 수정합니다.

-- 1. 현재 Realtime publication에 포함된 테이블 확인
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 2. Realtime publication에 테이블 추가 (없는 경우)
-- 만약 위 쿼리 결과에 테이블이 없다면 아래 명령들을 실행하세요

DO $$
BEGIN
  -- friend_requests 테이블 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
    RAISE NOTICE 'friend_requests 테이블을 Realtime에 추가했습니다.';
  END IF;
  
  -- friendships 테이블 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
    RAISE NOTICE 'friendships 테이블을 Realtime에 추가했습니다.';
  END IF;
  
  -- rooms 테이블 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
    RAISE NOTICE 'rooms 테이블을 Realtime에 추가했습니다.';
  END IF;
  
  -- room_participants 테이블 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'room_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE room_participants;
    RAISE NOTICE 'room_participants 테이블을 Realtime에 추가했습니다.';
  END IF;
  
  -- messages 테이블 추가
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    RAISE NOTICE 'messages 테이블을 Realtime에 추가했습니다.';
  END IF;
END $$;

-- 3. 최종 확인 - 모든 테이블이 추가되었는지 확인
SELECT 
  'Realtime에 등록된 테이블:' as info,
  string_agg(tablename, ', ') as tables
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- 완료!
-- 브라우저 콘솔에서 다음 로그를 확인하세요:
-- ✅ "방 목록 Realtime 구독 성공!"
-- ✅ "메시지 Realtime 구독 성공!"
--
-- 만약 로그가 보이지 않는다면:
-- 1. Supabase Dashboard > Database > Replication에서 테이블들이 활성화되어 있는지 확인
-- 2. 브라우저 콘솔에서 오류 메시지 확인
-- 3. 네트워크 탭에서 WebSocket 연결 확인

