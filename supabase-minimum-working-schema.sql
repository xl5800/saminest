-- Saminest minimum working Supabase setup
-- Use this if the full setup keeps failing.
-- This version avoids custom functions and triggers.

create extension if not exists "pgcrypto";

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('rental', 'secondhand')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  title text not null,
  description text not null,
  price numeric not null check (price >= 0),
  area text not null,
  category text not null,
  move_in date,
  nearby text,
  address text,
  lat double precision,
  lng double precision,
  image_url text,
  contact text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists listings_public_idx
  on public.listings (status, type, area, updated_at desc);

create index if not exists listings_owner_idx
  on public.listings (user_id, updated_at desc);

alter table public.listings enable row level security;
alter table public.reports enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "anyone can read approved listings" on public.listings;
create policy "anyone can read approved listings"
on public.listings for select
using (status = 'approved');

drop policy if exists "users can read own listings" on public.listings;
create policy "users can read own listings"
on public.listings for select
using (auth.uid() = user_id);

drop policy if exists "users can create pending listings" on public.listings;
create policy "users can create pending listings"
on public.listings for insert
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "users can update own pending or expired listings" on public.listings;
create policy "users can update own pending or expired listings"
on public.listings for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and status in ('pending', 'expired')
);

drop policy if exists "users can report listings" on public.reports;
create policy "users can report listings"
on public.reports for insert
with check (auth.uid() = reporter_id);

drop policy if exists "users can manage own favorites" on public.favorites;
create policy "users can manage own favorites"
on public.favorites for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
