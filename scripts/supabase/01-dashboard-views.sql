-- 대시보드 통계 뷰 (Supabase SQL Editor에서 실행)

create or replace view public.v_dashboard_stats as
select
  (
    select count(*)::int
    from public.notices
    where coalesce(is_confirmed, false) = false
  ) as unconfirmed_notices,
  (
    select count(*)::int
    from public.notices
    where is_confirmed = true
  ) as confirmed_notices,
  (
    select count(distinct hospital_name)::int
    from public.prescriptions
    where coalesce(hospital_name, '') <> ''
  ) as registered_hospitals,
  (
    select count(*)::int from public.pharma_companies
  ) as registered_pharma,
  (
    select count(*)::int from public.prescriptions
  ) as total_edi_count,
  (
    select count(*)::int
    from public.prescriptions p
    where date_trunc('month', p.prescription_date)
      = date_trunc('month', current_date)
  ) as this_month_edi,
  (
    select coalesce(sum(pi.amount), 0)::numeric
    from public.prescription_items pi
    join public.prescriptions p on p.id = pi.prescription_id
    where date_trunc('month', p.prescription_date)
      = date_trunc('month', current_date)
  ) as this_month_edi_amount,
  (
    select count(*)::int
    from public.prescriptions p
    where p.settlement_date is null or p.status = 'saved'
  ) as unsettled_count;

create or replace view public.v_monthly_prescriptions as
select
  p.id,
  p.id as prescription_id,
  to_char(p.prescription_date, 'YYYY-MM') as prescription_month,
  p.prescription_date,
  pc.name as pharma_company_name,
  pc.name as pharma_name,
  '우리메디텍' as company_name,
  p.hospital_name,
  p.status,
  p.created_at,
  coalesce(
    (
      select sum(pi.amount)
      from public.prescription_items pi
      where pi.prescription_id = p.id
    ),
    0
  )::numeric as total_amount,
  coalesce(
    (
      select sum(pi.amount)
      from public.prescription_items pi
      where pi.prescription_id = p.id
    ),
    0
  )::numeric as amount
from public.prescriptions p
left join public.pharma_companies pc on pc.id = p.pharma_company_id;

create or replace view public.v_dashboard_pharma_stats as
with rx as (
  select
    p.pharma_company_id,
    p.id,
    p.prescription_date,
    p.settlement_date,
    p.status,
    coalesce(
      (
        select sum(pi.amount)
        from public.prescription_items pi
        where pi.prescription_id = p.id
      ),
      0
    )::numeric as amount
  from public.prescriptions p
)
select
  pc.id as pharma_company_id,
  pc.name as pharma_name,
  count(r.id) filter (
    where date_trunc('month', r.prescription_date)
      = date_trunc('month', current_date)
  )::int as monthly_count,
  coalesce(
    sum(r.amount) filter (
      where date_trunc('month', r.prescription_date)
        = date_trunc('month', current_date)
    ),
    0
  )::numeric as monthly_amount,
  count(r.id) filter (
    where r.settlement_date is null or r.status = 'saved'
  )::int as unsettled_count
from public.pharma_companies pc
left join rx r on r.pharma_company_id = pc.id
group by pc.id, pc.name;

grant select on public.v_dashboard_stats to authenticated;
grant select on public.v_monthly_prescriptions to authenticated;
grant select on public.v_dashboard_pharma_stats to authenticated;
