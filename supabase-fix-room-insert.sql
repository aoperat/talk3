-- ============================================
-- 방 생성 및 참여자 추가 RLS 정책 수정
-- ============================================
-- 이 스크립트는 방 생성 시 발생하는 RLS 오류를 수정합니다.

-- 기존 정책 삭제
drop policy if exists "Authenticated users can create rooms" on rooms;
drop policy if exists "Users can add themselves to rooms" on room_participants;
drop policy if exists "Users can add participants to rooms" on room_participants;

-- Rooms INSERT 정책 재생성 (더 명확하게)
-- created_by가 현재 사용자와 일치하거나 NULL인 경우 허용 (방 생성 시)
create policy "Authenticated users can create rooms"
  on rooms for insert
  with check (
    auth.uid() is not null 
    and (created_by is null or created_by = auth.uid())
  );

-- Room Participants INSERT 정책 재생성
-- 사용자는 자신을 추가할 수 있음
-- 방을 만든 사람은 다른 사용자도 추가할 수 있음 (SECURITY DEFINER 함수 사용)
create or replace function public.user_can_add_participant(room_id_param bigint, user_id_param uuid)
returns boolean as $$
declare
  result boolean;
begin
  -- 자신을 추가하는 경우
  if auth.uid() = user_id_param then
    return true;
  end if;
  
  -- 방을 만든 사람인지 확인 (RLS 비활성화)
  set local row_security = off;
  select exists (
    select 1 
    from rooms 
    where rooms.id = room_id_param 
    and rooms.created_by = auth.uid()
  ) into result;
  return result;
end;
$$ language plpgsql security definer stable;

create policy "Users can add participants to rooms"
  on room_participants for insert
  with check (public.user_can_add_participant(room_id, user_id));

-- ============================================
-- 정책 확인 쿼리 (선택사항)
-- ============================================
-- 다음 쿼리를 실행하여 정책이 올바르게 생성되었는지 확인할 수 있습니다:
-- 
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('rooms', 'room_participants')
-- ORDER BY tablename, policyname;

-- 완료!

