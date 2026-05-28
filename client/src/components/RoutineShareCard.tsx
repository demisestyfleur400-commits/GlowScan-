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
  if (score >= 70) return "#6ee7b7";
  if (score >= 50) return "#fbbf24";
  return "#f9a8d4";
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

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0d0a0e");
  grad.addColorStop(0.5, "#13101f");
  grad.addColorStop(1, "#0d0a0e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Violet glow top
  const glowTop = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 320);
  glowTop.addColorStop(0, "rgba(124,58,237,0.22)");
  glowTop.addColorStop(1, "transparent");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, 320);

  // Subtle grid
  ctx.strokeStyle = "rgba(255,255,255,0.02)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // === LOGO ===
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "#a78bfa";
  ctx.textAlign = "center";
  ctx.fillText("GlowScan", W / 2, 56);

  // === TITLE ===
  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = "#f3f0ff";
  ctx.textAlign = "center";
  ctx.fillText("Ma Routine Personnalisée", W / 2, 118);

  // Subtitle
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "rgba(200,185,255,0.65)";
  ctx.fillText(`${userName} · ${area === "face" ? "Visage" : area === "body" ? "Corps" : "Cheveux"}`, W / 2, 154);

  // === SCORE ===
  const cx = W / 2, cy = 256;
  const r = 80;
  const scoreColor = getScoreColor(score);

  ctx.beginPath();
  ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(167,139,250,0.06)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
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
  ctx.fillStyle = "rgba(200,185,255,0.65)";
  ctx.fillText("Glow Score", cx, cy + 46);

  // Condition badge
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "rgba(200,185,255,0.75)";
  ctx.textAlign = "center";
  ctx.fillText(condition, W / 2, 368);

  // === PRODUCTS PANEL ===
  const panelY = 406;
  const panelH = 420;
  ctx.fillStyle = "rgba(167,139,250,0.06)";
  ctx.beginPath();
  ctx.roundRect(40, panelY, W - 80, panelH, 24);
  ctx.fill();

  ctx.strokeStyle = "rgba(167,139,250,0.18)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#a78bfa";
  ctx.textAlign = "center";
  ctx.fillText("Routine recommandée", W / 2, panelY + 34);

  products.forEach((p, idx) => {
    const py = panelY + 68 + idx * 112;

    // Product card background
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.roundRect(60, py, W - 120, 96, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Numbered circle
    ctx.beginPath();
    ctx.arc(92, py + 48, 20, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(124,58,237,0.25)";
    ctx.fill();
    ctx.font = "bold 17px sans-serif";
    ctx.fillStyle = "#c4b5fd";
    ctx.textAlign = "center";
    ctx.fillText(String(p.index), 92, py + 55);

    // Role
    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "rgba(200,185,255,0.65)";
    ctx.textAlign = "left";
    ctx.fillText(`${p.role.emoji} ${p.role.label}`, 122, py + 32);

    // Name
    ctx.font = "bold 16px sans-serif";
    ctx.fillStyle = "#f3f0ff";
    const name = p.name.length > 30 ? p.name.substring(0, 28) + "…" : p.name;
    ctx.fillText(name, 122, py + 56);

    // Price + Brand
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "rgba(200,185,255,0.65)";
    const brandName = p.brand || (p.whatsapp ? getBrandByWhatsapp(p.whatsapp) : "");
    const priceText = p.price ? formatPrice(p.price) : "Prix sur demande";
    ctx.fillText(`${priceText} · ${brandName}`, 122, py + 78);
  });

  // === FOOTER ===
  const footY = panelY + panelH + 34;
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "rgba(200,185,255,0.65)";
  ctx.textAlign = "center";
  ctx.fillText("Analyse ta peau sur", W / 2, footY);

  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = "#a78bfa";
  ctx.fillText("glow-scan.com", W / 2, footY + 28);

  // Bottom glow
  const glowBot = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 200);
  glowBot.addColorStop(0, "rgba(124,58,237,0.15)");
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
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(13,10,14,0.85)",
          backdropFilter: "blur(12px)",
          padding: 16,
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          data-testid="routine-share-card-modal"
          style={{
            background: "#13101f",
            borderRadius: 28,
            overflow: "hidden",
            width: "100%",
            maxWidth: 320,
            border: "1px solid rgba(167,139,250,0.18)",
          }}
        >
          <div style={{ padding: "12px 12px 0" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              padding: "0 4px",
            }}>
              <p style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(200,185,255,0.65)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              }}>
                Carte Ma Routine
              </p>
              <button
                onClick={onClose}
                data-testid="button-close-routine-card"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={14} color="rgba(200,185,255,0.65)" strokeWidth={1.5} />
              </button>
            </div>
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                borderRadius: 16,
                display: "block",
                aspectRatio: "540/960",
                border: "1px solid rgba(167,139,250,0.12)",
              }}
            />
          </div>

          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={handleDownload}
              data-testid="button-download-routine-card"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 0",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 9999,
                color: "#f3f0ff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              }}
            >
              <Download size={15} strokeWidth={1.5} />
              Télécharger
            </button>
            <button
              onClick={handleWhatsApp}
              data-testid="button-share-routine-whatsapp"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 0",
                background: "#25D366",
                border: "none",
                borderRadius: 9999,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              }}
            >
              <MessageCircle size={15} strokeWidth={1.5} />
              WhatsApp
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
