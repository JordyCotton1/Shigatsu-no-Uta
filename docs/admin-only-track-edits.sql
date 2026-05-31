-- Ejecuta esto en Supabase SQL Editor para que solo el admin pueda editar o eliminar canciones.

drop policy if exists "tracks_update_own" on public.tracks;
create policy "tracks_update_own"
on public.tracks
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tracks_delete_own" on public.tracks;
create policy "tracks_delete_own"
on public.tracks
for delete
to authenticated
using (public.is_admin());
