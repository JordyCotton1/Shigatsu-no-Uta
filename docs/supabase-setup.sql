-- Shigatsu no Uta - Supabase setup
-- Run this file in Supabase SQL Editor.
-- This file contains no API keys or passwords.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text not null default 'Usuario',
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'user';

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  artist text not null,
  album text,
  genre text not null,
  cover_url text,
  audio_url text not null,
  storage_path text not null,
  metadata_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tracks add column if not exists album text;
alter table public.tracks add column if not exists metadata_source text;
alter table public.tracks drop constraint if exists tracks_genre_check;

create table if not exists public.playlist_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  folder_id uuid not null references public.playlist_folders(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  added_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, track_id)
);

create table if not exists public.playlist_shares (
  folder_id uuid not null references public.playlist_folders(id) on delete cascade,
  shared_with uuid not null references public.profiles(id) on delete cascade,
  shared_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, shared_with)
);

create table if not exists public.category_covers (
  category_id text primary key,
  cover_url text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tracks enable row level security;
alter table public.playlist_folders enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.playlist_shares enable row level security;
alter table public.category_covers enable row level security;
alter table public.app_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "tracks_select_authenticated" on public.tracks;
create policy "tracks_select_authenticated"
on public.tracks for select
to authenticated
using (true);

drop policy if exists "tracks_insert_own" on public.tracks;
create policy "tracks_insert_own"
on public.tracks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "tracks_update_own" on public.tracks;
create policy "tracks_update_own"
on public.tracks for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_delete_own"
on public.tracks for delete
to authenticated
using (public.is_admin());

drop policy if exists "folders_select_access" on public.playlist_folders;
create policy "folders_select_access"
on public.playlist_folders for select
to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.playlist_shares
    where playlist_shares.folder_id = playlist_folders.id
    and playlist_shares.shared_with = auth.uid()
  )
);

drop policy if exists "folders_insert_own" on public.playlist_folders;
create policy "folders_insert_own"
on public.playlist_folders for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "folders_update_own" on public.playlist_folders;
create policy "folders_update_own"
on public.playlist_folders for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "folders_delete_own" on public.playlist_folders;
create policy "folders_delete_own"
on public.playlist_folders for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "folder_tracks_select_access" on public.playlist_tracks;
create policy "folder_tracks_select_access"
on public.playlist_tracks for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.playlist_folders
    where playlist_folders.id = playlist_tracks.folder_id
    and (
      playlist_folders.owner_id = auth.uid()
      or exists (
        select 1
        from public.playlist_shares
        where playlist_shares.folder_id = playlist_tracks.folder_id
        and playlist_shares.shared_with = auth.uid()
      )
    )
  )
);

drop policy if exists "folder_tracks_insert_access" on public.playlist_tracks;
create policy "folder_tracks_insert_access"
on public.playlist_tracks for insert
to authenticated
with check (
  added_by = auth.uid()
  and exists (
    select 1
    from public.playlist_folders
    where playlist_folders.id = folder_id
    and (
      playlist_folders.owner_id = auth.uid()
      or exists (
        select 1
        from public.playlist_shares
        where playlist_shares.folder_id = folder_id
        and playlist_shares.shared_with = auth.uid()
      )
    )
  )
);

drop policy if exists "folder_tracks_delete_access" on public.playlist_tracks;
create policy "folder_tracks_delete_access"
on public.playlist_tracks for delete
to authenticated
using (
  added_by = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.playlist_folders
    where playlist_folders.id = playlist_tracks.folder_id
    and playlist_folders.owner_id = auth.uid()
  )
);

drop policy if exists "shares_select_access" on public.playlist_shares;
create policy "shares_select_access"
on public.playlist_shares for select
to authenticated
using (shared_with = auth.uid() or shared_by = auth.uid() or public.is_admin());

drop policy if exists "shares_insert_owner" on public.playlist_shares;
create policy "shares_insert_owner"
on public.playlist_shares for insert
to authenticated
with check (
  shared_by = auth.uid()
  and exists (
    select 1
    from public.playlist_folders
    where playlist_folders.id = folder_id
    and playlist_folders.owner_id = auth.uid()
  )
);

drop policy if exists "shares_delete_owner" on public.playlist_shares;
create policy "shares_delete_owner"
on public.playlist_shares for delete
to authenticated
using (shared_by = auth.uid() or public.is_admin());

drop policy if exists "category_covers_select_authenticated" on public.category_covers;
create policy "category_covers_select_authenticated"
on public.category_covers for select
to authenticated
using (true);

drop policy if exists "category_covers_admin_insert" on public.category_covers;
create policy "category_covers_admin_insert"
on public.category_covers for insert
to authenticated
with check (public.is_admin());

drop policy if exists "category_covers_admin_update" on public.category_covers;
create policy "category_covers_admin_update"
on public.category_covers for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "app_settings_select_all" on public.app_settings;
create policy "app_settings_select_all"
on public.app_settings for select
to anon, authenticated
using (true);

drop policy if exists "app_settings_admin_insert" on public.app_settings;
create policy "app_settings_admin_insert"
on public.app_settings for insert
to authenticated
with check (public.is_admin());

drop policy if exists "app_settings_admin_update" on public.app_settings;
create policy "app_settings_admin_update"
on public.app_settings for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_tracks_updated_at on public.tracks;
create trigger set_tracks_updated_at
before update on public.tracks
for each row execute function public.set_updated_at();

drop trigger if exists set_category_covers_updated_at on public.category_covers;
create trigger set_category_covers_updated_at
before update on public.category_covers
for each row execute function public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

insert into public.app_settings (key, value)
values ('creator_name', 'Enrique')
on conflict (key) do update
set value = excluded.value;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'songs',
  'songs',
  true,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-wav', 'audio/webm', 'video/mpeg', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "songs_select_authenticated" on storage.objects;
create policy "songs_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'songs');

drop policy if exists "songs_insert_own_folder" on storage.objects;
create policy "songs_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'songs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "songs_delete_own_folder" on storage.objects;
create policy "songs_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'songs'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      'Usuario'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update
  set
    username = excluded.username,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

notify pgrst, 'reload schema';
