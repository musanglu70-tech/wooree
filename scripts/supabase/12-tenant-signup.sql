-- ============================================================
-- 사업자 = 테넌트 모델 (파트너 포털 폐지)
--   회원가입 = 테넌트(회사) 생성 + role='user' 직원. 메인 ERP 사용.
--   ⚠️ 핵심 보안: 한 사업자가 다른 사업자 데이터를 절대 못 봄.
-- (11 이후 실행)
-- ============================================================

-- 헬퍼 보장
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- ── 1. companies(테넌트) RLS 재설계 ──
--   관리자(본사) = 전체 / 사업자 = 본인 회사만
drop policy if exists companies_auth on public.companies;
drop policy if exists companies_staff_all on public.companies;
drop policy if exists companies_partner_select on public.companies;
drop policy if exists companies_partner_insert on public.companies;
drop policy if exists companies_admin_all on public.companies;
drop policy if exists companies_own_select on public.companies;
drop policy if exists companies_self_insert on public.companies;
drop policy if exists companies_own_update on public.companies;

create policy companies_admin_all on public.companies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy companies_own_select on public.companies
  for select to authenticated
  using (auth_user_id = auth.uid() or id = public.current_tenant_id());

create policy companies_self_insert on public.companies
  for insert to authenticated
  with check (auth_user_id = auth.uid());

create policy companies_own_update on public.companies
  for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- ── 2. 처방 자동 배정 트리거: 입력한 사업자(테넌트) 우선 ──
create or replace function public.set_prescription_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.company_id is null then
    -- 1순위: 입력자의 소속 테넌트(사업자 본인)
    new.company_id := public.current_tenant_id();
    -- 2순위: 병의원 매핑
    if new.company_id is null and coalesce(new.hospital_name,'') <> '' then
      select h.company_id into new.company_id
      from public.hospitals h
      where h.name = new.hospital_name and h.company_id is not null
      limit 1;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_set_prescription_company on public.prescriptions;
create trigger trg_set_prescription_company
  before insert or update of hospital_name, company_id
  on public.prescriptions
  for each row execute function public.set_prescription_company();

-- ── 3. 정산 관련 테이블: 본사(admin) 전용으로 제한 (사업자 유출 방지) ──
--   (사업자는 EDI 입력·본인 처방만. 정산 마스터는 본사만)
do $$
begin
  if to_regclass('public.settlement_agent_conditions') is not null then
    execute 'alter table public.settlement_agent_conditions enable row level security';
    execute 'drop policy if exists settlement_agent_conditions_auth on public.settlement_agent_conditions';
    execute 'drop policy if exists settlement_agent_conditions_admin on public.settlement_agent_conditions';
    execute 'create policy settlement_agent_conditions_admin on public.settlement_agent_conditions for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
  if to_regclass('public.settlement_results') is not null then
    execute 'alter table public.settlement_results enable row level security';
    execute 'drop policy if exists settlement_results_auth on public.settlement_results';
    execute 'drop policy if exists settlement_results_admin on public.settlement_results';
    execute 'create policy settlement_results_admin on public.settlement_results for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
  if to_regclass('public.settlement_files') is not null then
    execute 'alter table public.settlement_files enable row level security';
    execute 'drop policy if exists settlement_files_auth on public.settlement_files';
    execute 'drop policy if exists settlement_files_admin on public.settlement_files';
    execute 'create policy settlement_files_admin on public.settlement_files for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;

-- ============================================================
-- 참고:
--  * 회원가입은 앱에서 signUp(role='user') → companies insert(본인) →
--    profiles upsert(tenant_id, role='user') → /dashboard.
--  * 파트너 포털(/portal)은 더 이상 사용 안 함(사업자도 메인 앱 사용).
--  * ⚠️ 실서비스 전 RLS 격리 침투 테스트 필수 (사업자 A가 B 데이터 못 보는지).
-- ============================================================
