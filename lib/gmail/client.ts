/**
 * Gmail REST API 클라이언트
 * googleapis 패키지 없이 fetch로 직접 구현
 */

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

/** Access Token 갱신 */
export async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Access token 갱신 실패: ${JSON.stringify(data)}`);
  }
  return data.access_token as string;
}

/** 읽지 않은 이메일 목록 조회 */
export async function listUnreadMessages(
  accessToken: string,
  maxResults = 10
): Promise<{ id: string; threadId: string }[]> {
  const params = new URLSearchParams({
    q: "is:unread has:attachment",
    maxResults: String(maxResults),
  });

  const res = await fetch(`${GMAIL_API}/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  return data.messages ?? [];
}

/** 이메일 상세 정보 조회 */
export async function getMessage(accessToken: string, messageId: string) {
  const res = await fetch(`${GMAIL_API}/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

/** 첨부파일 다운로드 (base64 반환) */
export async function getAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<string> {
  const res = await fetch(
    `${GMAIL_API}/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  // Gmail은 URL-safe base64로 반환 → 표준 base64로 변환
  return (data.data as string).replace(/-/g, "+").replace(/_/g, "/");
}

/** 이메일에서 발신자 추출 */
export function getSender(message: { payload?: { headers?: { name: string; value: string }[] } }): string {
  const headers = message.payload?.headers ?? [];
  return headers.find((h) => h.name === "From")?.value ?? "알 수 없음";
}

/** 이메일에서 제목 추출 */
export function getSubject(message: { payload?: { headers?: { name: string; value: string }[] } }): string {
  const headers = message.payload?.headers ?? [];
  return headers.find((h) => h.name === "Subject")?.value ?? "제목 없음";
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
}

/** 이메일에서 첨부파일 목록 추출 */
export function getAttachments(message: {
  payload?: {
    parts?: {
      filename?: string;
      mimeType?: string;
      body?: { attachmentId?: string; size?: number };
    }[];
  };
}): EmailAttachment[] {
  const parts = message.payload?.parts ?? [];
  return parts
    .filter((p) => p.filename && p.body?.attachmentId)
    .map((p) => ({
      filename: p.filename!,
      mimeType: p.mimeType ?? "",
      attachmentId: p.body!.attachmentId!,
      size: p.body?.size ?? 0,
    }));
}

/** 이메일 읽음 처리 */
export async function markAsRead(accessToken: string, messageId: string) {
  await fetch(`${GMAIL_API}/users/me/messages/${messageId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
  });
}
