-- Shigatsu no Uta - global app settings
-- Run this once in Supabase SQL Editor.

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

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

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

insert into public.app_settings (key, value)
values ('creator_name', 'Enrique')
on conflict (key) do update
set value = excluded.value;

notify pgrst, 'reload schema';
