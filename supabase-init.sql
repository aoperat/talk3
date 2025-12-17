-- ============================================
-- Supabase 메신저 데이터베이스 초기화 스크립트
-- ============================================
-- 이 스크립트는 데이터베이스를 처음부터 설정합니다.
-- 기존 테이블이 있으면 오류가 발생할 수 있으므로, 
-- 필요시 기존 테이블을 먼저 삭제하세요.

-- ============================================
-- 1. 테이블 생성
-- ============================================

-- 사용자 프로필 테이블
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  status_msg text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 친구 요청 테이블
create table friend_requests (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid references auth.users(id) on delete cascade not null,
  to_user_id uuid references auth.users(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(from_user_id, to_user_id),
  check (from_user_id != to_user_id)
);

-- 친구 관계 테이블
create table friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  friend_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id),
  check (user_id != friend_id)
);

-- 대화방 테이블 (bigint id 사용)
create table rooms (
  id bigserial primary key,
  name text not null,
  type text default 'private' check (type in ('private', 'topic')),
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 대화방 참여자 테이블
create table room_participants (
  id uuid default gen_random_uuid() primary key,
  room_id bigint references rooms(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(room_id, user_id)
);

-- 메시지 테이블
create table messages (
  id uuid default gen_random_uuid() primary key,
  room_id bigint references rooms(id) on delete cascade not null,
  user_id uuid default auth.uid(),
  content_ko text,
  content_en text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================
-- 2. Row Level Security (RLS) 활성화
-- ============================================

alter table profiles enable row level security;
alter table friend_requests enable row level security;
alter table friendships enable row level security;
alter table rooms enable row level security;
alter table room_participants enable row level security;
alter table messages enable row level security;

-- ============================================
-- 3. RLS 정책 생성
-- ============================================

-- Profiles 정책
create policy "Users can view all profiles"
  on profiles for select
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Friend Requests 정책
create policy "Users can view their friend requests"
  on friend_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can create friend requests"
  on friend_requests for insert
  with check (auth.uid() = from_user_id);

create policy "Users can update friend requests they received"
  on friend_requests for update
  using (auth.uid() = to_user_id);

-- Friendships 정책
create policy "Users can view their friendships"
  on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can create friendships"
  on friendships for insert
  with check (auth.uid() = user_id);

-- Rooms 정책: 참여자만 볼 수 있음
create policy "Users can view rooms they participate in"
  on rooms for select
  using (
    exists (
      select 1 from room_participants
      where room_participants.room_id = rooms.id
      and room_participants.user_id = auth.uid()
    )
  );

create policy "Authenticated users can create rooms"
  on rooms for insert
  with check (auth.uid() is not null);

create policy "Users can update rooms they created"
  on rooms for update
  using (auth.uid() = created_by);

-- Room Participants 정책
-- 무한 재귀 방지: SECURITY DEFINER 함수 사용 + RLS 비활성화
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

-- Room Participants INSERT 정책
-- 사용자는 자신을 추가할 수 있고, 방을 만든 사람은 다른 사용자도 추가할 수 있음
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

-- Messages 정책: 참여자만 볼 수 있음
-- 무한 재귀 방지: 직접 참여자 확인
create policy "Users can view messages in their rooms"
  on messages for select
  using (
    room_id in (
      select room_id 
      from room_participants 
      where user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert messages"
  on messages for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update their own messages"
  on messages for update
  using (auth.uid() = user_id);

-- ============================================
-- 4. 인덱스 생성 (성능 최적화)
-- ============================================

create index friend_requests_from_user_id_idx on friend_requests(from_user_id);
create index friend_requests_to_user_id_idx on friend_requests(to_user_id);
create index friend_requests_status_idx on friend_requests(status);
create index friendships_user_id_idx on friendships(user_id);
create index friendships_friend_id_idx on friendships(friend_id);
create index room_participants_room_id_idx on room_participants(room_id);
create index room_participants_user_id_idx on room_participants(user_id);
create index messages_room_id_idx on messages(room_id);
create index messages_created_at_idx on messages(created_at desc);
create index profiles_email_idx on profiles(email);

-- ============================================
-- 5. Realtime 구독 활성화
-- ============================================

alter publication supabase_realtime add table friend_requests;
alter publication supabase_realtime add table friendships;
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_participants;
alter publication supabase_realtime add table messages;

-- ============================================
-- 6. 함수 및 트리거 생성
-- ============================================

-- 사용자 가입 시 프로필 자동 생성 함수
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 트리거: 새 사용자 가입 시 프로필 생성
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 7. 기존 사용자 프로필 생성 (선택사항)
-- ============================================
-- 이미 가입한 사용자가 있다면 이 쿼리를 실행하여 프로필을 생성하세요.

insert into public.profiles (id, email, name)
select 
  id,
  email,
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- ============================================
-- 완료!
-- ============================================
-- 모든 테이블, 정책, 인덱스가 생성되었습니다.
-- 이제 앱을 사용할 수 있습니다.

