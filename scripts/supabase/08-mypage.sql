-- ============================================================
-- 마이페이지: 회사정보 + 첨부서류 + 서명
-- profiles 테이블에 컬럼 추가. (RLS는 04번의 profiles_auth = 본인만)
-- 첨부파일은 기존 'prescription-attachments' 버킷 재사용 (path: mypage/{uid}/...)
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

alter table public.profiles
  add column if not exists company_name     text,
  add column if not exists ceo_name         text,
  add column if not exists business_number  text,
  add column if not exists office_address   text,
  add column if not exists cso_number       text,   -- CSO 신고번호
  add column if not exists signature_url     text,   -- 대표 서명/도장 (storage path)
  add column if not exists doc_cso_url       text,   -- CSO 신고증
  add column if not exists doc_edu_url       text,   -- 교육이수확인증
  add column if not exists doc_biz_url       text;   -- 사업자등록증

-- profiles 본인 행이 없을 수 있으므로, 마이페이지 저장 시 upsert 로 처리(앱에서).
-- (04-rls-security.sql 의 profiles_auth 정책이 본인 행만 select/update 허용)
