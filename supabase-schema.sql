-- 사용자 프로필 테이블
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  avatar_url text,
  status_msg text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 기존 profiles 테이블에 필요한 컬럼 추가
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'email') then
    alter table profiles add column email text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'name') then
    alter table profiles add column name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table profiles add column avatar_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'status_msg') then
    alter table profiles add column status_msg text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'created_at') then
    alter table profiles add column created_at timestamp with time zone default timezone('utc'::text, now()) not null;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'updated_at') then
    alter table profiles add column updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
  end if;
end $$;

-- 친구 요청 테이블
create table if not exists friend_requests (
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
create table if not exists friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  friend_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, friend_id),
  check (user_id != friend_id)
);

-- 대화방 테이블
-- 기존 테이블이 bigint id를 사용하는 경우를 대비
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'rooms') then
    create table rooms (
      id uuid default gen_random_uuid() primary key,
      name text not null,
      type text default 'private' check (type in ('private', 'topic')),
      created_by uuid references auth.users(id),
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  else
    -- 기존 테이블이 있는 경우, id 타입 확인 및 필요시 컬럼 추가
    if not exists (select 1 from information_schema.columns where table_name = 'rooms' and column_name = 'type') then
      alter table rooms add column type text default 'private' check (type in ('private', 'topic'));
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'rooms' and column_name = 'created_by') then
      alter table rooms add column created_by uuid references auth.users(id);
    end if;
  end if;
end $$;

-- 대화방 참여자 테이블
-- rooms 테이블의 id 타입에 맞춰서 생성
do $$
declare
  room_id_type text;
begin
  -- rooms 테이블의 id 컬럼 타입 확인
  select data_type into room_id_type
  from information_schema.columns
  where table_name = 'rooms' and column_name = 'id';
  
  if not exists (select 1 from information_schema.tables where table_name = 'room_participants') then
    if room_id_type = 'uuid' then
      create table room_participants (
        id uuid default gen_random_uuid() primary key,
        room_id uuid references rooms(id) on delete cascade not null,
        user_id uuid references auth.users(id) on delete cascade not null,
        joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
        unique(room_id, user_id)
      );
    else
      -- bigint인 경우
      create table room_participants (
        id uuid default gen_random_uuid() primary key,
        room_id bigint references rooms(id) on delete cascade not null,
        user_id uuid references auth.users(id) on delete cascade not null,
        joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
        unique(room_id, user_id)
      );
    end if;
  end if;
end $$;

-- 메시지 테이블
-- rooms 테이블의 id 타입에 맞춰서 생성
do $$
declare
  room_id_type text;
begin
  -- rooms 테이블의 id 컬럼 타입 확인
  select data_type into room_id_type
  from information_schema.columns
  where table_name = 'rooms' and column_name = 'id';
  
  if not exists (select 1 from information_schema.tables where table_name = 'messages') then
    if room_id_type = 'uuid' then
      create table messages (
        id uuid default gen_random_uuid() primary key,
        room_id uuid references rooms(id) on delete cascade not null,
        user_id uuid default auth.uid(),
        content_ko text,
        content_en text,
        created_at timestamp with time zone default timezone('utc'::text, now()) not null
      );
    else
      -- bigint인 경우
      create table messages (
        id uuid default gen_random_uuid() primary key,
        room_id bigint references rooms(id) on delete cascade not null,
        user_id uuid default auth.uid(),
        content_ko text,
        content_en text,
        created_at timestamp with time zone default timezone('utc'::text, now()) not null
      );
    end if;
  end if;
end $$;

-- Row Level Security 활성화
alter table profiles enable row level security;
alter table friend_requests enable row level security;
alter table friendships enable row level security;
alter table rooms enable row level security;
alter table room_participants enable row level security;
alter table messages enable row level security;

-- Profiles 정책
drop policy if exists "Users can view all profiles" on profiles;
create policy "Users can view all profiles"
  on profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- Friend Requests 정책
drop policy if exists "Users can view their friend requests" on friend_requests;
create policy "Users can view their friend requests"
  on friend_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "Users can create friend requests" on friend_requests;
create policy "Users can create friend requests"
  on friend_requests for insert
  with check (auth.uid() = from_user_id);

drop policy if exists "Users can update friend requests they received" on friend_requests;
create policy "Users can update friend requests they received"
  on friend_requests for update
  using (auth.uid() = to_user_id);

-- Friendships 정책
drop policy if exists "Users can view their friendships" on friendships;
create policy "Users can view their friendships"
  on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can create friendships" on friendships;
create policy "Users can create friendships"
  on friendships for insert
  with check (auth.uid() = user_id);

-- Rooms 정책: 참여자만 볼 수 있음
drop policy if exists "Users can view rooms they participate in" on rooms;
create policy "Users can view rooms they participate in"
  on rooms for select
  using (
    exists (
      select 1 from room_participants
      where room_participants.room_id = rooms.id
      and room_participants.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can create rooms" on rooms;
create policy "Authenticated users can create rooms"
  on rooms for insert
  with check (auth.role() = 'authenticated');

-- Room Participants 정책
drop policy if exists "Users can view participants in their rooms" on room_participants;
create policy "Users can view participants in their rooms"
  on room_participants for select
  using (
    exists (
      select 1 from room_participants rp
      where rp.room_id = room_participants.room_id
      and rp.user_id = auth.uid()
    )
  );

drop policy if exists "Users can add themselves to rooms" on room_participants;
create policy "Users can add themselves to rooms"
  on room_participants for insert
  with check (auth.uid() = user_id);

-- Messages 정책: 참여자만 볼 수 있음
drop policy if exists "Users can view messages in their rooms" on messages;
create policy "Users can view messages in their rooms"
  on messages for select
  using (
    exists (
      select 1 from room_participants
      where room_participants.room_id = messages.room_id
      and room_participants.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can insert messages" on messages;
create policy "Authenticated users can insert messages"
  on messages for insert
  with check (auth.role() = 'authenticated');

-- Realtime 구독 활성화 (이미 추가된 경우 무시)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'friend_requests'
  ) then
    alter publication supabase_realtime add table friend_requests;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table friendships;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table rooms;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'room_participants'
  ) then
    alter publication supabase_realtime add table room_participants;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- 인덱스 추가 (성능 최적화)
create index if not exists friend_requests_from_user_id_idx on friend_requests(from_user_id);
create index if not exists friend_requests_to_user_id_idx on friend_requests(to_user_id);
create index if not exists friend_requests_status_idx on friend_requests(status);
create index if not exists friendships_user_id_idx on friendships(user_id);
create index if not exists friendships_friend_id_idx on friendships(friend_id);
create index if not exists room_participants_room_id_idx on room_participants(room_id);
create index if not exists room_participants_user_id_idx on room_participants(user_id);
create index if not exists messages_room_id_idx on messages(room_id);
create index if not exists messages_created_at_idx on messages(created_at desc);

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

-- 기존 사용자 프로필 생성 (이미 가입한 사용자용)
-- 주의: 이 쿼리는 한 번만 실행하세요
insert into public.profiles (id, email, name)
select 
  id,
  email,
  coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)) as name
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

