-- Star Tiles v49: ranked rating, readable as a column (the app stores it in profiles.stats)
alter table public.profiles add column if not exists rating int generated always as (coalesce((stats->>'rating')::int, 1000)) stored;
create index if not exists profiles_rating on public.profiles(rating desc);
-- public top-100 ranked view (names + rating only)
create or replace view public.ranked_top with (security_invoker = false) as
  select display_name, rating from public.profiles order by rating desc limit 100;
grant select on public.ranked_top to anon, authenticated;
