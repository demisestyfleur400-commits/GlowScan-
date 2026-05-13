export async function resizeBase64Image(
  base64: string,
  maxDim: number = 1024,
  quality: number = 0.85,
): Promise<string> {
  if (!base64.startsWith("data:image")) return base64;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const { width, height } = img;
        const longest = Math.max(width, height);

        if (longest <= maxDim) {
          resolve(base64);
          return;
        }

        const ratio = maxDim / longest;
        const targetW = Math.round(width * ratio);
        const targetH = Math.round(height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64);
          return;
        }
        // Fond blanc avant draw : évite les artefacts noirs si l'image source
        // est un PNG/WebP avec canal alpha transparent (JPEG ne supporte pas l'alpha).
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out);
      } catch {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
  baseDelayMs?: number;
  retryOn5xx?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  url: string,
  opts: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 2,
    baseDelayMs = 800,
    retryOn5xx = true,
    ...fetchOpts
  } = opts;

  let attempt = 0;
  let lastErr: any = null;

  // Statuts transitoires : 5xx serveur, 408 timeout, 429 rate-limit (utiles
  // sur 3G/4G instables où l'opérateur peut throttler temporairement).
  const isRetriableStatus = (s: number) =>
    (retryOn5xx && s >= 500 && s <= 599) || s === 408 || s === 429;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, fetchOpts);
      if (isRetriableStatus(res.status) && attempt < maxRetries) {
        await sleep(baseDelayMs * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries) throw err;
      await sleep(baseDelayMs * Math.pow(2, attempt));
      attempt++;
    }
  }
  throw lastErr ?? new Error("fetchWithRetry: unknown error");
}
