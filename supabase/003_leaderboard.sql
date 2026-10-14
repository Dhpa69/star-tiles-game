-- Star Tiles v48: weekly leaderboard + daily puzzle board. Run in SQL Editor (after 001/002).
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  week text not null,                 -- ISO week, e.g. 2026-W42 (set by server)
  day date,                           -- daily puzzle date (mode='daily')
  mode text not null check (mode in ('ai','daily','online')),
  level text,                         -- computer difficulty
  score int not null check (score >= 0 and score <= 5000000),
  name text not null,
  device_id text not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade
);
create index if not exists scores_week on public.scores(week, mode, score desc);
create index if not exists scores_day on public.scores(day, score desc);
alter table public.scores enable row level security;
drop policy if exists "scores_read" on public.scores;
create policy "scores_read" on public.scores for select to anon, authenticated using (true);
-- no direct insert/update/delete; clients use submit_score()
revoke insert, update, delete on public.scores from anon, authenticated;

create or replace function public.submit_score(p_mode text, p_level text, p_score int, p_name text, p_device text, p_day date default null)
returns void language plpgsql security definer set search_path = public as $$
declare w text := to_char(now() at time zone 'utc', 'IYYY-"W"IW');
begin
  if length(coalesce(p_device,'')) < 8 or p_score < 0 or p_score > 5000000 then raise exception 'bad score'; end if;
  -- one daily entry per device per day; max 30 submissions per device per week
  if p_mode = 'daily' and exists(select 1 from scores where device_id=p_device and day=p_day) then return; end if;
  if (select count(*) from scores where device_id=p_device and week=w) >= 30 then return; end if;
  insert into scores(week, day, mode, level, score, name, device_id)
  values (w, case when p_mode='daily' then p_day end, p_mode, left(p_level,12), p_score, left(coalesce(nullif(trim(p_name),''),'Player'),20), p_device);
end $$;
grant execute on function public.submit_score(text,text,int,text,text,date) to anon, authenticated;
