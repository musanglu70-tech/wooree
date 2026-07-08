-- ============================================================
-- 멀티테넌트 Phase 1 — 테넌트(CSO 업체)별 데이터 격리
--   테넌트 = companies 행 (CSO 업체)
--   직원(profiles)마다 소속 테넌트(tenant_id) 지정
--   본사 관리자(role='admin') → 전체
--   일반 직원 → 소속 테넌트(company_id) 데이터 + 본인 입력분
-- (07·09 이후 실행. 앱 쿼리는 RLS라 수정 불필요)
-- ============================================================

-- 1. 직원 소속 테넌트 컬럼
alter table public.profiles
  add column if not exists tenant_id uuid references public.companies(id) on delete set null;

create index if not exists idx_profiles_tenant on public.profiles (tenant_id);

-- 1-1. 관리자가 다른 직원 프로필(역할·소속) 조회/변경 허용
--     (기존 profiles_auth = 본인 행만 이라, 사용자 관리 기능에 필요)
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. 현재 로그인 직원의 소속 테넌트
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- 3. RLS 재설정 — 07의 조건을 테넌트 기준으로 확장
--    (본인 입력분 created_by 도 유지 → 미배정 직원 lockout 방지)

-- prescriptions
drop policy if exists prescriptions_staff_all on public.prescriptions;
create policy prescriptions_staff_all on public.prescriptions
  for all to authenticated
  using (
    not public.is_partner()
    and (
      public.is_admin()
      or company_id = public.current_tenant_id()
      or created_by = auth.uid()
    )
  )
  with check (
    not public.is_partner()
    and (
      public.is_admin()
      or company_id = public.current_tenant_id()
      or created_by = auth.uid()
    )
  );

-- prescription_items (부모 처방 기준)
drop policy if exists prescription_items_staff_all on public.prescription_items;
create policy prescription_items_staff_all on public.prescription_items
  for all to authenticated
  using (
    not public.is_partner()
    and (
      public.is_admin()
      or exists (
        select 1 from public.prescriptions p
        where p.id = prescription_id
          and (
            p.company_id = public.current_tenant_id()
            or p.created_by = auth.uid()
          )
      )
    )
  )
  with check (
    not public.is_partner()
    and (
      public.is_admin()
      or exists (
        select 1 from public.prescriptions p
        where p.id = prescription_id
          and (
            p.company_id = public.current_tenant_id()
            or p.created_by = auth.uid()
          )
      )
    )
  );

-- ============================================================
-- 사용법: 직원 ERP > 사용자 관리 에서 각 직원의 "소속 업체(테넌트)"를 지정.
--   지정 후 그 직원은 해당 CSO 업체의 처방/정산만 조회.
--   본사 관리자(role='admin')는 전체 + (Phase 2에서 테넌트 전환 예정).
-- ============================================================
