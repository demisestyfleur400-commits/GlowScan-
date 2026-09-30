import { useEffect, useRef, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Flou manuel d'une photo avant de la partager avec un confrère (décision du
// fondateur : le médecin floute lui-même ; l'envoi reste bloqué tant qu'il n'a
// pas confirmé qu'aucun visage n'est visible sans flou). On passe le doigt ou
// la souris sur la zone à masquer ; « Tout flouter » masque la photo entière.
// ════════════════════════════════════════════════════════════════════════

const MAX = 1280;

export function PhotoBlurEditor({ src, onChange }: { src: string; onChange: (dataUrl: string) => void }) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const blurred = useRef<HTMLCanvasElement | null>(null);
  const original = useRef<HTMLImageElement | null>(null);
  const drawing = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [brush, setBrush] = useState(48);

  const paintOriginal = () => {
    const c = canvas.current, img = original.current;
    if (!c || !img) return;
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  };
  const emit = () => { try { if (canvas.current) onChange(canvas.current.toDataURL("image/jpeg", 0.85)); } catch { setError(true); } };

  useEffect(() => {
    setReady(false); setError(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = canvas.current!;
      c.width = w; c.height = h;
      const b = document.createElement("canvas");
      b.width = w; b.height = h;
      const bx = b.getContext("2d")!;
      bx.filter = `blur(${Math.max(12, Math.round(w / 40))}px)`;
      bx.drawImage(img, 0, 0, w, h);
      blurred.current = b;
      original.current = img;
      paintOriginal();
      setReady(true);
      emit();
    };
    img.onerror = () => setError(true);
    img.src = src;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const dab = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current, b = blurred.current;
    if (!c || !b) return;
    const r = c.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * c.width;
    const y = ((e.clientY - r.top) / r.height) * c.height;
    const rad = (brush / r.width) * c.width;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(b, 0, 0);
    ctx.restore();
  };

  if (error) return <div className="rounded-2xl bg-organic-accent-100 p-3 text-[13px] text-organic-accent-900">Photo impossible à modifier. Ajoutez-la depuis votre appareil.</div>;

  return (
    <div className="flex flex-col gap-2">
      <canvas ref={canvas} className="w-full touch-none rounded-2xl bg-organic-neutral-200" style={{ cursor: "crosshair", aspectRatio: ready ? undefined : "4 / 3" }}
        onPointerDown={(e) => { drawing.current = true; (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); dab(e); }}
        onPointerMove={(e) => { if (drawing.current) dab(e); }}
        onPointerUp={() => { drawing.current = false; emit(); }}
        onPointerLeave={() => { if (drawing.current) { drawing.current = false; emit(); } }} />
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-organic-neutral-700">Pinceau</span>
        {[24, 48, 80].map((b) => (
          <button key={b} type="button" onClick={() => setBrush(b)}
            className={`cursor-pointer rounded-pill border px-3 py-1 font-body text-[12px] font-semibold ${brush === b ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent"}`}>
            {b === 24 ? "Fin" : b === 48 ? "Moyen" : "Large"}
          </button>
        ))}
        <button type="button" onClick={() => { const c = canvas.current, b = blurred.current; if (c && b) { c.getContext("2d")!.drawImage(b, 0, 0); emit(); } }}
          className="cursor-pointer rounded-pill border border-organic-divider bg-transparent px-3 py-1 font-body text-[12px] font-semibold">Tout flouter</button>
        <button type="button" onClick={() => { paintOriginal(); emit(); }}
          className="cursor-pointer rounded-pill border-0 bg-transparent px-2 py-1 font-body text-[12px] font-bold text-organic-accent-700">Annuler le flou</button>
      </div>
    </div>
  );
}
