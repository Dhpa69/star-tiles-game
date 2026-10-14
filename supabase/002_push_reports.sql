-- Star Tiles v45: turn-notification tokens + chat reports. Run after 001_profiles.sql (SQL Editor).
create table if not exists public.push_tokens (
  device_id  text primary key,                 -- random per-install id (works for guests)
  player_id  uuid references auth.users(id) on delete cascade,  -- set when signed in
  platform   text not null check (platform in ('ios','web')),
  token      text,                             -- APNs device token (ios)
  web_sub    jsonb,                            -- Web Push subscription (web)
  rooms      text[] not null default '{}',     -- active online room codes
  name       text,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_rooms on public.push_tokens using gin (rooms);
alter table public.push_tokens enable row level security;   -- no direct client access; use the RPC below
revoke all on public.push_tokens from anon, authenticated;

create or replace function public.register_push(p_device text, p_platform text, p_token text, p_sub jsonb, p_rooms text[], p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_device,'')) < 8 then raise exception 'bad device'; end if;
  insert into public.push_tokens(device_id, player_id, platform, token, web_sub, rooms, name, updated_at)
  values (p_device, auth.uid(), p_platform, p_token, p_sub, coalesce(p_rooms[1:30],'{}'), left(p_name,24), now())
  on conflict (device_id) do update set player_id = coalesce(auth.uid(), push_tokens.player_id), platform = excluded.platform,
    token = coalesce(excluded.token, push_tokens.token), web_sub = coalesce(excluded.web_sub, push_tokens.web_sub),
    rooms = excluded.rooms, name = excluded.name, updated_at = now();
end $$;
grant execute on function public.register_push(text,text,text,jsonb,text[],text) to anon, authenticated;

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  reporter_device text, reporter uuid default auth.uid(),
  room text, reported_name text, reason text, messages jsonb
);
alter table public.reports enable row level security;
drop policy if exists "reports_insert_any" on public.reports;
create policy "reports_insert_any" on public.reports for insert to anon, authenticated with check (true);
grant insert on public.reports to anon, authenticated;

-- account deletion also removes push tokens (cascade via player_id); guests' tokens expire:
-- optional cleanup job: delete from push_tokens where updated_at < now() - interval '60 days';
