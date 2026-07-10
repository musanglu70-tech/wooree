-- ============================================================
-- 권한 상승(privilege escalation) 차단 — 가장 중요한 보안 패치
--   문제: profiles RLS가 본인 행 전체 수정을 허용 → 사업자가 브라우저에서
--         자기 role='admin'으로 바꿔 300곳 데이터 전체 열람 가능.
--   해결: role / tenant_id 는 서버(service_role)만 변경.
--         일반 사용자가 바꾸면 트리거가 원래 값으로 자동 원복.
-- (12 이후 실행)
-- ============================================================

-- 1. 역할 값 제약
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'user', 'viewer', 'staff'));

-- 2. 권한 컬럼 보호 트리거
create or replace function public.protect_profile_privilege()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 로그인한 실사용자(auth.uid() 있음)만 차단.
  -- 서버(service_role)·SQL편집기는 auth.uid()가 null 이라 통과.
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.role := 'user';          -- 자가 생성 시 admin 불가
      new.tenant_id := null;       -- 소속은 서버가 지정
    elsif tg_op = 'UPDATE' then
      new.role := old.role;        -- 역할 변경 무효화(원복)
      new.tenant_id := old.tenant_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privilege on public.profiles;
create trigger trg_protect_profile_privilege
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privilege();

-- ============================================================
-- 결과:
--  * 사업자가 브라우저 콘솔로 role='admin' 시도 → 자동 'user'로 원복(무효)
--  * 소속 테넌트(tenant_id)도 본인이 못 바꿈
--  * 변경은 오직 서버 API(service_role): /api/auth/register, /api/admin/set-user
--  * 마이페이지·테넌트전환(active_tenant_id 등)은 그대로 동작
-- ============================================================
