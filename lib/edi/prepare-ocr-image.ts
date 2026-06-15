/** OCR 전송용 이미지 압축 (Vercel 4.5MB 본문 제한 대응) */
export async function prepareImageForOcr(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  if (file.type === "application/pdf") {
    const base64 = await readFileAsDataUrlBase64(file);
    return { base64, mimeType: "application/pdf" };
  }

  if (!file.type.startsWith("image/")) {
    const base64 = await readFileAsDataUrlBase64(file);
    return { base64, mimeType: file.type || "image/jpeg" };
  }

  return compressImageFile(file);
}

function readFileAsDataUrlBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("파일을 읽을 수 없습니다."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("파일 인코딩에 실패했습니다."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxDimension = 2000;
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("이미지 처리에 실패했습니다.");
    }

    context.drawImage(image, 0, 0, width, height);

    let quality = 0.85;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);

    while (dataUrl.length > 3_500_000 && quality > 0.4) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      throw new Error("이미지 인코딩에 실패했습니다.");
    }

    return { base64, mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    image.src = src;
  });
}
