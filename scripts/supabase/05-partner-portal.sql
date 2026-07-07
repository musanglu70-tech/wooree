-- ============================================================
-- 파트너(CSO 업체) 포털: 회원가입/승인 + 데이터 격리(RLS)
-- Supabase SQL Editor에서 순서대로 실행하세요.
--
-- ⚠️ 사전 설정: Supabase Dashboard > Authentication > Providers > Email
--    "Confirm email" 옵션을 OFF 로 두어야 합니다.
--    (파트너 로그인은 사업자번호 기반 합성 이메일을 쓰므로 메일 인증 불가)
-- ============================================================

-- ── 1. companies 테이블 확장 (회원가입 폼 필드 + 승인 상태 + auth 링크) ──
alter table public.companies
  add column if not exists auth_user_id       uuid unique references auth.users(id) on delete set null,
  add column if not exists status             text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists bank_name          text,
  add column if not exists account_number     text,
  add column if not exists contact_phone      text,   -- CSO담당자 연락처
  add column if not exists contact_email      text,   -- CSO담당자 이메일 (알림 수신)
  add column if not exists contact_email2     text,   -- 이메일2 (선택)
  add column if not exists representative_phone text, -- 대표자 연락처 (선택)
  add column if not exists postal_code        text,
  add column if not exists road_address       text,
  add column if not exists detail_address     text,
  add column if not exists approved_at        timestamptz,
  add column if not exists rejected_reason    text,
  add column if not exists created_at         timestamptz not null default now();

-- 기존에 직원이 등록해 둔 업체는 이미 승인된 것으로 간주 (default 'approved').
-- 파트너 자가가입 행만 코드에서 status='pending' 으로 insert 됩니다.

create index if not exists idx_companies_auth_user on public.companies (auth_user_id);
create index if not exists idx_companies_status on public.companies (status);
create unique index if not exists uq_companies_business_number
  on public.companies (business_number) where business_number is not null;

-- ── 2. prescriptions 에 CSO 파트너 링크 추가 (파트너별 정산 스코프) ──
alter table public.prescriptions
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_prescriptions_company on public.prescriptions (company_id);

-- prescription_items 수수료율(선택) — 정산 금액 계산용
alter table public.prescription_items
  add column if not exists commission_rate numeric;

-- ── 3. 역할 판별 헬퍼 (JWT user_metadata.role 기반) ──
-- 파트너는 signUp 시 user_metadata.role='partner' 로 표시됨.
-- 직원(staff)은 role 이 없거나 'partner' 가 아님 → 기존 전체 접근 유지.
create or replace function public.is_partner()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'partner';
$$;

-- 현재 로그인한 파트너의 (승인된) company_id
create or replace function public.current_partner_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.companies
  where auth_user_id = auth.uid()
    and status = 'approved'
  limit 1;
$$;

-- ── 4. RLS 재설정 ──
-- 핵심 원칙:
--   * 직원(not is_partner()) → 기존과 동일하게 전체 접근
--   * 파트너(is_partner())   → 자기 데이터만

-- companies -------------------------------------------------
drop policy if exists companies_auth on public.companies;

drop policy if exists companies_staff_all on public.companies;
create policy companies_staff_all on public.companies
  for all to authenticated
  using (not public.is_partner())
  with check (not public.is_partner());

-- 파트너: 본인 업체행 조회
drop policy if exists companies_partner_select on public.companies;
create policy companies_partner_select on public.companies
  for select to authenticated
  using (public.is_partner() and auth_user_id = auth.uid());

-- 파트너: 회원가입 시 본인 행(pending) 생성
drop policy if exists companies_partner_insert on public.companies;
create policy companies_partner_insert on public.companies
  for insert to authenticated
  with check (
    public.is_partner()
    and auth_user_id = auth.uid()
    and status = 'pending'
  );

-- prescriptions ---------------------------------------------
drop policy if exists prescriptions_auth on public.prescriptions;

drop policy if exists prescriptions_staff_all on public.prescriptions;
create policy prescriptions_staff_all on public.prescriptions
  for all to authenticated
  using (not public.is_partner())
  with check (not public.is_partner());

drop policy if exists prescriptions_partner_select on public.prescriptions;
create policy prescriptions_partner_select on public.prescriptions
  for select to authenticated
  using (public.is_partner() and company_id = public.current_partner_company_id());

-- prescription_items ----------------------------------------
drop policy if exists prescription_items_auth on public.prescription_items;

drop policy if exists prescription_items_staff_all on public.prescription_items;
create policy prescription_items_staff_all on public.prescription_items
  for all to authenticated
  using (not public.is_partner())
  with check (not public.is_partner());

drop policy if exists prescription_items_partner_select on public.prescription_items;
create policy prescription_items_partner_select on public.prescription_items
  for select to authenticated
  using (
    public.is_partner()
    and exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id
        and p.company_id = public.current_partner_company_id()
    )
  );

-- notices (공지사항: 파트너도 읽기 허용) ----------------------
drop policy if exists notices_auth on public.notices;

drop policy if exists notices_staff_all on public.notices;
create policy notices_staff_all on public.notices
  for all to authenticated
  using (not public.is_partner())
  with check (not public.is_partner());

drop policy if exists notices_partner_select on public.notices;
create policy notices_partner_select on public.notices
  for select to authenticated
  using (public.is_partner());

-- ============================================================
-- 참고: 승인 처리(pending→approved)는 직원 ERP의 "파트너 승인" 화면에서
-- companies.status 를 업데이트하는 방식으로 동작합니다 (companies_staff_all 정책).
-- ============================================================
