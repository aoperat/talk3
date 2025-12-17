-- profiles 테이블에 last_seen_at 컬럼 추가
-- 온라인 상태 추적을 위해 사용

-- 컬럼 추가 (없는 경우만)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'profiles' 
    and column_name = 'last_seen_at'
  ) then
    alter table profiles add column last_seen_at timestamp with time zone;
  end if;
end $$;

-- 인덱스 추가 (성능 최적화)
create index if not exists profiles_last_seen_at_idx on profiles(last_seen_at desc);

-- 주석 추가
comment on column profiles.last_seen_at is '사용자의 마지막 접속 시간. 온라인 상태 판단에 사용됨.';

