import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isValidBusinessNumber,
  normalizeBusinessNumber,
  partnerEmail,
} from "@/lib/partner/auth";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

interface Body {
  businessNumber?: string;
  companyName?: string;
  representative?: string;
  postalCode?: string;
  roadAddress?: string;
  detailAddress?: string;
  contactPhone?: string;
  representativePhone?: string;
  contactEmail?: string;
  contactEmail2?: string;
  bankName?: string;
  accountNumber?: string;
  password?: string;
}

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** POST /api/auth/register — 사업자 회원가입 (서버가 role/status 강제) */
export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "서버 설정 오류(SERVICE_ROLE)" },
        { status: 500 },
      );
    }

    const b = (await request.json()) as Body;

    if (!isValidBusinessNumber(s(b.businessNumber)))
      return NextResponse.json({ error: "사업자번호 10자리를 확인해주세요." }, { status: 400 });
    if (!s(b.companyName)) return NextResponse.json({ error: "업체명을 입력해주세요." }, { status: 400 });
    if (!EMAIL_REGEX.test(s(b.contactEmail)))
      return NextResponse.json({ error: "올바른 이메일을 입력해주세요." }, { status: 400 });
    if (!PW_REGEX.test(s(b.password)))
      return NextResponse.json({ error: "비밀번호는 영문+숫자 6자 이상이어야 합니다." }, { status: 400 });

    const bizDigits = normalizeBusinessNumber(s(b.businessNumber));
    const admin = createAdminClient();

    // 1) 인증 계정 생성 (이메일 확인 없이 활성) — role은 metadata에 넣지 않음(표시용 아님)
    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email: partnerEmail(bizDigits),
      password: s(b.password),
      email_confirm: true,
      user_metadata: { business_number: bizDigits, company_name: s(b.companyName) },
    });
    if (userErr || !created.user) {
      const msg = /already|exist|registered/i.test(userErr?.message ?? "")
        ? "이미 가입된 사업자번호입니다."
        : "가입 실패: " + (userErr?.message ?? "");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const userId = created.user.id;

    const address = [s(b.roadAddress), s(b.detailAddress)].filter(Boolean).join(" ");

    // 2) 회사(테넌트) 생성 — 승인 대기
    const { data: company, error: coErr } = await admin
      .from("companies")
      .insert({
        auth_user_id: userId,
        status: "pending",
        name: s(b.companyName),
        business_number: bizDigits,
        representative: s(b.representative) || null,
        address,
        postal_code: s(b.postalCode) || null,
        road_address: s(b.roadAddress) || null,
        detail_address: s(b.detailAddress) || null,
        phone: s(b.contactPhone) || null,
        contact_phone: s(b.contactPhone) || null,
        representative_phone: s(b.representativePhone) || null,
        email: s(b.contactEmail) || null,
        contact_email: s(b.contactEmail) || null,
        contact_email2: s(b.contactEmail2) || null,
        bank_name: s(b.bankName) || null,
        account_number: s(b.accountNumber) || null,
      })
      .select("id")
      .single();

    if (coErr || !company) {
      // 롤백: 방금 만든 계정 제거
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json({ error: "업체 저장 실패: " + (coErr?.message ?? "") }, { status: 500 });
    }

    // 3) 프로필 — 서버가 role='user', tenant_id 강제 (클라이언트 값 무시)
    const { error: pErr } = await admin.from("profiles").upsert({
      id: userId,
      username: partnerEmail(bizDigits),
      role: "user",
      tenant_id: (company as { id: string }).id,
    });
    if (pErr) {
      await admin.from("companies").delete().eq("id", (company as { id: string }).id).catch(() => {});
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return NextResponse.json({ error: "프로필 저장 실패: " + pErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "가입 처리 오류" },
      { status: 500 },
    );
  }
}
