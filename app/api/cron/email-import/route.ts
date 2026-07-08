import { NextResponse } from "next/server";
import {
  getAccessToken,
  listUnreadMessages,
  getMessage,
  getAttachment,
  getAttachments,
  getSubject,
  markAsRead,
  type EmailAttachment,
} from "@/lib/gmail/client";
import {
  extractPrescriptionWithClaude,
  mapClaudePayloadToResult,
} from "@/lib/ocr/claude-prescription";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoSavePrescription } from "@/lib/gmail/auto-save";
import type { OcrMediaType } from "@/lib/ocr/image-payload";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_MIME: Record<string, OcrMediaType> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
  "application/pdf": "application/pdf",
};

function resolveMediaType(att: EmailAttachment): OcrMediaType | null {
  if (IMAGE_MIME[att.mimeType]) return IMAGE_MIME[att.mimeType];
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(att.filename)) return "image/jpeg";
  if (/\.pdf$/i.test(att.filename)) return "application/pdf";
  return null;
}

/**
 * GET /api/cron/email-import
 * Gmail 미읽음 첨부(이미지/PDF)를 OCR → prescriptions 자동 저장 → 읽음 처리.
 * Vercel Cron 전용 (Authorization: Bearer CRON_SECRET).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (
    !process.env.GMAIL_CLIENT_ID ||
    !process.env.GMAIL_CLIENT_SECRET ||
    !process.env.GMAIL_REFRESH_TOKEN
  ) {
    return NextResponse.json({ error: "Gmail 환경변수 미설정" }, { status: 500 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY 미설정 (자동저장 필수)" },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  const log: string[] = [];

  try {
    const accessToken = await getAccessToken();
    const messages = await listUnreadMessages(accessToken, 20);

    for (const { id: messageId } of messages) {
      const message = await getMessage(accessToken, messageId);
      const subject = getSubject(message);
      const attachments: EmailAttachment[] = getAttachments(message);

      let handled = false;
      for (const att of attachments) {
        const mediaType = resolveMediaType(att);
        if (!mediaType) continue; // 엑셀 등은 자동저장 대상 아님(수동)

        try {
          const base64 = await getAttachment(
            accessToken,
            messageId,
            att.attachmentId,
          );
          const { payload, rawText } = await extractPrescriptionWithClaude(
            base64,
            mediaType,
          );
          if (!payload || payload.items.length === 0) {
            skipped += 1;
            log.push(`skip(${subject}): 품목 추출 실패`);
            continue;
          }
          const result = mapClaudePayloadToResult(payload, rawText);
          const save = await autoSavePrescription(admin, {
            pharmaName: result.pharmaCompanyName,
            hospitalName: result.hospitalName,
            prescriptionDate: result.prescriptionDate,
            items: result.items.map((it) => ({
              code: it.code,
              name: it.name,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              amount: it.amount || it.totalAmount,
            })),
          });
          if (save.saved) {
            saved += 1;
            handled = true;
            log.push(`saved: ${result.hospitalName} (${result.items.length}품목)`);
          } else {
            skipped += 1;
            log.push(`skip(${result.hospitalName || subject}): ${save.reason}`);
          }
        } catch (e) {
          errors += 1;
          log.push(
            `error(${subject}): ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      // 첨부 하나라도 저장했거나 처리 시도했으면 읽음 처리
      if (handled || attachments.length > 0) {
        await markAsRead(accessToken, messageId);
      }
    }

    return NextResponse.json({
      message: `자동수집 완료 — 저장 ${saved} · 건너뜀 ${skipped} · 오류 ${errors}`,
      saved,
      skipped,
      errors,
      log,
    });
  } catch (error) {
    console.error("[cron/email-import] error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "자동수집 실패",
        saved,
        skipped,
        errors,
        log,
      },
      { status: 500 },
    );
  }
}
