-- Saminest production updates.
-- Run this once in Supabase SQL Editor after the existing schema/policy files.

create extension if not exists "pgcrypto";

-- Compatibility helper for policy files that call public.is_admin().
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

-- Real uploaded listing photos.
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx
  on public.listing_images (listing_id, sort_order);

alter table public.listing_images enable row level security;

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists "listing_images_storage_select" on storage.objects;
create policy "listing_images_storage_select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'listing-images');

drop policy if exists "listing_images_storage_insert" on storage.objects;
create policy "listing_images_storage_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and owner = auth.uid()
);

drop policy if exists "listing_images_storage_update" on storage.objects;
create policy "listing_images_storage_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'listing-images'
  and owner = auth.uid()
)
with check (
  bucket_id = 'listing-images'
  and owner = auth.uid()
);

drop policy if exists "listing_images_storage_delete" on storage.objects;
create policy "listing_images_storage_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and owner = auth.uid()
);

drop policy if exists "listing_images_select_visible" on public.listing_images;
create policy "listing_images_select_visible"
on public.listing_images for select
to anon, authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id
      and (l.status = 'approved' or l.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "listing_images_insert_owner" on public.listing_images;
create policy "listing_images_insert_owner"
on public.listing_images for insert
to authenticated
with check (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "listing_images_delete_owner_or_admin" on public.listing_images;
create policy "listing_images_delete_owner_or_admin"
on public.listing_images for delete
to authenticated
using (
  exists (
    select 1 from public.listings l
    where l.id = listing_id and (l.user_id = auth.uid() or public.is_admin())
  )
);

-- Owners can delete their own posts. Owners can unpublish by setting status = expired.
drop policy if exists "listings_delete_owner_or_admin" on public.listings;
create policy "listings_delete_owner_or_admin"
on public.listings for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "listings_update_owner_or_admin" on public.listings;
create policy "listings_update_owner_or_admin"
on public.listings for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create or replace function public.enforce_listing_status()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  if not public.is_admin() then
    if exists (select 1 from public.banned_users where user_id = new.user_id) then
      raise exception 'account banned';
    end if;
    if tg_op = 'INSERT' then
      new.status = 'pending';
    elsif tg_op = 'UPDATE' then
      new.user_id = old.user_id;
      if old.user_id = auth.uid() and new.status = 'expired' then
        new.status = 'expired';
      else
        new.status = 'pending';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Reports with user-entered reason text.
alter table public.reports enable row level security;

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated"
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "reports_select_admin_or_own" on public.reports;
create policy "reports_select_admin_or_own"
on public.reports for select
to authenticated
using (reporter_id = auth.uid() or public.is_admin());

-- Supabase Dashboard Auth setup for https://www.saminest.com:
-- 1. Authentication > Providers > Email: enable Confirm email.
-- 2. Authentication > URL Configuration > Site URL: https://www.saminest.com
-- 3. Authentication > URL Configuration > Redirect URLs:
--    https://www.saminest.com/**
--    https://saminest.com/**
-- 4. Authentication > SMTP Settings controls the sender/from email.
--    Do not put SMTP passwords, Resend API keys, or service_role keys in frontend files.
