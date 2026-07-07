"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import {
  formatBusinessNumber,
  isValidBusinessNumber,
  normalizeBusinessNumber,
  partnerEmail,
  PARTNER_ROLE,
} from "@/lib/partner/auth";

const BANKS = [
  "KB국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "NH농협은행",
  "IBK기업은행",
  "카카오뱅크",
  "토스뱅크",
  "SC제일은행",
  "부산은행",
  "대구은행",
  "경남은행",
  "광주은행",
  "전북은행",
  "제주은행",
  "새마을금고",
  "신협",
  "우체국",
  "산업은행",
  "수협은행",
  "씨티은행",
];

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/20";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

interface FormState {
  businessNumber: string;
  companyName: string;
  representative: string;
  postalCode: string;
  roadAddress: string;
  detailAddress: string;
  contactPhone: string;
  representativePhone: string;
  contactEmail: string;
  contactEmail2: string;
  bankName: string;
  accountNumber: string;
  password: string;
  passwordConfirm: string;
}

const EMPTY: FormState = {
  businessNumber: "",
  companyName: "",
  representative: "",
  postalCode: "",
  roadAddress: "",
  detailAddress: "",
  contactPhone: "",
  representativePhone: "",
  contactEmail: "",
  contactEmail2: "",
  bankName: "",
  accountNumber: "",
  password: "",
  passwordConfirm: "",
};

export default function PortalRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!isValidBusinessNumber(form.businessNumber))
      return "사업자번호 10자리를 정확히 입력해주세요.";
    if (!form.companyName.trim()) return "업체명을 입력해주세요.";
    if (!form.representative.trim()) return "대표자명을 입력해주세요.";
    if (!form.roadAddress.trim()) return "주소를 입력해주세요.";
    if (!form.contactPhone.trim()) return "CSO담당자 연락처를 입력해주세요.";
    if (!EMAIL_REGEX.test(form.contactEmail.trim()))
      return "올바른 CSO담당자 이메일을 입력해주세요.";
    if (!form.bankName) return "은행을 선택해주세요.";
    if (!form.accountNumber.trim()) return "계좌번호를 입력해주세요.";
    if (!PW_REGEX.test(form.password))
      return "비밀번호는 영문+숫자 조합 6자 이상이어야 합니다.";
    if (form.password !== form.passwordConfirm)
      return "비밀번호가 일치하지 않습니다.";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const bizDigits = normalizeBusinessNumber(form.businessNumber);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
        {
          email: partnerEmail(form.businessNumber),
          password: form.password,
          options: {
            data: {
              role: PARTNER_ROLE,
              business_number: bizDigits,
              company_name: form.companyName.trim(),
            },
          },
        },
      );

      if (signUpError) {
        const msg = signUpError.message.includes("already")
          ? "이미 가입된 사업자번호입니다."
          : "가입 실패: " + signUpError.message;
        toast.error(msg);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        toast.error(
          "가입 처리 중 오류가 발생했습니다. 관리자에게 문의해주세요.",
        );
        return;
      }

      const address = [form.roadAddress.trim(), form.detailAddress.trim()]
        .filter(Boolean)
        .join(" ");

      const { error: insertError } = await supabase.from("companies").insert({
        auth_user_id: userId,
        status: "pending",
        name: form.companyName.trim(),
        business_number: bizDigits,
        representative: form.representative.trim(),
        address,
        postal_code: form.postalCode.trim() || null,
        road_address: form.roadAddress.trim() || null,
        detail_address: form.detailAddress.trim() || null,
        phone: form.contactPhone.trim(),
        contact_phone: form.contactPhone.trim(),
        representative_phone: form.representativePhone.trim() || null,
        email: form.contactEmail.trim(),
        contact_email: form.contactEmail.trim(),
        contact_email2: form.contactEmail2.trim() || null,
        bank_name: form.bankName,
        account_number: form.accountNumber.trim(),
      });

      if (insertError) {
        toast.error("업체 정보 저장 실패: " + insertError.message);
        return;
      }

      // 관리자에게 승인 요청 메일 발송 (실패해도 가입은 완료 처리)
      const inserted = await supabase
        .from("companies")
        .select("id")
        .eq("auth_user_id", userId)
        .maybeSingle();
      const companyId = (inserted.data as { id?: string } | null)?.id;
      if (companyId) {
        await fetch("/api/partners/register-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
        }).catch(() => {});
      }

      toast.success("회원가입이 접수되었습니다. 관리자 승인 후 이용 가능합니다.");
      router.push("/portal/home");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            회원가입
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            CSO 정산서 포털 회원가입
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>
              사업자번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000-00-00000"
              value={form.businessNumber}
              onChange={(e) =>
                set("businessNumber", formatBusinessNumber(e.target.value))
              }
              className={inputClass}
            />
            <p className="mt-1.5 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
              ℹ️ 사업자등록번호 10자리를 입력해주세요.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                업체명 (사업자등록과 일치){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="사업자등록증 상의 상호"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                대표자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="대표자명을 입력하세요"
                value={form.representative}
                onChange={(e) => set("representative", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              주소 <span className="text-red-500">*</span>
            </label>
            <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr]">
              <input
                type="text"
                placeholder="우편번호"
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="도로명 주소"
                value={form.roadAddress}
                onChange={(e) => set("roadAddress", e.target.value)}
                className={inputClass}
              />
            </div>
            <input
              type="text"
              placeholder="상세 주소를 입력하세요"
              value={form.detailAddress}
              onChange={(e) => set("detailAddress", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                CSO담당자 연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="010-0000-0000"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>대표자 연락처</label>
              <input
                type="tel"
                placeholder="선택사항"
                value={form.representativePhone}
                onChange={(e) => set("representativePhone", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                CSO담당자 이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="example@company.com"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">
                알림을 받을 이메일 주소를 입력하세요.
              </p>
            </div>
            <div>
              <label className={labelClass}>이메일2</label>
              <input
                type="email"
                placeholder="선택사항"
                value={form.contactEmail2}
                onChange={(e) => set("contactEmail2", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                은행명 (정산 입금) <span className="text-red-500">*</span>
              </label>
              <select
                value={form.bankName}
                onChange={(e) => set("bankName", e.target.value)}
                className={inputClass}
              >
                <option value="">은행 선택</option>
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                계좌번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="숫자 또는 - 포함"
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="영문+숫자 조합 6자 이상"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호 확인"
                value={form.passwordConfirm}
                onChange={(e) => set("passwordConfirm", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-11 w-full rounded-lg bg-[#0f766e] text-sm font-semibold text-white transition-colors hover:bg-[#0e6b63] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "처리 중..." : "회원가입 신청"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link
            href="/portal/login"
            className="font-semibold text-[#0f766e] hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
