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

export interface ImportSummary {
  saved: number;
  skipped: number;
  errors: number;
  log: string[];
}

/**
 * Gmail 미읽음 첨부(이미지/PDF) → OCR → prescriptions 자동 저장 → 읽음 처리.
 * 크론·수동 실행 공용. service_role(admin) 필요.
 */
export async function runGmailAutoImport(): Promise<ImportSummary> {
  const admin = createAdminClient();
  let saved = 0;
  let skipped = 0;
  let errors = 0;
  const log: string[] = [];

  const accessToken = await getAccessToken();
  const messages = await listUnreadMessages(accessToken, 20);

  for (const { id: messageId } of messages) {
    const message = await getMessage(accessToken, messageId);
    const subject = getSubject(message);
    const attachments: EmailAttachment[] = getAttachments(message);

    for (const att of attachments) {
      const mediaType = resolveMediaType(att);
      if (!mediaType) continue; // 엑셀 등은 수동 처리

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

    if (attachments.length > 0) {
      await markAsRead(accessToken, messageId);
    }
  }

  return { saved, skipped, errors, log };
}
