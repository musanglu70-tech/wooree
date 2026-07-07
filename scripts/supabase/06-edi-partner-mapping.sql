-- ============================================================
-- EDI ↔ CSO 파트너(거래처) 자동 매핑
-- 원리: 병의원(hospital)마다 담당 CSO 업체를 지정 → 처방이 들어오면
--       병의원명으로 담당 업체(company_id)를 자동 배정 → 파트너 포털에 노출
-- Supabase SQL Editor에서 실행하세요. (05-partner-portal.sql 실행 이후)
-- ============================================================

-- 1. 병의원에 담당 CSO 업체 컬럼 추가
alter table public.hospitals
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists idx_hospitals_company on public.hospitals (company_id);

-- 2. 처방 insert/update 시 병의원명으로 담당 업체 자동 배정 트리거
create or replace function public.set_prescription_company()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 이미 지정돼 있으면 유지, 없을 때만 병의원 매핑으로 채움
  if new.company_id is null and coalesce(new.hospital_name, '') <> '' then
    select h.company_id
      into new.company_id
    from public.hospitals h
    where h.name = new.hospital_name
      and h.company_id is not null
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_prescription_company on public.prescriptions;
create trigger trg_set_prescription_company
  before insert or update of hospital_name, company_id
  on public.prescriptions
  for each row
  execute function public.set_prescription_company();

-- 3. 기존 처방 데이터 백필 (병의원 매핑이 설정된 것만)
update public.prescriptions p
set company_id = h.company_id
from public.hospitals h
where p.hospital_name = h.name
  and h.company_id is not null
  and p.company_id is null;

-- ============================================================
-- 사용법:
--   직원 ERP > EDI > 병의원 관리 에서 각 병의원의 "담당 CSO 업체"를 지정하면,
--   이후 들어오는 모든 처방(신규 입력·Gmail 자동수집)이 자동으로 해당 업체에 배정됩니다.
--   기존 처방은 위 3번 백필로 일괄 반영됩니다.
-- ============================================================
