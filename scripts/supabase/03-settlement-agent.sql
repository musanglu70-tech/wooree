-- AI 정산 에이전트: 조건 관리 + 대조 결과

create table if not exists public.settlement_agent_conditions (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  pharma_company_id uuid not null references public.pharma_companies(id) on delete cascade,
  commission_rate numeric not null default 0 check (commission_rate >= 0 and commission_rate <= 100),
  condition_type text not null check (
    condition_type in ('inout_combined', 'outonly', 'prescription_amount')
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_settlement_agent_conditions_pharma
  on public.settlement_agent_conditions (pharma_company_id);

create index if not exists idx_settlement_agent_conditions_active
  on public.settlement_agent_conditions (is_active)
  where is_active = true;

-- 정산파일 총액 (대조용, 수동·추후 파싱 연동)
alter table public.settlement_files
  add column if not exists total_amount numeric not null default 0;

create table if not exists public.settlement_results (
  id uuid primary key default gen_random_uuid(),
  condition_id uuid not null references public.settlement_agent_conditions(id) on delete cascade,
  settlement_month date not null,
  company_name text not null,
  pharma_company_id uuid not null references public.pharma_companies(id) on delete cascade,
  condition_type text not null,
  commission_rate numeric not null default 0,
  edi_amount numeric not null default 0,
  settlement_amount numeric not null default 0,
  expected_commission numeric not null default 0,
  difference_amount numeric not null default 0,
  match_status text not null default 'pending' check (
    match_status in ('matched', 'mismatch', 'pending')
  ),
  settlement_file_id uuid references public.settlement_files(id) on delete set null,
  compared_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_settlement_results_month
  on public.settlement_results (settlement_month desc);

create index if not exists idx_settlement_results_condition
  on public.settlement_results (condition_id, settlement_month);

create or replace function public.set_updated_at_settlement_agent_conditions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_settlement_agent_conditions_updated_at
  on public.settlement_agent_conditions;

create trigger trg_settlement_agent_conditions_updated_at
  before update on public.settlement_agent_conditions
  for each row execute function public.set_updated_at_settlement_agent_conditions();

alter table public.settlement_agent_conditions enable row level security;
alter table public.settlement_results enable row level security;

drop policy if exists settlement_agent_conditions_auth on public.settlement_agent_conditions;
create policy settlement_agent_conditions_auth
  on public.settlement_agent_conditions
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists settlement_results_auth on public.settlement_results;
create policy settlement_results_auth
  on public.settlement_results
  for all
  to authenticated
  using (true)
  with check (true);
