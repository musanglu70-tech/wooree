-- ============================================================
-- RLS (Row-Level Security) 보안 설정
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── 1. 모든 테이블에 RLS 활성화 ──
alter table if exists public.prescriptions           enable row level security;
alter table if exists public.prescription_items      enable row level security;
alter table if exists public.pharma_companies        enable row level security;
alter table if exists public.notices                 enable row level security;
alter table if exists public.settlement_files        enable row level security;
alter table if exists public.settlement_agent_conditions enable row level security;
alter table if exists public.settlement_results      enable row level security;
alter table if exists public.automation_tasks        enable row level security;
alter table if exists public.companies               enable row level security;
alter table if exists public.contracts               enable row level security;
alter table if exists public.hospitals               enable row level security;
alter table if exists public.products                enable row level security;
alter table if exists public.profiles                enable row level security;
alter table if exists public.recommission_reports    enable row level security;

-- ── 2. 기존 정책 제거 후 재생성 ──

-- prescriptions
drop policy if exists prescriptions_auth on public.prescriptions;
create policy prescriptions_auth on public.prescriptions
  for all to authenticated using (true) with check (true);

-- prescription_items
drop policy if exists prescription_items_auth on public.prescription_items;
create policy prescription_items_auth on public.prescription_items
  for all to authenticated using (true) with check (true);

-- pharma_companies
drop policy if exists pharma_companies_auth on public.pharma_companies;
create policy pharma_companies_auth on public.pharma_companies
  for all to authenticated using (true) with check (true);

-- notices
drop policy if exists notices_auth on public.notices;
create policy notices_auth on public.notices
  for all to authenticated using (true) with check (true);

-- settlement_files
drop policy if exists settlement_files_auth on public.settlement_files;
create policy settlement_files_auth on public.settlement_files
  for all to authenticated using (true) with check (true);

-- settlement_agent_conditions (이미 있을 수 있으나 안전하게 재설정)
drop policy if exists settlement_agent_conditions_auth on public.settlement_agent_conditions;
create policy settlement_agent_conditions_auth on public.settlement_agent_conditions
  for all to authenticated using (true) with check (true);

-- settlement_results
drop policy if exists settlement_results_auth on public.settlement_results;
create policy settlement_results_auth on public.settlement_results
  for all to authenticated using (true) with check (true);

-- automation_tasks
drop policy if exists automation_tasks_auth on public.automation_tasks;
create policy automation_tasks_auth on public.automation_tasks
  for all to authenticated using (true) with check (true);

-- companies
drop policy if exists companies_auth on public.companies;
create policy companies_auth on public.companies
  for all to authenticated using (true) with check (true);

-- contracts
drop policy if exists contracts_auth on public.contracts;
create policy contracts_auth on public.contracts
  for all to authenticated using (true) with check (true);

-- hospitals
drop policy if exists hospitals_auth on public.hospitals;
create policy hospitals_auth on public.hospitals
  for all to authenticated using (true) with check (true);

-- products
drop policy if exists products_auth on public.products;
create policy products_auth on public.products
  for all to authenticated using (true) with check (true);

-- profiles (본인 프로필만 접근)
drop policy if exists profiles_auth on public.profiles;
create policy profiles_auth on public.profiles
  for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- recommission_reports
drop policy if exists recommission_reports_auth on public.recommission_reports;
create policy recommission_reports_auth on public.recommission_reports
  for all to authenticated using (true) with check (true);

-- ── 3. Storage: prescription-attachments 버킷 보안 ──
-- (Supabase Dashboard > Storage > Policies 에서도 확인)
insert into storage.buckets (id, name, public)
values ('prescription-attachments', 'prescription-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "auth_upload" on storage.objects;
create policy "auth_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prescription-attachments');

drop policy if exists "auth_read" on storage.objects;
create policy "auth_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'prescription-attachments');

drop policy if exists "auth_delete" on storage.objects;
create policy "auth_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'prescription-attachments');
