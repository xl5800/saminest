-- Add multi-image support for listings.
-- Run this once in Supabase SQL Editor.

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

drop policy if exists "public can read approved listing images" on public.listing_images;
create policy "public can read approved listing images"
on public.listing_images for select
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and (
        listings.status = 'approved'
        or listings.user_id = auth.uid()
        or public.is_admin(auth.uid())
      )
  )
);

drop policy if exists "users can add images to own listings" on public.listing_images;
create policy "users can add images to own listings"
on public.listing_images for insert
with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.user_id = auth.uid()
  )
);

drop policy if exists "users can manage own listing images" on public.listing_images;
create policy "users can manage own listing images"
on public.listing_images for delete
using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.user_id = auth.uid()
  )
);
