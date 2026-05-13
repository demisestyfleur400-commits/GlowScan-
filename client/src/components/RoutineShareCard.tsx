import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, MessageCircle } from "lucide-react";
import { formatPrice, getBrandByWhatsapp } from "@shared/catalog";

interface RoutineProduct {
  name: string;
  price?: number;
  whatsapp?: string;
  brand?: string;
  role: { emoji: string; label: string };
  index: number;
}

interface RoutineShareCardProps {
  score: number;
  condition: string;
  area: string;
  products: RoutineProduct[];
  userName?: string;
  onClose: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function drawRoutineCard(
  canvas: HTMLCanvasElement,
  score: number,
  condition: string,
  area: string,
  products: RoutineProduct[],
  userName: string
) {
  const W = 540;
  const H = 960;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0f0f1a");
  grad.addColorStop(0.5, "#0a1628");
  grad.addColorStop(1, "#0f0f1a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Purple glow top
  const glowTop = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 320);
  glowTop.addColorStop(0, "rgba(139,92,246,0.22)");
  glowTop.addColorStop(1, "transparent");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, 320);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // === LOGO ===
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textAlign = "center";
  ctx.fillText("✨ GlowScan", W / 2, 56);

  // === TITLE ===
  ctx.font = "bold 34px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText("Ma Routine Personnalisée", W / 2, 120);

  // Subtitle
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(`${userName} · ${area === "face" ? "Visage" : area === "body" ? "Corps" : "Cheveux"}`, W / 2, 156);

  // === SCORE ===
  const cx = W / 2, cy = 260;
  const r = 80;
  const scoreColor = getScoreColor(score);

  ctx.beginPath();
  ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * score / 100));
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.font = "bold 56px sans-serif";
  ctx.fillStyle = scoreColor;
  ctx.textAlign = "center";
  ctx.fillText(String(score), cx, cy + 18);

  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Glow Score", cx, cy + 46);

  // Condition badge
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "center";
  ctx.fillText(condition, W / 2, 370);

  // === PRODUCTS ===
  const panelY = 410;
  const panelH = 420;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.beginPath();
  ctx.roundRect(40, panelY, W - 80, panelH, 24);
  ctx.fill();

  ctx.strokeStyle = "rgba(139,92,246,0.3)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "rgba(139,92,246,0.9)";
  ctx.textAlign = "center";
  ctx.fillText("ROUTINE RECOMMANDÉE", W / 2, panelY + 34);

  products.forEach((p, idx) => {
    const py = panelY + 70 + idx * 112;

    // Product card background
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.roundRect(60, py, W - 120, 96, 16);
    ctx.fill();

    // Numbered circle
    ctx.beginPath();
    ctx.arc(92, py + 48, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(139,92,246,0.3)";
    ctx.fill();
    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = "#a78bfa";
    ctx.textAlign = "center";
    ctx.fillText(String(p.index), 92, py + 55);

    // Role
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.textAlign = "left";
    ctx.fillText(`${p.role.emoji} ${p.role.label.toUpperCase()}`, 122, py + 32);

    // Name
    ctx.font = "bold 17px sans-serif";
    ctx.fillStyle = "#ffffff";
    const name = p.name.length > 30 ? p.name.substring(0, 28) + "…" : p.name;
    ctx.fillText(name, 122, py + 56);

    // Price + Brand
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    const brandName = p.brand || (p.whatsapp ? getBrandByWhatsapp(p.whatsapp) : "");
    const priceText = p.price ? formatPrice(p.price) : "Prix sur demande";
    ctx.fillText(`${priceText} · ${brandName}`, 122, py + 78);
  });

  // === FOOTER ===
  const footY = panelY + panelH + 36;
  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.textAlign = "center";
  ctx.fillText("Analyse ta peau sur", W / 2, footY);

  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "rgba(139,92,246,0.9)";
  ctx.fillText("glow-scan.com", W / 2, footY + 28);

  // Bottom glow
  const glowBot = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 200);
  glowBot.addColorStop(0, "rgba(139,92,246,0.15)");
  glowBot.addColorStop(1, "transparent");
  ctx.fillStyle = glowBot;
  ctx.fillRect(0, H - 200, W, 200);
}

export function RoutineShareCard({ score, condition, area, products, userName = "GlowScan User", onClose }: RoutineShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawRoutineCard(canvasRef.current, score, condition, area, products, userName);
    }
  }, [score, condition, area, products, userName]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `glowscan-routine-${score}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function handleWhatsApp() {
    if (!canvasRef.current) return;
    const productList = products.map(p => `${p.role.emoji} ${p.name}${p.price ? ` (${formatPrice(p.price)})` : ""}`).join("\n");
    const total = products.reduce((sum, p) => sum + (p.price || 0), 0);
    const text = `🌟 Ma Routine GlowScan (Score ${score}/100)\n\n${condition}\n\n${productList}\n\n${total > 0 ? `💰 Total : ${formatPrice(total)}` : ""}\n\nAnalyse ta peau sur glow-scan.com`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="bg-white rounded-3xl overflow-hidden w-full max-w-xs shadow-2xl"
          data-testid="routine-share-card-modal"
        >
          <div className="p-3 pb-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Carte Ma Routine</p>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
                data-testid="button-close-routine-card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full rounded-2xl"
              style={{ aspectRatio: "540/960", display: "block" }}
            />
          </div>

          <div className="p-4 grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-sm font-bold rounded-2xl active:scale-[0.97] transition-all"
              data-testid="button-download-routine-card"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </button>
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white text-sm font-bold rounded-2xl active:scale-[0.97] transition-all"
              data-testid="button-share-routine-whatsapp"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              WhatsApp
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
