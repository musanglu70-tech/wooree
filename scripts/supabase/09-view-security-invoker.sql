-- ============================================================
-- 대시보드/목록 뷰의 RLS 우회 해결
-- 기본 뷰는 SECURITY DEFINER(소유자 권한)로 실행돼 RLS를 무시함 →
-- security_invoker = on 으로 바꾸면 "조회한 사용자"의 RLS가 적용됨.
-- 결과: 저장목록·대시보드도 관리자=전체 / 일반=본인 입력분으로 필터됨.
-- (Postgres 15+ · Supabase 지원. 07-user-data-scope.sql 이후 실행)
-- ============================================================

alter view public.v_monthly_prescriptions   set (security_invoker = on);
alter view public.v_dashboard_stats          set (security_invoker = on);
alter view public.v_dashboard_pharma_stats   set (security_invoker = on);

-- 참고: 파트너(is_partner)는 이 뷰들을 조회하지 않지만, 혹시 접근하더라도
--       security_invoker 하에서는 prescriptions RLS(파트너=본인 company만)가 적용됩니다.
-- ============================================================
