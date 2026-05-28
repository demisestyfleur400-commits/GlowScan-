import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, MessageCircle } from "lucide-react";

interface ShareCardProps {
  score: number;
  condition: string;
  area: string;
  userName?: string;
  appUrl?: string;
  onClose: () => void;
}

const AREA_LABELS: Record<string, string> = {
  face: "Visage",
  body: "Corps",
  hair: "Cheveux",
};

function getScoreColor(score: number): string {
  if (score >= 70) return "#6ee7b7";
  if (score >= 50) return "#fbbf24";
  return "#f9a8d4";
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Excellente santé";
  if (score >= 60) return "Bonne santé";
  if (score >= 45) return "À améliorer";
  return "Soin urgent";
}

function drawCard(
  canvas: HTMLCanvasElement,
  score: number,
  condition: string,
  area: string,
  userName: string,
  appUrl: string
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

  // Violet glow bottom
  const glowBot = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 260);
  glowBot.addColorStop(0, "rgba(167,139,250,0.12)");
  glowBot.addColorStop(1, "transparent");
  ctx.fillStyle = glowBot;
  ctx.fillRect(0, H - 260, W, 260);

  // Side accent lines
  ctx.strokeStyle = "rgba(167,139,250,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - 40, 0); ctx.lineTo(W - 40, H); ctx.stroke();

  // GLOW SCAN logo
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#a78bfa";
  ctx.fillText("Glow", W / 2, 90);
  ctx.fillStyle = "#f3f0ff";
  ctx.fillText("Scan", W / 2, 132);

  // Separator
  ctx.strokeStyle = "rgba(167,139,250,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, 150);
  ctx.lineTo(W / 2 + 60, 150);
  ctx.stroke();

  // "Mon Glow Score" label
  ctx.fillStyle = "rgba(200,185,255,0.65)";
  ctx.font = "13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Mon Glow Score", W / 2, 178);

  // Score circle
  const cx = W / 2;
  const cy = 360;
  const radius = 130;
  const scoreColor = getScoreColor(score);

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(167,139,250,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, Math.PI * 2 - Math.PI / 2);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();

  // Score arc
  const scoreAngle = (score / 100) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, scoreAngle - Math.PI / 2);
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();

  // Score dot glow
  const dotX = cx + radius * Math.cos(scoreAngle - Math.PI / 2);
  const dotY = cy + radius * Math.sin(scoreAngle - Math.PI / 2);
  const dotGlow = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 18);
  dotGlow.addColorStop(0, scoreColor);
  dotGlow.addColorStop(1, "transparent");
  ctx.fillStyle = dotGlow;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Score number
  ctx.fillStyle = "#f3f0ff";
  ctx.font = "bold 88px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), cx, cy + 28);

  // /100
  ctx.fillStyle = "rgba(200,185,255,0.5)";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("/100", cx, cy + 60);

  // Score label badge
  const labelText = getScoreLabel(score);
  ctx.font = "bold 14px Arial, sans-serif";
  const labelW = ctx.measureText(labelText).width + 32;
  const labelX = cx - labelW / 2;
  ctx.fillStyle = scoreColor + "22";
  ctx.beginPath();
  ctx.roundRect(labelX, cy + 78, labelW, 30, 15);
  ctx.fill();
  ctx.strokeStyle = scoreColor + "66";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = scoreColor;
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText(labelText, cx, cy + 98);

  // Area badge
  const areaLabel = AREA_LABELS[area] || area;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  const areaW = 100;
  ctx.beginPath();
  ctx.roundRect(cx - areaW / 2, cy + 118, areaW, 24, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(200,185,255,0.65)";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText("📍 " + areaLabel, cx, cy + 135);

  // Divider
  ctx.strokeStyle = "rgba(167,139,250,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 570); ctx.lineTo(W - 80, 570); ctx.stroke();

  // Diagnostic section
  ctx.fillStyle = "rgba(200,185,255,0.65)";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillText("Diagnostic", cx, 600);
  ctx.fillStyle = "#f3f0ff";
  ctx.font = "bold 18px Arial, sans-serif";
  const condShort = condition.length > 32 ? condition.substring(0, 30) + "…" : condition;
  ctx.fillText(condShort, cx, 628);

  // Divider
  ctx.strokeStyle = "rgba(167,139,250,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 648); ctx.lineTo(W - 80, 648); ctx.stroke();

  // Challenge text
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("Compare avec moi 👇", cx, 690);
  ctx.fillStyle = "rgba(200,185,255,0.65)";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText("Fais ton analyse gratuite sur", cx, 718);

  // URL box
  ctx.fillStyle = "rgba(167,139,250,0.1)";
  ctx.beginPath();
  ctx.roundRect(cx - 130, 730, 260, 36, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(167,139,250,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 15px Arial, sans-serif";
  const shortUrl = appUrl.replace(/^https?:\/\//, "");
  ctx.fillText(shortUrl, cx, 754);

  // User name
  if (userName && userName !== "Toi") {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("Analyse de " + userName, cx, 800);
  }

  // Corner dots
  const dotPositions = [
    [55, 55], [W - 55, 55], [55, H - 55], [W - 55, H - 55],
  ];
  dotPositions.forEach(([x, y]) => {
    ctx.fillStyle = "rgba(167,139,250,0.4)";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function ShareCard({ score, condition, area, userName = "Toi", appUrl, onClose }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = appUrl || window.location.origin;

  useEffect(() => {
    if (canvasRef.current) {
      drawCard(canvasRef.current, score, condition, area, userName, url);
    }
  }, [score, condition, area, userName, url]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `glow-scan-${score}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🌟 Mon Glow Score est de ${score}/100 !\nDiagnostic : ${condition}\nFais ton analyse gratuite 👉 ${url}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(13,10,14,0.85)",
          backdropFilter: "blur(12px)",
          padding: 16,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            maxWidth: 320,
            width: "100%",
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            data-testid="button-close-sharecard"
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              zIndex: 10,
              width: 32,
              height: 32,
              borderRadius: 9999,
              background: "rgba(167,139,250,0.12)",
              border: "1px solid rgba(167,139,250,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={14} color="#c4b5fd" strokeWidth={1.5} />
          </button>

          {/* Canvas card */}
          <canvas
            ref={canvasRef}
            style={{
              borderRadius: 24,
              width: "100%",
              maxHeight: "55vh",
              objectFit: "contain",
              border: "1px solid rgba(167,139,250,0.18)",
            }}
          />

          {/* Hint */}
          <p style={{
            fontSize: 12,
            color: "rgba(200,185,255,0.65)",
            textAlign: "center",
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
          }}>
            Fais une capture d'écran ou télécharge ta carte
          </p>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <button
              onClick={handleDownload}
              data-testid="button-download-sharecard"
              style={{
                flex: 1,
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
              data-testid="button-whatsapp-sharecard"
              style={{
                flex: 1,
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
