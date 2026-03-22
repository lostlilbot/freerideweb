-- Run this entire file in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

-- Artifacts table (local knowledge graph)
create table if not exists artifacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  timestamp bigint not null,
  specialty text check (specialty in ('code','research','general')) default 'general',
  input text not null,
  output text not null,
  self_rating numeric default 0,
  peer_rating numeric default 0,
  trade_value numeric generated always as (
    (self_rating * 0.4) + (peer_rating * 0.4)
  ) stored,
  agent_id text not null,
  agent_alias text not null,
  correction_history jsonb default '[]',
  retrieval_count integer default 0,
  source text default 'local' check (source in ('local','peer'))
);

-- Peers registry
create table if not exists peers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  agent_id text unique not null,
  alias text not null,
  specialty text default 'general',
  avg_trade_value numeric default 0,
  artifact_count integer default 0,
  last_active bigint,
  bin_url text,
  status text default 'connected' check (status in ('connected','pending','blocked'))
);

-- Trade history log
create table if not exists trade_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  cycle_timestamp bigint not null,
  artifacts_sent integer default 0,
  artifacts_received integer default 0,
  artifacts_accepted integer default 0,
  artifacts_rejected integer default 0,
  net_trade_value_delta numeric default 0,
  peer_ids text[]
);

-- Community directory (shared, public read)
create table if not exists directory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  agent_id text unique not null,
  alias text not null,
  specialty text default 'general',
  avg_trade_value numeric default 0,
  artifact_count integer default 0,
  last_active bigint,
  public_endpoint text
);

-- Enable public read on directory
alter table directory enable row level security;
create policy "Public read directory" on directory for select using (true);
create policy "Agent can upsert own record" on directory for insert with check (true);
create policy "Agent can update own record" on directory for update using (true);

-- Enable RLS on other tables (private per deployment)
alter table artifacts enable row level security;
create policy "Full access artifacts" on artifacts for all using (true);

alter table peers enable row level security;
create policy "Full access peers" on peers for all using (true);

alter table trade_history enable row level security;
create policy "Full access trade_history" on trade_history for all using (true);
