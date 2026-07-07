-- Saminest: messaging tables and baseline RLS policies
-- 在 Supabase Dashboard -> SQL Editor 运行一次。
-- 管理员邮箱：xlw0980@gmail.com

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.banned_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  banned_by uuid references auth.users(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists conversations_buyer_idx on public.conversations(buyer_id);
create index if not exists conversations_seller_idx on public.conversations(seller_id);
create index if not exists conversations_listing_idx on public.conversations(listing_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists banned_users_created_idx on public.banned_users(created_at);
create index if not exists feedback_created_idx on public.feedback(created_at);
create index if not exists feedback_user_idx on public.feedback(user_id);

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.listing_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.banned_users enable row level security;
alter table public.feedback enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'xlw0980@gmail.com'
     or exists (
       select 1 from public.profiles
       where id = auth.uid() and role = 'admin'
     );
$$;

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
      new.status = old.status;
      new.user_id = old.user_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_listing_status_trigger on public.listings;
create trigger enforce_listing_status_trigger
before insert or update on public.listings
for each row execute function public.enforce_listing_status();

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'favorites' and constraint_name = 'favorites_listing_id_fkey'
  ) then
    alter table public.favorites drop constraint favorites_listing_id_fkey;
  end if;
  alter table public.favorites
    add constraint favorites_listing_id_fkey
    foreign key (listing_id) references public.listings(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'reports' and constraint_name = 'reports_listing_id_fkey'
  ) then
    alter table public.reports drop constraint reports_listing_id_fkey;
  end if;
  alter table public.reports
    add constraint reports_listing_id_fkey
    foreign key (listing_id) references public.listings(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'listing_images' and constraint_name = 'listing_images_listing_id_fkey'
  ) then
    alter table public.listing_images drop constraint listing_images_listing_id_fkey;
  end if;
  alter table public.listing_images
    add constraint listing_images_listing_id_fkey
    foreign key (listing_id) references public.listings(id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (
  id = auth.uid()
  and email = coalesce(auth.jwt() ->> 'email', email)
  and (role = 'user' or coalesce(auth.jwt() ->> 'email', '') = 'xlw0980@gmail.com')
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and email = coalesce(auth.jwt() ->> 'email', email)
    and (role = 'user' or coalesce(auth.jwt() ->> 'email', '') = 'xlw0980@gmail.com')
  )
);

drop policy if exists "listings_select_visible" on public.listings;
create policy "listings_select_visible"
on public.listings for select
to anon, authenticated
using (
  status = 'approved'
  or user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own"
on public.listings for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "listings_update_owner_or_admin" on public.listings;
create policy "listings_update_owner_or_admin"
on public.listings for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "listings_delete_owner_or_admin" on public.listings;
create policy "listings_delete_owner_or_admin"
on public.listings for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
on public.favorites for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
on public.favorites for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
on public.favorites for delete
to authenticated
using (user_id = auth.uid());

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

drop policy if exists "banned_users_select_admin_or_self" on public.banned_users;
create policy "banned_users_select_admin_or_self"
on public.banned_users for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "banned_users_insert_admin" on public.banned_users;
create policy "banned_users_insert_admin"
on public.banned_users for insert
to authenticated
with check (public.is_admin());

drop policy if exists "banned_users_update_admin" on public.banned_users;
create policy "banned_users_update_admin"
on public.banned_users for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "banned_users_delete_admin" on public.banned_users;
create policy "banned_users_delete_admin"
on public.banned_users for delete
to authenticated
using (public.is_admin());

drop policy if exists "feedback_insert_authenticated" on public.feedback;
create policy "feedback_insert_authenticated"
on public.feedback for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "feedback_select_admin_or_own" on public.feedback;
create policy "feedback_select_admin_or_own"
on public.feedback for select
to authenticated
using (public.is_admin() or user_id = auth.uid());

drop policy if exists "feedback_update_admin" on public.feedback;
create policy "feedback_update_admin"
on public.feedback for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
on public.conversations for select
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "conversations_insert_buyer" on public.conversations;
create policy "conversations_insert_buyer"
on public.conversations for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and seller_id <> auth.uid()
);

drop policy if exists "conversations_update_participant" on public.conversations;
create policy "conversations_update_participant"
on public.conversations for update
to authenticated
using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin())
with check (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

update public.profiles
set role = 'admin'
where email = 'xlw0980@gmail.com';
