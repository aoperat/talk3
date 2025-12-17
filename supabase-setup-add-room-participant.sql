-- ============================================
-- add_room_participant 함수 생성/수정
-- ============================================
-- Supabase SQL Editor에서 이 스크립트를 실행하세요

-- 기존 함수가 있으면 삭제
DROP FUNCTION IF EXISTS public.add_room_participant(bigint, text);

-- add_room_participant 함수 생성
CREATE OR REPLACE FUNCTION public.add_room_participant(
  p_room_id bigint,
  p_user_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_by text;
BEGIN
  -- RLS를 비활성화하여 방 생성자 확인
  SET LOCAL row_security = off;
  
  -- 방 생성자 확인
  SELECT created_by::text INTO v_created_by 
  FROM rooms 
  WHERE id = p_room_id;

  -- 방이 존재하지 않으면 에러
  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  -- 권한 체크:
  -- 1. 자기 자신을 추가하는 경우 (항상 허용)
  -- 2. 방 생성자가 다른 사용자를 추가하는 경우
  -- 3. 이미 참여한 사용자를 다시 추가하려는 경우 (ON CONFLICT로 처리)
  IF p_user_id = auth.uid()::text THEN
    -- 자기 자신을 추가하는 경우 - 항상 허용
    INSERT INTO room_participants (room_id, user_id)
    VALUES (p_room_id, p_user_id::uuid)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  ELSIF v_created_by = auth.uid()::text THEN
    -- 방 생성자가 다른 사용자를 추가하는 경우
    INSERT INTO room_participants (room_id, user_id)
    VALUES (p_room_id, p_user_id::uuid)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  ELSE
    -- 권한 없음
    RAISE EXCEPTION 'Not authorized to add participants to this room';
  END IF;
END;
$$;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.add_room_participant(bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_room_participant(bigint, text) TO anon;

-- 함수가 제대로 생성되었는지 확인
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'add_room_participant';

