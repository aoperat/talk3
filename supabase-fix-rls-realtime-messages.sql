-- ============================================
-- Realtime 메시지 수신을 위한 RLS 정책 완화
-- ============================================
-- 이 스크립트는 Realtime 이벤트가 정상적으로 수신되도록 RLS 정책을 완화합니다.

-- 1. 기존 messages SELECT 정책 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'SELECT';

-- 2. 기존 정책 삭제 (선택사항 - 충돌 방지)
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON "public"."messages";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."messages";

-- 3. 모든 사용자에게 읽기 권한 허용 (Realtime 테스트용)
-- 주의: 프로덕션에서는 보안을 고려하여 더 엄격한 정책을 사용해야 합니다.
CREATE POLICY "Enable read access for all users"
ON "public"."messages"
FOR SELECT
USING (true);

-- 4. 확인: 정책이 생성되었는지 확인
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'SELECT';

-- ============================================
-- 대안: 기존 정책 유지하면서 Realtime 작동 확인
-- ============================================
-- 만약 위의 정책이 너무 개방적이라면, 아래 정책을 사용하세요.
-- 이 정책은 인증된 사용자라면 모든 메시지를 볼 수 있게 합니다.

-- DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."messages";
-- 
-- CREATE POLICY "Authenticated users can view all messages"
-- ON "public"."messages"
-- FOR SELECT
-- USING (auth.role() = 'authenticated');

-- ============================================
-- 테스트
-- ============================================
-- 정책 적용 후:
-- 1. 브라우저에서 강력 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R)
-- 2. 메시지 전송
-- 3. 반대쪽 브라우저 콘솔에서 다음 로그 확인:
--    - "🔥 [Realtime] 필터 없이 받은 데이터:"
--    - "🔔 [Realtime] 이벤트 핸들러 진입!"

