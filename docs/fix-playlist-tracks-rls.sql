-- Shigatsu no Uta - repair playlist folder permissions
-- Run this in Supabase SQL Editor if the browser shows:
-- playlist_tracks: 403

alter table public.playlist_folders enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.playlist_shares enable row level security;

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

drop policy if exists "shares_select_access" on public.playlist_shares;
create policy "shares_select_access"
on public.playlist_shares for select
to authenticated
using (shared_with = auth.uid() or shared_by = auth.uid() or public.is_admin());
