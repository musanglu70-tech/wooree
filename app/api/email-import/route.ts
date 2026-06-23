import { NextResponse } from "next/server";
import {
  getAccessToken,
  listUnreadMessages,
  getMessage,
  getAttachment,
  getAttachments,
  getSender,
  getSubject,
  markAsRead,
  type EmailAttachment,
} from "@/lib/gmail/client";
import {
  extractPrescriptionWithClaude,
  mapClaudePayloadToResult,
} from "@/lib/ocr/claude-prescription";
import { parsePrescriptionText } from "@/lib/ocr/parse-prescription";
import { parsePrescriptionExcel } from "@/lib/excel/prescription-import";

export const maxDuration = 60;

const SUPPORTED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
  "application/pdf": "application/pdf",
};

const EXCEL_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

interface ImportResult {
  messageId: string;
  sender: string;
  subject: string;
  attachment: string;
  status: "success" | "error" | "skipped";
  data?: Record<string, unknown>;
  error?: string;
}

export async function GET() {
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    return NextResponse.json(
      { error: "Gmail 환경변수 미설정 (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)" },
      { status: 500 }
    );
  }

  try {
    const accessToken = await getAccessToken();
    const messages = await listUnreadMessages(accessToken, 20);

    if (messages.length === 0) {
      return NextResponse.json({ message: "읽지 않은 이메일이 없습니다.", results: [] });
    }

    const results: ImportResult[] = [];

    for (const { id: messageId } of messages) {
      const message = await getMessage(accessToken, messageId);
      const sender = getSender(message);
      const subject = getSubject(message);
      const attachments: EmailAttachment[] = getAttachments(message);

      if (attachments.length === 0) {
        await markAsRead(accessToken, messageId);
        continue;
      }

      for (const att of attachments) {
        const result: ImportResult = {
          messageId,
          sender,
          subject,
          attachment: att.filename,
          status: "skipped",
        };

        try {
          const base64 = await getAttachment(accessToken, messageId, att.attachmentId);

          // Excel/CSV 처리
          if (EXCEL_MIME_TYPES.includes(att.mimeType) || att.filename.match(/\.(xlsx|xls|csv)$/i)) {
            const nodeBuffer = Buffer.from(base64, "base64");
            const arrayBuffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
            const rows = parsePrescriptionExcel(arrayBuffer as ArrayBuffer);
            result.status = "success";
            result.data = { type: "excel", rows: rows.length, items: rows };
          }
          // 이미지/PDF → AI OCR 처리
          else if (SUPPORTED_MIME_TYPES[att.mimeType] || att.filename.match(/\.(jpg|jpeg|png|pdf)$/i)) {
            const mimeType = (SUPPORTED_MIME_TYPES[att.mimeType] ?? "image/jpeg") as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp"
              | "application/pdf";

            const { payload, rawText } = await extractPrescriptionWithClaude(base64, mimeType);

            if (payload && payload.items.length > 0) {
              result.status = "success";
              result.data = { type: "ocr", ...mapClaudePayloadToResult(payload, rawText) };
            } else if (rawText.trim()) {
              const fallback = parsePrescriptionText(rawText);
              result.status = "success";
              result.data = { type: "ocr_fallback", ...fallback };
            } else {
              result.status = "error";
              result.error = "데이터 추출 실패";
            }
          } else {
            result.status = "skipped";
            result.error = `지원하지 않는 파일 형식: ${att.mimeType}`;
          }
        } catch (err) {
          result.status = "error";
          result.error = err instanceof Error ? err.message : String(err);
        }

        results.push(result);
      }

      // 처리 완료 → 읽음 처리
      await markAsRead(accessToken, messageId);
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      message: `총 ${messages.length}개 이메일 처리 완료 (성공: ${successCount}, 오류: ${errorCount})`,
      results,
    });
  } catch (err) {
    console.error("[email-import] 오류:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "이메일 가져오기 실패" },
      { status: 500 }
    );
  }
}
