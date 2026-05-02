-- =========================================================
-- Wedding photo submitter — full schema
-- Run in the Supabase SQL editor.
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- Tables ----------------------------------------

create table if not exists profiles (
  id          uuid primary key,
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  user_name     text not null,
  storage_path  text not null,
  public_url    text not null,
  created_at    timestamptz not null default now()
);

create index if not exists photos_user_id_idx     on photos(user_id);
create index if not exists photos_created_at_idx  on photos(created_at desc);

create table if not exists likes (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references photos(id)    on delete cascade,
  user_id     uuid not null references profiles(id)  on delete cascade,
  created_at  timestamptz not null default now(),
  unique (photo_id, user_id)
);

create index if not exists likes_photo_id_idx on likes(photo_id);
create index if not exists likes_user_id_idx  on likes(user_id);

-- ---------- Views -----------------------------------------

create or replace view photos_with_stats as
select
  p.*,
  coalesce(l.like_count, 0) as like_count
from photos p
left join (
  select photo_id, count(*)::int as like_count
  from likes
  group by photo_id
) l on l.photo_id = p.id;

create or replace view paparazzi_ranking as
select
  pr.id,
  pr.name,
  count(ph.id)::int as photo_count
from profiles pr
left join photos ph on ph.user_id = pr.id
group by pr.id, pr.name
having count(ph.id) > 0
order by photo_count desc, pr.name asc;

create or replace view golden_lens_ranking as
select
  pr.id,
  pr.name,
  count(l.id)::int as like_count
from profiles pr
left join photos ph on ph.user_id = pr.id
left join likes  l  on l.photo_id  = ph.id
group by pr.id, pr.name
having count(l.id) > 0
order by like_count desc, pr.name asc;

-- ---------- Row level security ----------------------------
-- App has no auth; we trust client identity (UUID in localStorage).
-- Open policies are intentional. Tighten later if you add auth.

alter table profiles enable row level security;
alter table photos   enable row level security;
alter table likes    enable row level security;

drop policy if exists "profiles_read"   on profiles;
drop policy if exists "profiles_write"  on profiles;
create policy "profiles_read"  on profiles for select using (true);
create policy "profiles_write" on profiles for insert with check (true);
create policy "profiles_update" on profiles for update using (true) with check (true);

drop policy if exists "photos_read"   on photos;
drop policy if exists "photos_write"  on photos;
drop policy if exists "photos_delete" on photos;
create policy "photos_read"   on photos for select using (true);
create policy "photos_write"  on photos for insert with check (true);
create policy "photos_delete" on photos for delete using (true);

drop policy if exists "likes_read"   on likes;
drop policy if exists "likes_write"  on likes;
drop policy if exists "likes_delete" on likes;
create policy "likes_read"   on likes for select using (true);
create policy "likes_write"  on likes for insert with check (true);
create policy "likes_delete" on likes for delete using (true);

-- ---------- Storage bucket --------------------------------

insert into storage.buckets (id, name, public)
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do nothing;

drop policy if exists "wedding_photos_read"   on storage.objects;
drop policy if exists "wedding_photos_write"  on storage.objects;
drop policy if exists "wedding_photos_delete" on storage.objects;

create policy "wedding_photos_read"
  on storage.objects for select
  using (bucket_id = 'wedding-photos');

create policy "wedding_photos_write"
  on storage.objects for insert
  with check (bucket_id = 'wedding-photos');

create policy "wedding_photos_delete"
  on storage.objects for delete
  using (bucket_id = 'wedding-photos');

-- ---------- Realtime --------------------------------------
alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table likes;
