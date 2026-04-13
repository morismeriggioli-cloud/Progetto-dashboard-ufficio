create table if not exists public.ticka_dashboard_daily_snapshots (
  date date primary key,
  cached_at timestamptz not null default now(),
  source_version text not null default 'v1',
  snapshot jsonb not null
);

create index if not exists ticka_dashboard_daily_snapshots_cached_at_idx
  on public.ticka_dashboard_daily_snapshots (cached_at desc);

alter table public.ticka_dashboard_daily_snapshots enable row level security;

drop policy if exists "No direct client access to ticka dashboard cache"
  on public.ticka_dashboard_daily_snapshots;

create policy "No direct client access to ticka dashboard cache"
  on public.ticka_dashboard_daily_snapshots
  for all
  using (false)
  with check (false);
