-- Theatre Ops — Slice 3 migration
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Main counter (13 items, one row per show) ───────────────────
create table if not exists theatre_main_counter (
  id         uuid primary key default gen_random_uuid(),
  show_id    uuid not null references theatre_shows(id) on delete cascade,
  items      jsonb not null default '{}',
  upi        integer not null default 0,
  cash       integer not null default 0,
  created_at timestamptz default now(),
  constraint uq_mc_show unique (show_id)
);

-- ── Popcorn slip (3 cones + BMS combo, one row per show) ────────
create table if not exists theatre_popcorn (
  id         uuid primary key default gen_random_uuid(),
  show_id    uuid not null references theatre_shows(id) on delete cascade,
  items      jsonb not null default '{}',
  bms_combo  integer not null default 0,
  upi        integer not null default 0,
  cash       integer not null default 0,
  created_at timestamptz default now(),
  constraint uq_pc_show unique (show_id)
);

-- ── Cool drinks slip (4 drinks + 7 live counter, one row per show)
create table if not exists theatre_cool_drinks (
  id         uuid primary key default gen_random_uuid(),
  show_id    uuid not null references theatre_shows(id) on delete cascade,
  items      jsonb not null default '{}',
  upi        integer not null default 0,
  cash       integer not null default 0,
  created_at timestamptz default now(),
  constraint uq_cd_show unique (show_id)
);

-- ── Parking (scooter/auto/car, one row per show) ─────────────────
create table if not exists theatre_parking (
  id              uuid primary key default gen_random_uuid(),
  show_id         uuid not null references theatre_shows(id) on delete cascade,
  scooter_count   integer not null default 0,
  auto_count      integer not null default 0,
  car_count       integer not null default 0,
  reported_amount integer,
  created_at      timestamptz default now(),
  constraint uq_pk_show unique (show_id)
);

-- ── RLS ──────────────────────────────────────────────────────────
alter table theatre_main_counter enable row level security;
alter table theatre_popcorn       enable row level security;
alter table theatre_cool_drinks   enable row level security;
alter table theatre_parking       enable row level security;

-- Helper: walk show → day → theatre → owner_id
create or replace function theatre_show_owner(p_show_id uuid)
returns uuid language sql security definer stable as $$
  select tt.owner_id
  from   theatre_shows    ts
  join   theatre_days     td on td.id = ts.day_id
  join   theatre_theatres tt on tt.id = td.theatre_id
  where  ts.id = p_show_id
$$;

-- Policies: owner full access, others nothing
create policy "mc_owner" on theatre_main_counter
  for all using (theatre_show_owner(show_id) = auth.uid());

create policy "pc_owner" on theatre_popcorn
  for all using (theatre_show_owner(show_id) = auth.uid());

create policy "cd_owner" on theatre_cool_drinks
  for all using (theatre_show_owner(show_id) = auth.uid());

create policy "pk_owner" on theatre_parking
  for all using (theatre_show_owner(show_id) = auth.uid());

-- ── Upsert examples (for reference — handled by the app) ─────────
-- INSERT INTO theatre_main_counter (show_id, items, upi, cash)
-- VALUES ($1, $2, $3, $4)
-- ON CONFLICT (show_id) DO UPDATE SET
--   items = EXCLUDED.items,
--   upi   = EXCLUDED.upi,
--   cash  = EXCLUDED.cash;
