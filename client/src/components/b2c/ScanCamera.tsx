import { useCallback, useEffect, useRef, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Viseur du Scanner (refonte Organic) — maquette « GlowScan App » › Scanner.
// Caméra frontale dans un cadre arrondi, ovale de cadrage, pastille de lumière
// mesurée en direct (luminosité moyenne réelle), compteur « Photo n / N ».
// Si la caméra est refusée ou absente : import depuis la galerie.
// ════════════════════════════════════════════════════════════════════════

export type LightLevel = "ok" | "dark" | "bright" | null;

/** Luminosité moyenne (0-255) d'une source image/vidéo, sur une vignette 32×32. */
function meanLuma(src: CanvasImageSource, w: number, h: number): number | null {
  if (!w || !h) return null;
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, 32, 32);
  const d = ctx.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return sum / (d.length / 4);
}
export const lightOf = (l: number | null): LightLevel => (l === null ? null : l < 60 ? "dark" : l > 225 ? "bright" : "ok");

const LIGHT_LABEL: Record<Exclude<LightLevel, null>, string> = { ok: "Lumière OK", dark: "Trop sombre", bright: "Trop de lumière" };

/** Réduit l'image (1000 px max) en JPEG, comme le reste du pipeline d'analyse. */
function toJpeg(src: CanvasImageSource, w: number, h: number): string {
  const max = 1000;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

async function fileToJpeg(file: File): Promise<{ dataUrl: string; light: LightLevel }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    return { dataUrl: toJpeg(img, img.naturalWidth, img.naturalHeight), light: lightOf(meanLuma(img, img.naturalWidth, img.naturalHeight)) };
  } finally { URL.revokeObjectURL(url); }
}

export function ScanCamera({ shotLabel, hint, oval = true, onCapture }: {
  shotLabel: string;
  hint: string;
  oval?: boolean;
  onCapture: (dataUrl: string, light: LightLevel) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const [light, setLight] = useState<LightLevel>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let alive = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setCamOk(true);
      } catch { if (alive) setCamOk(false); }
    })();
    return () => { alive = false; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // Contrôle de la lumière en direct (toutes les 700 ms).
  useEffect(() => {
    if (!camOk) return;
    const iv = setInterval(() => {
      const v = videoRef.current;
      if (v && v.readyState >= 2) setLight(lightOf(meanLuma(v, v.videoWidth, v.videoHeight)));
    }, 700);
    return () => clearInterval(iv);
  }, [camOk]);

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return;
    onCapture(toJpeg(v, v.videoWidth, v.videoHeight), lightOf(meanLuma(v, v.videoWidth, v.videoHeight)));
  }, [onCapture]);

  const onFile = async (f?: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    try { const { dataUrl, light: l } = await fileToJpeg(f); onCapture(dataUrl, l); } catch { /* fichier illisible : on ignore */ }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex h-[300px] flex-none items-center justify-center overflow-hidden rounded-card bg-[#4a3322]">
        {camOk !== false && (
          <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
        )}
        {oval && (
          <span className="relative h-[240px] w-[190px] rounded-[50%] border-[3px] border-dashed" style={{ borderColor: "color-mix(in srgb, var(--color-neutral-100) 80%, transparent)" }} />
        )}
        <span className="absolute inset-x-3.5 top-3.5 flex justify-between gap-2">
          {light ? (
            <span className={light === "ok"
              ? "rounded-pill bg-organic-accent-2-600 px-3 py-1.5 text-[12px] font-bold text-organic-bg"
              : "rounded-pill bg-organic-accent-700 px-3 py-1.5 text-[12px] font-bold text-organic-neutral-100"}>
              {LIGHT_LABEL[light]}
            </span>
          ) : <span />}
          <span className="rounded-pill bg-organic-neutral-900 px-3 py-1.5 text-[12px] font-bold text-organic-neutral-100">{shotLabel}</span>
        </span>
        <span className="absolute inset-x-0 bottom-3.5 px-4 text-center text-[13px] font-semibold text-organic-neutral-100">
          {camOk === false ? "Caméra indisponible : importez une photo" : hint}
        </span>
      </div>

      {camOk !== false && (
        <button
          type="button"
          onClick={capture}
          disabled={!camOk}
          className="inline-flex items-center justify-center rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600 disabled:opacity-45"
        >
          Prendre la photo
        </button>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={camOk === false
          ? "inline-flex items-center justify-center rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600"
          : "inline-flex items-center justify-center rounded-pill border-0 bg-transparent px-2 py-1 text-[14px] font-bold text-organic-accent hover:bg-organic-accent/10"}
      >
        Importer depuis la galerie
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
    </div>
  );
}
