// Downscale + JPEG-compress an image so upload stays small/fast (storage).
export async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality),
  );
}

// Preprocess for OCR: keep good resolution (only cap very large images), convert
// to grayscale and boost contrast. Greyscale + contrast helps Tesseract read
// thin, low-contrast receipt text far better than a colour JPEG.
async function preprocessForOcr(file: Blob, maxDim = 2200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const contrast = 1.25; // mild contrast stretch around mid-grey
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.722 * d[i + 2];
    let v = (lum - 128) * contrast + 128;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/png"),
  );
}

// Lazy-loaded OCR — tesseract.js and its assets are only fetched on first call.
// Pass the ORIGINAL file for best quality; preprocessing happens here.
export async function recognizeImage(
  file: Blob,
  onProgress?: (p: number) => void,
): Promise<string> {
  const prepared = await preprocessForOcr(file);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("vie+eng", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/tesseract-core-simd.wasm.js",
    langPath: "/tesseract/lang",
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(prepared);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
