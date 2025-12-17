-- ============================================
-- RLS 정책 무한 재귀 오류 수정 스크립트
-- ============================================
-- 이 스크립트는 무한 재귀를 일으키는 RLS 정책을 수정합니다.

-- 기존 정책 삭제
drop policy if exists "Users can view participants in their rooms" on room_participants;
drop policy if exists "Users can view rooms they participate in" on rooms;
drop policy if exists "Users can view messages in their rooms" on messages;

-- Room Participants 정책 재생성 (무한 재귀 방지)
-- SECURITY DEFINER 함수를 사용하여 RLS를 완전히 우회
create or replace function public.user_can_view_room_participants(room_id_param bigint, user_id_param uuid)
returns boolean as $$
declare
  result boolean;
begin
  -- RLS를 완전히 비활성화하여 재귀 방지
  set local row_security = off;
  select exists (
    select 1 
    from room_participants 
    where room_participants.room_id = room_id_param 
    and room_participants.user_id = user_id_param
  ) into result;
  return result;
end;
$$ language plpgsql security definer stable;

create policy "Users can view participants in their rooms"
  on room_participants for select
  using (public.user_can_view_room_participants(room_id, auth.uid()));

-- Rooms 정책 재생성 (무한 재귀 방지)
create policy "Users can view rooms they participate in"
  on rooms for select
  using (
    id in (
      select room_id 
      from room_participants 
      where user_id = auth.uid()
    )
  );

-- Messages 정책 재생성 (무한 재귀 방지)
create policy "Users can view messages in their rooms"
  on messages for select
  using (
    room_id in (
      select room_id 
      from room_participants 
      where user_id = auth.uid()
    )
  );

-- 완료!

