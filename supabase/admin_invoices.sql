create extension if not exists pgcrypto;

create table if not exists public.admin_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  invoice_number text not null,
  invoice_date date,
  payment_amount numeric(12,2) not null default 0,
  invoice_state text not null default '',
  is_paid boolean not null default false,
  category text not null default 'Da classificare',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.admin_invoices
  add column if not exists is_paid boolean not null default false;

alter table if exists public.admin_invoices
  add column if not exists category text not null default 'Da classificare';

alter table if exists public.admin_invoices
  add column if not exists invoice_state text not null default '';

create unique index if not exists admin_invoices_invoice_number_idx
  on public.admin_invoices (invoice_number);

create index if not exists admin_invoices_invoice_date_idx
  on public.admin_invoices (invoice_date desc);

create index if not exists admin_invoices_category_idx
  on public.admin_invoices (category);

create or replace function public.set_admin_invoices_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_admin_invoices_updated_at on public.admin_invoices;

create trigger trg_admin_invoices_updated_at
before update on public.admin_invoices
for each row
execute function public.set_admin_invoices_updated_at();

alter table public.admin_invoices enable row level security;

drop policy if exists "admin_invoices_select_internal" on public.admin_invoices;
create policy "admin_invoices_select_internal"
on public.admin_invoices
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo')
  )
);

drop policy if exists "admin_invoices_insert_internal" on public.admin_invoices;
create policy "admin_invoices_insert_internal"
on public.admin_invoices
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo')
  )
);

drop policy if exists "admin_invoices_update_internal" on public.admin_invoices;
create policy "admin_invoices_update_internal"
on public.admin_invoices
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'ceo')
  )
);
