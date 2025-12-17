-- RLS 정책 수정 (무한 재귀 문제 해결)
-- Supabase SQL Editor에서 실행하세요

-- 1. 사용자의 참여 방 ID를 반환하는 함수 생성 (SECURITY DEFINER로 RLS 우회)
-- 양쪽을 text로 캐스팅하여 타입 호환성 보장
-- RLS를 완전히 비활성화하여 순환 참조 방지
-- VOLATILE로 변경: SET 명령을 사용하므로 STABLE이 아닌 VOLATILE이어야 함
create or replace function get_my_room_ids()
returns setof bigint
language plpgsql
security definer
volatile
as $$
begin
  -- RLS를 완전히 비활성화하여 순환 참조 방지
  set local row_security = off;
  return query
    select room_id from room_participants where user_id::text = auth.uid()::text;
end;
$$;

-- 1-1. 방 생성자가 참여자를 추가할 수 있는 함수
create or replace function add_room_participant(p_room_id bigint, p_user_id text)
returns void
language plpgsql
security definer
as $$
declare
  v_created_by text;
begin
  -- RLS를 비활성화하여 방 생성자 확인
  set local row_security = off;
  
  -- 방 생성자 확인
  select created_by::text into v_created_by from rooms where id = p_room_id;

  -- 방 생성자이거나 자기 자신을 추가하는 경우만 허용
  if v_created_by = auth.uid()::text or p_user_id = auth.uid()::text then
    -- RLS를 비활성화한 상태에서 직접 삽입 (정책 우회)
    insert into room_participants (room_id, user_id)
    values (p_room_id, p_user_id::uuid)
    on conflict (room_id, user_id) do nothing;
  else
    raise exception 'Not authorized to add participants to this room';
  end if;
end;
$$;

-- 2. 기존 문제가 있는 정책 삭제
drop policy if exists "Users can view participants in their rooms" on room_participants;
drop policy if exists "Users can add themselves to rooms" on room_participants;
drop policy if exists "Users can view rooms they participate in" on rooms;
drop policy if exists "Users can view their rooms" on rooms;
drop policy if exists "Users can create friendships" on friendships;
drop policy if exists "Users can create friendships for themselves or as friend" on friendships;
drop policy if exists "Users can view messages in their rooms" on messages;
drop policy if exists "Authenticated users can insert messages" on messages;
drop policy if exists "Users can send messages to their rooms" on messages;
drop policy if exists "Users can view room participants" on room_participants;
drop policy if exists "Users can add participants to rooms" on room_participants;
drop policy if exists "Users can leave rooms" on room_participants;

-- 3. room_participants 정책 수정 (함수 사용 - 함수 내부에서 RLS 비활성화로 순환 참조 방지)
-- 사용자는 자신이 참여한 방의 참여자 목록을 볼 수 있음
-- get_my_room_ids() 함수가 내부에서 RLS를 비활성화하므로 순환 참조가 발생하지 않음
create policy "Users can view room participants"
  on room_participants for select
  using (room_id in (select get_my_room_ids()));

create policy "Users can add participants to rooms"
  on room_participants for insert
  with check (
    -- 자신을 추가하는 경우
    user_id::text = auth.uid()::text
    OR
    -- 방 생성자가 다른 사용자를 추가하는 경우 (RLS 우회를 위해 함수 사용)
    exists (
      select 1 
      from rooms
      where rooms.id = room_id
      and rooms.created_by::text = auth.uid()::text
    )
  );

-- DELETE 정책: 사용자는 자신을 방에서 나갈 수 있음 (방 나가기)
drop policy if exists "Users can leave rooms" on room_participants;
create policy "Users can leave rooms"
  on room_participants for delete
  using (user_id::text = auth.uid()::text);

-- 4. rooms 정책 수정
-- SELECT 정책
drop policy if exists "Users can view their rooms" on rooms;
create policy "Users can view their rooms"
  on rooms for select
  using (
    created_by::text = auth.uid()::text
    OR
    id in (select get_my_room_ids())
  );

-- INSERT 정책 (방 생성)
drop policy if exists "Authenticated users can create rooms" on rooms;
create policy "Authenticated users can create rooms"
  on rooms for insert
  with check (
    auth.uid() is not null 
    and (created_by is null or created_by = auth.uid())
  );

-- UPDATE 정책 (방 정보 수정)
drop policy if exists "Users can update rooms they created" on rooms;
create policy "Users can update rooms they created"
  on rooms for update
  using (created_by::text = auth.uid()::text);

-- 5. friendships 정책 수정 (양방향 친구 추가 허용)
create policy "Users can create friendships"
  on friendships for insert
  with check (
    user_id::text = auth.uid()::text
    OR
    friend_id::text = auth.uid()::text
  );

-- 6. messages 정책 수정
create policy "Users can view messages in their rooms"
  on messages for select
  using (room_id in (select get_my_room_ids()));

create policy "Users can send messages to their rooms"
  on messages for insert
  with check (
    user_id::text = auth.uid()::text
    AND
    room_id in (select get_my_room_ids())
  );

-- 7. messages UPDATE 정책 추가 (번역 기능용)
drop policy if exists "Users can update messages in their rooms" on messages;
create policy "Users can update messages in their rooms"
  on messages for update
  using (room_id in (select get_my_room_ids()));

-- 8. room_participants DELETE 정책 추가 (방 나가기)
drop policy if exists "Users can leave rooms" on room_participants;
create policy "Users can leave rooms"
  on room_participants for delete
  using (user_id::text = auth.uid()::text);
