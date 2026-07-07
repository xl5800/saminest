-- Saminest database schema for Supabase
-- Run this file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

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
  is_featured boolean not null default false,
  reported_count integer not null default 0,
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

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
before update on public.listings
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.reports enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "profiles are readable by owner or admin" on public.profiles;
create policy "profiles are readable by owner or admin"
on public.profiles for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id and role = 'user');

drop policy if exists "public can read approved listings" on public.listings;
create policy "public can read approved listings"
on public.listings for select
using (status = 'approved' or auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "users can create pending listings" on public.listings;
create policy "users can create pending listings"
on public.listings for insert
with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "users can update own non-approved listings" on public.listings;
create policy "users can update own non-approved listings"
on public.listings for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and status in ('pending', 'expired')
);

drop policy if exists "admins can manage all listings" on public.listings;
create policy "admins can manage all listings"
on public.listings for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "authenticated users can report listings" on public.reports;
create policy "authenticated users can report listings"
on public.reports for insert
with check (auth.uid() = reporter_id);

drop policy if exists "admins can read reports" on public.reports;
create policy "admins can read reports"
on public.reports for select
using (public.is_admin(auth.uid()));

drop policy if exists "users can manage own favorites" on public.favorites;
create policy "users can manage own favorites"
on public.favorites for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Optional: after your own account signs up, promote yourself:
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
