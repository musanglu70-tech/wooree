import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parsePrescriptionText } from "../lib/ocr/parse-prescription.ts";

const root = process.cwd();

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return {};
  const text = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

const imagePath =
  process.argv[2] ??
  path.join(
    root,
    "../.cursor/projects/c-Users-1-wuri-meditech-erp/assets/c__Users_1_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_KakaoTalk_20260612_152716194-d856241c-904c-4286-8488-2e10216b53b4.png",
  );

async function runParserOnly() {
  const sample = `제약사별통계-제약사별
조회일 : 2026-05-01 ~ 2026-05-31
제약사 : 안국
제약회사 약품건수 처방횟수 총사용량 총금액
안국약품 2 221 4265 54,900
청구코드 명칭 단위 처방횟수 단가 총사용량 총금액
650200400 레보텐션정2.5mg 1정 3 366 150 54,900
A08503781 애니탈삼중정(내복) 1정 218 0 4115 0
203-13-21527 365우리의원 김동:`;

  console.log("=== 파서 단위 테스트 (샘플 텍스트) ===");
  console.log(JSON.stringify(parsePrescriptionText(sample), null, 2));
}

async function runVisionOcr() {
  const { GOOGLE_VISION_API_KEY: apiKey } = loadEnv();
  if (!apiKey) {
    console.log("\nGOOGLE_VISION_API_KEY 없음 → Vision OCR 스킵");
    return;
  }

  if (!fs.existsSync(imagePath)) {
    console.log(`\n이미지 없음: ${imagePath}`);
    return;
  }

  const imageBase64 = fs.readFileSync(imagePath).toString("base64");
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  console.log(`\n=== Google Vision OCR (${path.basename(imagePath)}) ===`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Vision API 오류:", data);
    return;
  }

  const rawText =
    data.responses?.[0]?.fullTextAnnotation?.text ??
    data.responses?.[0]?.textAnnotations?.[0]?.description ??
    "";

  console.log("\n--- 추출 텍스트 (앞 800자) ---");
  console.log(rawText.slice(0, 800));
  console.log("\n--- 파싱 결과 ---");
  console.log(JSON.stringify(parsePrescriptionText(rawText), null, 2));
}

await runParserOnly();
await runVisionOcr();
