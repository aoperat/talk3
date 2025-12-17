-- ============================================
-- 방 가시성 문제 수정 (양쪽 사용자 모두에게 보이도록)
-- ============================================
-- 이 스크립트는 방 생성 후 두 사용자 모두에게 방이 보이도록 수정합니다.

-- 1. get_my_room_ids() 함수 수정 (RLS 완전 비활성화)
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
    select room_id 
    from room_participants 
    where user_id::text = auth.uid()::text;
end;
$$;

-- 2. add_room_participant 함수 수정 (RLS 완전 비활성화)
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
  select created_by::text into v_created_by 
  from rooms 
  where id = p_room_id;

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

-- 3. room_participants SELECT 정책 확인 및 수정
-- 사용자는 자신이 참여한 방의 모든 참여자를 볼 수 있어야 함
drop policy if exists "Users can view room participants" on room_participants;
create policy "Users can view room participants"
  on room_participants for select
  using (
    -- 자신이 참여한 방의 참여자만 조회 가능
    -- get_my_room_ids() 함수가 내부에서 RLS를 비활성화하므로 순환 참조 없음
    room_id in (select get_my_room_ids())
  );

-- 4. room_participants INSERT 정책 확인
-- 방 생성자는 다른 사용자를 추가할 수 있어야 함
drop policy if exists "Users can add participants to rooms" on room_participants;
create policy "Users can add participants to rooms"
  on room_participants for insert
  with check (
    -- 자신을 추가하는 경우
    user_id::text = auth.uid()::text
    OR
    -- 방 생성자가 다른 사용자를 추가하는 경우
    -- rooms 테이블 조회 시 RLS가 적용되므로 직접 체크
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

-- 5. rooms SELECT 정책 확인
-- 사용자는 자신이 참여한 방을 모두 볼 수 있어야 함
drop policy if exists "Users can view their rooms" on rooms;
create policy "Users can view their rooms"
  on rooms for select
  using (
    -- 자신이 만든 방이거나
    created_by::text = auth.uid()::text
    OR
    -- 자신이 참여한 방
    id in (select get_my_room_ids())
  );

-- ============================================
-- 정책 확인 쿼리
-- ============================================
-- 다음 쿼리로 정책이 올바르게 설정되었는지 확인:
-- 
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename IN ('rooms', 'room_participants')
-- ORDER BY tablename, policyname;
--
-- 다음 쿼리로 함수 확인:
--
-- SELECT routine_name, routine_type, security_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('get_my_room_ids', 'add_room_participant')
-- ORDER BY routine_name;

-- 완료!

