-- Star Tiles: player profiles + RLS + signup trigger + self-service account deletion
-- Run in Supabase Dashboard > SQL Editor (project etfhuwopqjderqutlyhk). Safe to re-run.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  coins        integer not null default 100 check (coins >= 0),
  stats        jsonb   not null default '{}'::jsonb,   -- {games, wins, ...}
  missions     jsonb   not null default '{}'::jsonb,   -- daily mission state
  streak       jsonb   not null default '{}'::jsonb,   -- login streak
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- keep updated_at fresh
create or replace function public.profiles_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.profiles_touch();

-- auto-create a profile row on signup
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Player'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Account deletion (App Store guideline 5.1.1(v)): deletes the caller's profile and auth user
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;   -- cascades identities/sessions
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

grant select, insert, update on public.profiles to authenticated;
