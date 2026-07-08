-- ============================================================
-- 사용자별 데이터 영역 분리 (본인 입력 데이터 기준)
--   관리자(role='admin')      → 전체 데이터
--   일반/조회(user/viewer)     → 본인이 입력한(created_by) 처방만
-- RLS 기반이라 앱 쿼리는 수정 불필요.
-- Supabase SQL Editor에서 실행 (05·06 이후).
--
-- ⚠️ 실행 전 필수: 관리자 계정의 profiles.role 이 'admin' 인지 확인!
--    안 그러면 관리자도 본인 데이터만 보이게 됩니다. (맨 아래 4번 참고)
-- ============================================================

-- 1. created_by 컬럼 보장 + 기본값 auth.uid()
alter table public.prescriptions
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.prescriptions
  alter column created_by set default auth.uid();

create index if not exists idx_prescriptions_created_by on public.prescriptions (created_by);

-- 2. 관리자 판별 헬퍼
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3. RLS 재설정 — 직원 정책에 (관리자 전체 OR 본인 것) 조건 추가
--    파트너 정책(05번)은 그대로 유지됨.

-- prescriptions
drop policy if exists prescriptions_staff_all on public.prescriptions;
create policy prescriptions_staff_all on public.prescriptions
  for all to authenticated
  using (
    not public.is_partner()
    and (public.is_admin() or created_by = auth.uid())
  )
  with check (
    not public.is_partner()
    and (public.is_admin() or created_by = auth.uid())
  );

-- prescription_items (부모 처방의 소유자 기준)
drop policy if exists prescription_items_staff_all on public.prescription_items;
create policy prescription_items_staff_all on public.prescription_items
  for all to authenticated
  using (
    not public.is_partner()
    and (
      public.is_admin()
      or exists (
        select 1 from public.prescriptions p
        where p.id = prescription_id and p.created_by = auth.uid()
      )
    )
  )
  with check (
    not public.is_partner()
    and (
      public.is_admin()
      or exists (
        select 1 from public.prescriptions p
        where p.id = prescription_id and p.created_by = auth.uid()
      )
    )
  );

-- ============================================================
-- 4. [필수] 관리자 계정 지정 — 본인 이메일로 실행하세요.
--    (이 줄을 실행해야 관리자가 전체 데이터를 봅니다)
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'admin@wuri.com');
--
-- 참고: 기존 처방 중 created_by 가 비어있는(NULL) 데이터는 일반 사용자에겐
--       안 보입니다(관리자만 조회). 특정 사용자에게 귀속시키려면:
--   update public.prescriptions set created_by =
--     (select id from auth.users where email='담당자이메일')
--   where created_by is null and hospital_name = '...';
-- ============================================================
