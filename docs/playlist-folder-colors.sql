-- Shigatsu no Uta - playlist color and cover fields
-- Run this in Supabase SQL Editor so playlist colors persist for every user.

alter table public.playlist_folders
add column if not exists color text default '#1ed760',
add column if not exists cover_url text;
