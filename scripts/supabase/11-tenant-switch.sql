-- ============================================================
-- 멀티테넌트 Phase 2 — 본사 관리자 테넌트 전환
--   관리자가 특정 테넌트를 "선택"하면 그 테넌트 데이터만 조회.
--   profiles.active_tenant_id 에 선택값 저장 → RLS가 읽음 →
--   뷰(security_invoker) 포함 모든 쿼리 자동 반영 (화면 수정 불필요).
-- (10-multitenant.sql 이후 실행)
-- ============================================================

-- 관리자가 현재 선택한 테넌트 (null = 전체 보기)
alter table public.profiles
  add column if not exists active_tenant_id uuid references public.companies(id) on delete set null;

create or replace function public.admin_active_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_tenant_id from public.profiles where id = auth.uid();
$$;

-- 헬퍼(없으면 생성)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.is_partner()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'partner';
$$;
create or replace function public.current_tenant_id()
returns uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.profiles where id = auth.uid();
$$;

-- RLS: 관리자는 (선택 테넌트 있으면 그것만, 없으면 전체) / 직원은 소속 테넌트+본인분
drop policy if exists prescriptions_staff_all on public.prescriptions;
create policy prescriptions_staff_all on public.prescriptions
  for all to authenticated
  using (
    not public.is_partner()
    and (
      (public.is_admin()
        and (public.admin_active_tenant() is null
             or company_id = public.admin_active_tenant()))
      or (not public.is_admin()
        and (company_id = public.current_tenant_id() or created_by = auth.uid()))
    )
  )
  with check (
    not public.is_partner()
    and (public.is_admin() or company_id = public.current_tenant_id() or created_by = auth.uid())
  );

drop policy if exists prescription_items_staff_all on public.prescription_items;
create policy prescription_items_staff_all on public.prescription_items
  for all to authenticated
  using (
    not public.is_partner()
    and (
      (public.is_admin() and exists (
        select 1 from public.prescriptions p
        where p.id = prescription_id
          and (public.admin_active_tenant() is null
               or p.company_id = public.admin_active_tenant())))
      or (not public.is_admin() and exists (
        select 1 from public.prescriptions p
        where p.id = prescription_id
          and (p.company_id = public.current_tenant_id() or p.created_by = auth.uid())))
    )
  )
  with check (
    not public.is_partner()
    and (public.is_admin() or exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id
        and (p.company_id = public.current_tenant_id() or p.created_by = auth.uid())))
  );
