create extension if not exists pgcrypto;

create table if not exists public.commercial_leads (
  id uuid primary key default gen_random_uuid(),
  organizer_name text not null default '',
  company_name text not null default '',
  contact_channel text not null default '',
  email text not null default '',
  phone text not null default '',
  city text not null default '',
  event_type text not null default '',
  contact_date date,
  status text not null default 'Nuovo contatto',
  marketing_proposal_sent boolean not null default false,
  notes text not null default '',
  offer_pdf_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.commercial_leads
  add column if not exists contact_channel text not null default '';

alter table public.commercial_leads
  add column if not exists marketing_proposal_sent boolean not null default false;

create index if not exists commercial_leads_status_idx
  on public.commercial_leads (status);

create index if not exists commercial_leads_contact_date_idx
  on public.commercial_leads (contact_date desc);

alter table public.commercial_leads enable row level security;

drop policy if exists "commercial_leads_select_internal" on public.commercial_leads;
create policy "commercial_leads_select_internal"
on public.commercial_leads
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo', 'marketing')
  )
);

drop policy if exists "commercial_leads_insert_internal" on public.commercial_leads;
create policy "commercial_leads_insert_internal"
on public.commercial_leads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo', 'marketing')
  )
);

drop policy if exists "commercial_leads_update_internal" on public.commercial_leads;
create policy "commercial_leads_update_internal"
on public.commercial_leads
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo', 'marketing')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo', 'marketing')
  )
);

drop policy if exists "commercial_leads_delete_internal" on public.commercial_leads;
create policy "commercial_leads_delete_internal"
on public.commercial_leads
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo', 'marketing')
  )
);

insert into storage.buckets (id, name, public)
values ('commercial-offers', 'commercial-offers', true)
on conflict (id) do nothing;

drop policy if exists "commercial_offers_upload_internal" on storage.objects;
create policy "commercial_offers_upload_internal"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'commercial-offers'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo', 'marketing')
  )
);

drop policy if exists "commercial_offers_read_internal" on storage.objects;
create policy "commercial_offers_read_internal"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'commercial-offers'
);
