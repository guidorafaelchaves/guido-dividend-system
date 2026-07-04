-- Radar de Proventos SaaS multi-tenant baseline.
-- Regra de negócio: não há tabelas de peso de ativo, rebalanceamento ou alocação ideal.

create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.user_system_configs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint no_client_side_secrets check (
    coalesce(config #>> '{external,brapiToken}', '') = ''
    and coalesce(config #>> '{external,sheetsApiKey}', '') = ''
    and coalesce(config #>> '{ai,openaiApiKey}', '') = ''
  )
);

create table if not exists public.b3_import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_kind text not null,
  file_name text,
  row_count integer not null default 0,
  checksum text,
  imported_at timestamptz not null default now()
);

create table if not exists public.b3_cashflow_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid references public.b3_import_batches(id) on delete set null,
  ticker text not null,
  event_type text not null,
  reference_date date,
  payment_date date,
  gross_amount numeric(18, 6),
  net_amount numeric(18, 6),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.b3_trade_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid references public.b3_import_batches(id) on delete set null,
  ticker text not null,
  trade_date date not null,
  side text not null,
  quantity numeric(18, 6),
  unit_price numeric(18, 6),
  fees numeric(18, 6),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.b3_custody_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid references public.b3_import_batches(id) on delete set null,
  ticker text not null,
  snapshot_date date not null,
  quantity numeric(18, 6),
  average_cost numeric(18, 6),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_user on public.tenant_memberships(user_id);
create index if not exists idx_cashflow_tenant_ticker on public.b3_cashflow_events(tenant_id, ticker, payment_date);
create index if not exists idx_trades_tenant_ticker on public.b3_trade_events(tenant_id, ticker, trade_date);
create index if not exists idx_custody_tenant_ticker on public.b3_custody_snapshots(tenant_id, ticker, snapshot_date);

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.user_system_configs enable row level security;
alter table public.b3_import_batches enable row level security;
alter table public.b3_cashflow_events enable row level security;
alter table public.b3_trade_events enable row level security;
alter table public.b3_custody_snapshots enable row level security;

create policy tenants_read_own on public.tenants
  for select using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = tenants.id and m.user_id = auth.uid()
    )
  );

create policy memberships_read_own on public.tenant_memberships
  for select using (user_id = auth.uid());

create policy configs_owner_all on public.user_system_configs
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy import_batches_tenant_all on public.b3_import_batches
  for all using (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_import_batches.tenant_id and m.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_import_batches.tenant_id and m.user_id = auth.uid())
  );

create policy cashflow_tenant_all on public.b3_cashflow_events
  for all using (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_cashflow_events.tenant_id and m.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_cashflow_events.tenant_id and m.user_id = auth.uid())
  );

create policy trades_tenant_all on public.b3_trade_events
  for all using (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_trade_events.tenant_id and m.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_trade_events.tenant_id and m.user_id = auth.uid())
  );

create policy custody_tenant_all on public.b3_custody_snapshots
  for all using (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_custody_snapshots.tenant_id and m.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.tenant_memberships m where m.tenant_id = b3_custody_snapshots.tenant_id and m.user_id = auth.uid())
  );
